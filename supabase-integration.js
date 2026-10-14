import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.LUMINOVA_SUPABASE_CONFIG || {};
const configured = cfg.url && cfg.anonKey && cfg.url.startsWith('https://') && !cfg.url.includes('COLE_AQUI') && !cfg.anonKey.includes('COLE_AQUI');
const $ = (s, root=document) => root.querySelector(s);
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let supabase = null;
let currentUser = null;
let currentProfile = null;

function notice(message, error=false) {
  let el = $('#supabaseNotice');
  if (!el) {
    el = document.createElement('div'); el.id = 'supabaseNotice';
    el.style.cssText = 'position:fixed;z-index:99999;bottom:20px;left:50%;transform:translateX(-50%);max-width:min(92vw,620px);padding:13px 18px;border:1px solid #7776;border-radius:12px;background:#101321;color:#fff;box-shadow:0 8px 35px #0008;font:14px/1.5 Inter,Arial,sans-serif';
    document.body.append(el);
  }
  el.style.borderColor = error ? '#ff7b91' : '#9bd6bb'; el.textContent = message; el.hidden = false;
  clearTimeout(el._hideTimer); el._hideTimer = setTimeout(() => { el.hidden = true; }, 6500);
}
function friendlyError(error) {
  const msg = error?.message || 'Ocorreu um erro inesperado.';
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
  if (/User already registered/i.test(msg)) return 'Este e-mail já possui uma conta. Tente entrar.';
  return msg;
}
function requireConfig() {
  if (configured && supabase) return true;
  notice('Configure a URL e a chave pública no arquivo supabase-config.js antes de usar o Supabase.', true);
  return false;
}
async function getProfile(user=currentUser) {
  if (!user || !supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const meta = user.user_metadata || {};
  const username = String(meta.username || user.email?.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,30);
  const { data: created, error: insertError } = await supabase.from('profiles').insert({id:user.id, username: username.length >= 3 ? username : null, display_name: meta.display_name || meta.name || 'Novo usuário'}).select().single();
  if (insertError) throw insertError;
  return created;
}
function setProfileUI(profile, user=currentUser) {
  if (!profile) return;
  const name = profile.display_name || user?.email?.split('@')[0] || 'Usuário';
  const handle = profile.username ? '@'+profile.username : '';
  ['sideName','displayName'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent=name; });
  const h=$('#displayHandle'); if(h && handle) h.textContent=handle;
  const bio=$('#displayBio'); if(bio) bio.textContent=profile.bio || 'Compartilhe um pouco sobre você.';
  const n=$('#nameInput'); if(n && !n.value) n.value=name;
  const hi=$('#handleInput'); if(hi && !hi.value && profile.username) hi.value=profile.username;
  const bi=$('#bioInput'); if(bi && !bi.value) bi.value=profile.bio || '';
  const sideAvatar=$('#sideAvatar'); if(sideAvatar && profile.avatar_url) sideAvatar.src=profile.avatar_url;
}
function addLogoutLink() {
  const sidebar = $('.sidebar-bottom');
  if (!sidebar || $('#supabaseLogout')) return;
  const a=document.createElement('button'); a.id='supabaseLogout'; a.type='button'; a.className='settings-link'; a.textContent='↪ Sair da conta'; a.style.cssText='width:100%;margin-top:8px;text-align:left;background:transparent;border:0;cursor:pointer;color:inherit';
  a.addEventListener('click', async()=>{ if(!requireConfig())return; const {error}=await supabase.auth.signOut(); if(error) notice(friendlyError(error),true); else location.href='index.html'; }); sidebar.append(a);
}
async function loadFeed() {
  const feed=$('#generalFeed');
  const profilePosts=$('#postsList');
  if(!feed && !profilePosts) return;
  if(!requireConfig()) return;
  const {data:posts,error}=await supabase.from('v_feed_posts').select('*').order('created_at',{ascending:false}).limit(50);
  if(error){notice('Não foi possível carregar as publicações: '+friendlyError(error),true);return;}
  const html=(posts||[]).map(p=>{
    const name=p.display_name || 'Usuário'; const username=p.username ? '@'+p.username : '@usuario';
    const time=new Date(p.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
    return `<article class="ln-post" data-post="${esc(p.post_id)}"><div class="ln-post-head"><div class="ln-avatar">${esc(name.trim().slice(0,2).toUpperCase())}</div><div><div class="ln-author">${esc(name)} <span class="ln-muted" style="font-weight:400">${esc(time)}</span></div><div class="ln-handle">${esc(username)}</div></div></div><p>${esc(p.content).replace(/\n/g,'<br>')}</p><div class="ln-post-actions"><button class="ln-action" type="button" data-comment="${esc(p.post_id)}">◷ ${Number(p.comment_count||0)} comentários</button><button class="ln-action" type="button" data-share="${esc(p.post_id)}">↗ Compartilhar</button></div></article>`;
  }).join('');
  if(feed) feed.innerHTML=html || '<div class="ln-empty">Ainda não há publicações. Seja a primeira pessoa a compartilhar uma ideia.</div>';
  if(profilePosts) profilePosts.innerHTML=html || '<p class="ln-muted">Você ainda não tem publicações.</p>';
  document.querySelectorAll('[data-comment]').forEach(b=>b.addEventListener('click',()=>addComment(b.dataset.comment)));
  document.querySelectorAll('[data-share]').forEach(b=>b.addEventListener('click',async()=>{const p=(posts||[]).find(x=>x.post_id===b.dataset.share);if(!p)return;const text=`${p.display_name}: ${p.content}`;try{await navigator.clipboard.writeText(text);notice('Publicação copiada!')}catch{prompt('Copie a publicação:',text)}}));
}
async function addComment(postId) {
  if(!currentUser){notice('Entre na sua conta para comentar.',true);return;}
  const content=prompt('Escreva seu comentário:'); if(!content?.trim())return;
  const {error}=await supabase.from('comments').insert({post_id:postId,author_id:currentUser.id,content:content.trim()});
  if(error){notice('Não foi possível publicar o comentário: '+friendlyError(error),true);return;}
  notice('Comentário publicado!'); await loadFeed();
}
async function createPost(form) {
  if(!currentUser){notice('Entre na sua conta para publicar.',true);return;}
  const text=$('#generalText',form)?.value.trim() || $('textarea',form)?.value.trim();
  if(!text)return;
  const {error}=await supabase.from('posts').insert({author_id:currentUser.id,content:text,post_type:'text',visibility:'public'});
  if(error){notice('Não foi possível publicar: '+friendlyError(error),true);return;}
  form.reset(); notice('Publicação enviada para o feed!'); await loadFeed();
}
async function saveProfile(form) {
  if(!currentUser){notice('Entre na sua conta para editar seu perfil.',true);return;}
  const displayName=$('#nameInput')?.value.trim() || currentProfile?.display_name || 'Novo usuário';
  const rawUsername=$('#handleInput')?.value.trim().replace(/^@/,'').toLowerCase();
  const username=rawUsername || null;
  if(username && !/^[a-zA-Z0-9_.-]{3,30}$/.test(username)){notice('O apelido deve ter 3–30 caracteres: letras, números, ponto, hífen ou sublinhado.',true);return;}
  const payload={display_name:displayName,username,bio:$('#bioInput')?.value.trim()||'',updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('profiles').update(payload).eq('id',currentUser.id).select().single();
  if(error){notice('Não foi possível salvar o perfil: '+friendlyError(error),true);return;}
  currentProfile=data; setProfileUI(data); notice('Perfil salvo no Supabase!');
}
async function authSubmit(form) {
  if(!requireConfig())return;
  const id=form.id;
  if(id==='loginForm'){
    const identity=$('#user')?.value.trim(); const password=$('#pass')?.value;
    if(!identity||!password){notice('Preencha e-mail e senha.',true);return;}
    if(identity.includes('@')){
      const {error}=await supabase.auth.signInWithPassword({email:identity,password});
      if(error){notice(friendlyError(error),true);return;}
    } else {notice('Para entrar, use o e-mail cadastrado (o login por apelido ainda não está habilitado).',true);return;}
    location.href='perfil.html';
  } else {
    const name=$('#n1')?.value.trim(); const username=$('#n2')?.value.trim().replace(/^@/,'').toLowerCase(); const email=$('#n3')?.value.trim(); const password=$('#n4')?.value;
    if(!name||!username||!email||!password){notice('Preencha todos os campos.',true);return;}
    if(!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)){notice('O apelido deve ter de 3 a 30 caracteres (letras, números, ponto, hífen ou sublinhado).',true);return;}
    if(password.length<6){notice('A senha precisa ter pelo menos 6 caracteres.',true);return;}
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name,username},emailRedirectTo:location.origin+'/perfil.html'}});
    if(error){notice(friendlyError(error),true);return;}
    if(data.session) location.href='perfil.html';
    else notice('Cadastro criado! Verifique seu e-mail para confirmar a conta e depois entre.');
  }
}

