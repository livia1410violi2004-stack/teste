"""LumiNova API starter. SQLite for local testing; use PostgreSQL in deployment."""
from __future__ import annotations
import os, re, time, secrets, logging
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from sqlalchemy import create_engine, String, DateTime, ForeignKey, Text, select, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("luminova")

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'luminova.db'}")
JWT_SECRET = os.getenv("JWT_SECRET", "")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_NAME = "luminova_session"
if len(JWT_SECRET) < 32:
    # Convenient local-only fallback. Production must set a random secret in environment.
    JWT_SECRET = os.getenv("JWT_SECRET", "LOCAL-ONLY-CHANGE-ME-" + secrets.token_urlsafe(48))

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
class Base(DeclarativeBase): pass
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    nickname: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
class Community(Base):
    __tablename__ = "communities"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(240), default="")
    theme: Mapped[str] = mapped_column(String(20), default="purple")
    privacy: Mapped[str] = mapped_column(String(10), default="public")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
Base.metadata.create_all(engine)

app = FastAPI(title="LumiNova API", version="0.1.0", docs_url="/api/docs" if os.getenv("ENABLE_API_DOCS", "true").lower()=="true" else None)
allowed = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://127.0.0.1:8000,http://localhost:8000").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed, allow_credentials=True, allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"], allow_headers=["Content-Type","Authorization","X-CSRF-Token"])
trusted = [x.strip() for x in os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if x.strip()]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted)
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api/") else "no-cache"
    if request.url.scheme == "https": response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)
limiter: dict[str, deque] = defaultdict(deque)
def rate_limit(request: Request, bucket: str, maximum: int = 8, seconds: int = 60):
    # Lightweight local-dev guard; use a shared Redis limiter behind a trusted proxy in production.
    ip = request.client.host if request.client else "unknown"
    key = f"{bucket}:{ip}"; now = time.monotonic(); q = limiter[key]
    while q and now - q[0] > seconds: q.popleft()
    if len(q) >= maximum: raise HTTPException(429, "Muitas tentativas. Aguarde um minuto e tente novamente.")
    q.append(now)
def db_session():
    db = SessionLocal()
    try: yield db
    finally: db.close()
class Signup(BaseModel):
    name: str = Field(min_length=2, max_length=80, strip_whitespace=True)
    nickname: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
class Login(BaseModel):
    login: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)
class ProfilePatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    bio: Optional[str] = Field(default=None, max_length=300)
class CommunityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=60, strip_whitespace=True)
    description: str = Field(default="", max_length=240)
    theme: str = Field(default="purple", pattern=r"^(purple|blue|rose|green)$")
    privacy: str = Field(default="public", pattern=r"^(public|private)$")
def issue_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user.id), "iat": now, "exp": now + timedelta(hours=8), "iss":"luminova-api"}, JWT_SECRET, algorithm="HS256")
def set_session(response: Response, token: str):
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=COOKIE_SECURE, samesite="strict", max_age=8*60*60, path="/")
def user_out(user: User): return {"id": user.id, "name": user.name, "nickname": user.nickname, "email": user.email, "created_at": user.created_at}
def current_user(request: Request, db: Session = Depends(db_session), credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False))) -> User:
    token = request.cookies.get(COOKIE_NAME) or (credentials.credentials if credentials else None)
    if not token: raise HTTPException(401, "Faça login para continuar.")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], issuer="luminova-api", options={"require":["sub","exp","iat","iss"]})
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, ValueError, KeyError): user = None
    if not user: raise HTTPException(401, "Sessão inválida ou expirada.")
    return user

@app.get("/api/health")
def health(): return {"status":"ok", "service":"luminova-api"}
@app.post("/api/auth/signup", status_code=201)
def signup(data: Signup, request: Request, response: Response, db: Session = Depends(db_session)):
    rate_limit(request, "signup", 5)
    email = str(data.email).lower().strip(); nick = data.nickname.lower().strip()
    if db.scalar(select(User).where(or_(User.email == email, User.nickname == nick))): raise HTTPException(409, "E-mail ou apelido já cadastrado.")
    if len(data.password) < 10 or not re.search(r"[A-Za-z]", data.password) or not re.search(r"\d", data.password): raise HTTPException(422, "Use uma senha com pelo menos 10 caracteres, incluindo letras e números.")
    user = User(name=data.name.strip(), nickname=nick, email=email, password_hash=ph.hash(data.password))
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        # Unique constraints can still be hit if two signups happen at the same time.
        raise HTTPException(status_code=409, detail="Este e-mail ou apelido já está cadastrado. Tente entrar ou use outros dados.")
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Falha de banco de dados ao criar conta")
        raise HTTPException(status_code=500, detail="Erro interno ao salvar a conta. Confira o terminal do backend para ver o motivo.")
    set_session(response, issue_token(user))
    return {"user": user_out(user)}
@app.post("/api/auth/login")
def login(data: Login, request: Request, response: Response, db: Session = Depends(db_session)):
    rate_limit(request, "login", 8)
    identity = data.login.strip().lower()
    user = db.scalar(select(User).where(or_(User.email == identity, User.nickname == identity)))
    try: valid = bool(user and ph.verify(user.password_hash, data.password))
    except (VerifyMismatchError, InvalidHashError): valid = False
    if not valid: raise HTTPException(401, "E-mail/apelido ou senha incorretos.")
    if user and ph.check_needs_rehash(user.password_hash): user.password_hash = ph.hash(data.password); db.commit()
    set_session(response, issue_token(user)); return {"user":user_out(user)}
@app.post("/api/auth/logout", status_code=204)
def logout(response: Response): response.delete_cookie(COOKIE_NAME, path="/", httponly=True, secure=COOKIE_SECURE, samesite="strict"); return response
@app.get("/api/auth/me")
def me(user: User = Depends(current_user)): return {"user":user_out(user)}
@app.get("/api/profile")
def profile(user: User = Depends(current_user)): return {"profile": {**user_out(user), "bio":""}}
@app.patch("/api/profile")
def update_profile(data: ProfilePatch, user: User = Depends(current_user), db: Session = Depends(db_session)):
    if data.name is not None: user.name = data.name.strip()
    db.commit(); db.refresh(user)
    return {"profile": {**user_out(user), "bio": data.bio or ""}}
@app.get("/api/communities")
def list_communities(db: Session = Depends(db_session), user: User = Depends(current_user)):
    rows = db.scalars(select(Community).where(Community.privacy == "public").order_by(Community.created_at.desc()).limit(100)).all()
    return {"items":[{"id":c.id,"name":c.name,"description":c.description,"theme":c.theme,"owner_id":c.owner_id,"created_at":c.created_at} for c in rows]}
@app.post("/api/communities", status_code=201)
def create_community(data: CommunityCreate, user: User = Depends(current_user), db: Session = Depends(db_session)):
    c=Community(owner_id=user.id,name=data.name.strip(),description=data.description.strip(),theme=data.theme,privacy=data.privacy)
    db.add(c); db.commit(); db.refresh(c)
    return {"item":{"id":c.id,"name":c.name,"description":c.description,"theme":c.theme,"privacy":c.privacy,"owner_id":c.owner_id,"created_at":c.created_at}}

# Serve the existing static interface on the same origin for local testing.
app.mount("/", StaticFiles(directory=str(BASE_DIR.parent), html=True), name="frontend")
