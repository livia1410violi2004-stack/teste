# LUMINOVA — versão de testes vazia

Esta pasta contém a interface HTML/CSS/JavaScript e o backend Python (FastAPI). Não há perfis, publicações, comunidades, mentores ou conquistas fictícias.

## Iniciar no Windows

1. Instale Python 3.11 ou superior.
2. Abra o PowerShell nesta pasta e execute:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:JWT_SECRET = (py -c "import secrets; print(secrets.token_urlsafe(48))")
$env:COOKIE_SECURE = "false"
$env:CORS_ORIGINS = "http://127.0.0.1:8000,http://localhost:8000"
$env:TRUSTED_HOSTS = "localhost,127.0.0.1"
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

3. Abra http://127.0.0.1:8000 no navegador. Não abra os HTML por duplo clique: o cadastro/login precisam da API.
4. Para verificar a API, abra http://127.0.0.1:8000/api/health.

## Observações
- O banco SQLite é criado automaticamente e começa vazio.
- Cadastro, login e sessões usam a API Python; senhas são armazenadas com hash Argon2id.
- Feed, chat, preferências do quiz e algumas ações da interface ainda são protótipos locais e não são sincronizados entre usuários. Não use dados sensíveis reais.
- Esta é uma versão de desenvolvimento local, não pronta para publicação pública. Antes de produção, revisar autenticação/autorização de todas as páginas e ações, CSRF, rate limiting distribuído, HTTPS, backups, migrações e testes automatizados.


## Se aparecer erro ao criar conta

- Confirme que abriu `http://127.0.0.1:8000` e que o terminal mostra o Uvicorn rodando. Não abra `index.html` diretamente pelo Explorador.
- Use um e-mail ainda não cadastrado, um apelido de 3 a 30 caracteres (letras, números, ponto, hífen ou sublinhado) e uma senha com no mínimo 10 caracteres, incluindo letras e números.
- Se aparecer que e-mail/apelido já existe, entre com essa conta ou escolha outros dados.
- Se aparecer erro interno, leia a mensagem completa no terminal onde o Uvicorn está rodando. Não compartilhe senhas nem tokens.
- Para recomeçar os testes do zero, pare o servidor e apague `backend/luminova.db` (isso apaga todas as contas de teste); depois inicie o servidor novamente.