if(configured) supabase=createClient(cfg.url,cfg.anonKey);
else console.warn('[LumiNova] Configure supabase-config.js para ativar o backend.');

// Captura antes dos scripts antigos de demonstração para que eles não redirecionem nem salvem localmente.
document.addEventListener('submit', event=>{
  const form=event.target;
  if(!['loginForm','signupForm','generalCompose','postForm','profileForm'].includes(form?.id)) return;
  event.preventDefault(); event.stopImmediatePropagation();
  (async()=>{
    if(form.id==='loginForm'||form.id==='signupForm') await authSubmit(form);
    else if(form.id==='generalCompose'||form.id==='postForm') await createPost(form);
    else await saveProfile(form);
  })().catch(e=>notice(friendlyError(e),true));
},true);

document.addEventListener('DOMContentLoaded',async()=>{
  if(!configured){ if(location.pathname!=='/' && !location.pathname.endsWith('index.html')) notice('Configure supabase-config.js para conectar este site ao Supabase.',true); return; }
  const {data:{session},error}=await supabase.auth.getSession();
  if(error){notice(friendlyError(error),true);return;}
  currentUser=session?.user||null;
  if(currentUser){
    try{currentProfile=await getProfile();setProfileUI(currentProfile);addLogoutLink();}catch(e){notice('Sessão ativa, mas não foi possível carregar o perfil: '+friendlyError(e),true);}
  }
  const protectedPage=['perfil.html','geral.html','comunidades.html','comunidade.html','comunidade-detalhe.html','mentor-matching.html'].some(p=>location.pathname.endsWith('/'+p));
  if(protectedPage&&!currentUser){notice('Entre na sua conta para acessar o LumiNova.'); setTimeout(()=>{location.href='index.html';},1400);return;}
  const loginForm=$('#loginForm'); if(loginForm){const forgot=$('.forgot',loginForm);forgot?.addEventListener('click',async e=>{e.preventDefault();const email=$('#user')?.value.trim();if(!email||!email.includes('@')){notice('Digite seu e-mail no campo acima para recuperar a senha.',true);return;}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/index.html'});notice(error?friendlyError(error):'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.',!!error);});}
  if($('#generalFeed')||$('#postsList')) await loadFeed();
  supabase.auth.onAuthStateChange((_event,sessionNow)=>{currentUser=sessionNow?.user||null;});
});
