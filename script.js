/* ============================================================
   LUMINOVA — script.js
   Funciona em index.html (login) E perfil.html (perfil)
   Detecta automaticamente o que existe na página.
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

console.log("script.js carregado ✔");

// Primeira abertura desta versão: limpa dados antigos de demonstração do navegador.
// Executa apenas uma vez por navegador; depois preserva os cadastros reais feitos nos testes.
(function cleanOldDemoDataOnce(){
  const key = 'luminova-empty-start-v2';
  try {
    if (localStorage.getItem(key)) return;
    ['luminovaUser','ln_communities','ln_generalPosts','ln_communityPosts','ln_communityChats','ln_communityAwards','ln_mentorMatches','ln_mentorApplications','ln_mentorChatsMessages','ln_mentorQuiz','ln_mentorSeen','ln_profileName','luminova_profile_name','luminova_profile_handle','luminova_profile_bio','luminova_profile_location','luminova_profile_role'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem(key, '1');
  } catch (_) {}
})();

/* ============================================================
   TOAST (usado no perfil)
   ============================================================ */
const toast = (msg) => {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
};

/* ============================================================
   ==============  PÁGINA: index.html (LOGIN)  ===============
   ============================================================ */

/* ---------- INTRO ---------- */
(function initIntro() {
  const body = document.body;
  const skip = $("#skip");
  if (!skip) return;

  function endIntro() {
    body.classList.add("ready");
  }
  const t = setTimeout(endIntro, 3200);

  skip.addEventListener("click", function () {
    clearTimeout(t);
    endIntro();
  });
})();

/* ---------- TROCA WELCOME / LOGIN ---------- */
(function initScreens() {
  const sWelcome = $("#screenWelcome");
  const sLogin = $("#screenLogin");
  const goLogin = $("#goLogin");
  const backHome = $("#backHome");
  if (!sWelcome || !sLogin || !goLogin || !backHome) return;

  goLogin.addEventListener("click", () => {
    sWelcome.classList.remove("is-active");
    sLogin.classList.add("is-active");
  });

  backHome.addEventListener("click", () => {
    sLogin.classList.remove("is-active");
    sWelcome.classList.add("is-active");
  });
})();

/* ---------- MOSTRAR SENHA ---------- */
(function initTogglePw() {
  const pw = $("#pass");
  const tog = $("#togglePw");
  if (!pw || !tog) return;

  tog.addEventListener("click", () => {
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    tog.textContent = show ? "Ocultar" : "Mostrar";
  });
})();

/* ---------- MODAL CADASTRO ---------- */
(function initSignupModal() {
  const modal = $("#signup");
  const openBtn = $("#openSignup");
  const closeBtn = $("#closeSignup");
  if (!modal || !openBtn) return;

  const open = () => {
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("open");
    $("#n1")?.focus();
  };
  const close = () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("open");
  };

  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });
  closeBtn?.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();

/* ---------- LOGIN → PERFIL ---------- */
(function initLoginSubmit() {
  const form = $("#loginForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = $("#user");
    const pass = $("#pass");
    if (!user?.value.trim() || !pass?.value) {
      alert("Preencha seu e-mail/apelido e sua senha para continuar.");
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const response = await fetch("/api/auth/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login: user.value.trim(), password: pass.value }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || "Não foi possível entrar.");
      localStorage.setItem("luminovaUser", JSON.stringify(result.user));
      window.location.href = "perfil.html";
    } catch (error) {
      alert(error instanceof TypeError ? "Não foi possível conectar ao backend. Inicie o servidor Python e tente novamente." : error.message);
    } finally { if (submit) submit.disabled = false; }
  });
})();

/* ---------- CADASTRO → PERFIL ---------- */
(function initSignupSubmit() {
  const form = $("#signupForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#n1")?.value.trim();
    const nickname = $("#n2")?.value.trim();
    const email = $("#n3")?.value.trim();
    const password = $("#n4")?.value;
    if (!name || !nickname || !email || !password) {
      alert("Preencha todos os campos para criar sua conta.");
      return;
    }
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      alert("Use uma senha com pelo menos 10 caracteres, incluindo letras e números.");
      $("#n4")?.focus();
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const response = await fetch("/api/auth/signup", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, nickname, email, password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.map(x => x.msg).join("; ") : (result.detail || "Não foi possível criar a conta."));
      localStorage.setItem("luminovaUser", JSON.stringify(result.user));
      window.location.href = "perfil.html";
    } catch (error) {
      alert(error instanceof TypeError ? "Não foi possível conectar ao backend. Inicie o servidor Python e tente novamente." : error.message);
    } finally { if (submit) submit.disabled = false; }
  });
})();

/* ============================================================
   ==============  PÁGINA: perfil.html  ======================
   ============================================================ */

/* ---------- MODAIS DO PERFIL ---------- */
(function initPerfilModais() {
  const modal = $("#settingsModal");
  if (!modal) return; // não está no perfil

  const openSettings = () => {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  };
  const closeSettings = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  };

  ["#openSettings", "#openSettings2", "#editProfile"].forEach((sel) => {
    const btn = $(sel);
    if (btn) btn.addEventListener("click", openSettings);
  });

  $$("[data-close]").forEach((b) => b.addEventListener("click", closeSettings));

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeSettings();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettings();
  });

  /* ----- MODAL CONSTRUÇÃO ----- */
  const constructionModal = $("#constructionModal");
  if (!constructionModal) return;

  const openConstruction = (area = "Esta área") => {
    const title = $("#constructionTitle");
    if (title) title.textContent = `${area} está em construção`;
    constructionModal.classList.add("open");
    constructionModal.setAttribute("aria-hidden", "false");
  };
  const closeConstruction = () => {
    constructionModal.classList.remove("open");
    constructionModal.setAttribute("aria-hidden", "true");
  };

  $$("[data-construction]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openConstruction(link.dataset.construction || "Esta área");
    });
  });

  const closeC = $("#closeConstruction");
  const okC = $("#constructionOk");
  if (closeC) closeC.addEventListener("click", closeConstruction);
  if (okC) okC.addEventListener("click", closeConstruction);

  constructionModal.addEventListener("click", (e) => {
    if (e.target === constructionModal) closeConstruction();
  });
})();

/* ---------- SALVAR PERFIL ---------- */
(function initProfileForm() {
  const form = $("#profileForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = $("#nameInput")?.value.trim() || "Seu nome";
    const handleRaw = $("#handleInput")?.value.trim() || "@seuusuario";
    const handle = handleRaw.startsWith("@") ? handleRaw : "@" + handleRaw;
    const bio = $("#bioInput")?.value.trim() || "";
    const bg = $("#pageBgInput")?.value || "#0b0917";
    const coverStyle = $("#coverStyle")?.value || "cosmic";

    if ($("#displayName")) $("#displayName").textContent = name;
    if ($("#sideName")) $("#sideName").textContent = name;
    if ($("#displayHandle")) $("#displayHandle").textContent = handle;
    if ($("#displayBio")) $("#displayBio").textContent = bio;

    document.documentElement.style.setProperty("--bg", bg);
    document.body.style.background = `radial-gradient(ellipse at 68% -20%, rgba(232,200,138,.10), transparent 45%), ${bg}`;

    const cover = $(".cover");
    if (cover) cover.dataset.style = coverStyle;

    const modal = $("#settingsModal");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
    toast("Perfil atualizado! ✦");
  });
})();

/* ---------- AVATAR / CAPA ---------- */
(function initAvatarCover() {
  const avatarEdit = $("#avatarEdit");
  const avatarFile = $("#avatarFile");
  if (avatarEdit && avatarFile) {
    avatarEdit.addEventListener("click", () => avatarFile.click());
    avatarFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      if ($("#avatar")) $("#avatar").src = url;
      if ($("#sideAvatar")) $("#sideAvatar").src = url;
      if ($("#composerAvatar")) $("#composerAvatar").src = url;
      toast("Foto de perfil atualizada!");
    });
  }

  const coverEdit = $("#coverEdit");
  const coverFile = $("#coverFile");
  if (coverEdit && coverFile) {
    coverEdit.addEventListener("click", () => coverFile.click());
    coverFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const cover = $(".cover");
      if (!cover) return;
      cover.style.backgroundImage = `linear-gradient(90deg, rgba(4,6,15,.55), rgba(4,6,15,.05)), url("${URL.createObjectURL(file)}")`;
      cover.style.backgroundSize = "cover";
      cover.style.backgroundPosition = "center";
      toast("Capa atualizada!");
    });
  }
})();

/* ---------- COMPARTILHAR PERFIL ---------- */
(function initShare() {
  const btn = $("#shareProfile");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast("Link do perfil copiado!");
    } catch {
      toast("Copie o endereço desta página para compartilhar.");
    }
  });
})();

/* ---------- FRASE FAVORITA ---------- */
(function initQuote() {
  const btn = $("#editQuote");
  const quote = $("#favoriteQuote");
  if (!btn || !quote) return;

  btn.addEventListener("click", () => {
    const next = prompt("Escreva sua frase favorita:", quote.textContent);
    if (next && next.trim()) {
      quote.textContent = next.trim();
      toast("Frase atualizada!");
    }
  });
})();

/* ---------- TABS ---------- */
(function initTabs() {
  const tabs = $$("[data-tab]");
  if (!tabs.length) return;

  function switchTab(tab) {
    $$('[data-tab]').forEach((b) =>
      b.classList.toggle('active', b.dataset.tab === tab),
    );
    $$('.main-nav [data-switch]').forEach((link) =>
      link.classList.toggle('active', link.dataset.switch === tab),
    );

    const el = {
      generalFeed: $("#generalFeed"),
      communityGrid: $("#communityGrid"),
      communityHeading: $(".community-heading"),
      activitySection: $("#activitySection"),
      aboutPanel: $("#aboutPanel"),
      allActivity: $("#allActivity"),
      achievementsPanel: $("#achievementsPanel"),
      sectionTitle: $("#sectionTitle"),
    };

    if (el.generalFeed)
      el.generalFeed.classList.toggle("hidden", tab !== "geral");
    if (el.communityGrid)
      el.communityGrid.classList.toggle("hidden", tab !== "comunidades");
    if (el.communityHeading)
      el.communityHeading.classList.toggle("hidden", tab !== "comunidades");
    if (el.activitySection)
      el.activitySection.classList.toggle(
        "hidden",
        tab !== "atividade" && tab !== "comunidades",
      );
    if (el.aboutPanel)
      el.aboutPanel.classList.toggle("hidden", tab !== "sobre");
    if (el.allActivity)
      el.allActivity.classList.toggle("hidden", tab !== "atividade");
    if (el.achievementsPanel)
      el.achievementsPanel.classList.toggle("hidden", tab !== "conquistas");
    ["skillTreeSection", "contributionsSection", "thanksSection"].forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.classList.add("hidden");
    });
    if (el.activitySection) el.activitySection.classList.toggle("hidden", tab !== "atividade");

    const trendsCard = $("#trendsCard");
    if (trendsCard) trendsCard.classList.toggle("hidden", tab !== "geral");
    const rightColumn = $(".right-column");
    if (rightColumn) {
      rightColumn.querySelectorAll(":scope > .side-card:not(#trendsCard), :scope > .footer-note").forEach((item) => {
        item.classList.toggle("hidden", tab === "geral");
      });
    }
    const contentGrid = $(".content-grid");
    if (contentGrid) contentGrid.classList.toggle("is-general-view", tab === "geral");

    const titles = {
      geral: "Geral",
      comunidades: "Minhas comunidades",
      conquistas: "Minhas conquistas",
      sobre: "Sobre mim",
      atividade: "Minha atividade",
    };

    if (tab !== "geral" && el.sectionTitle) {
      el.sectionTitle.innerHTML =
        (titles[tab] || titles.comunidades) +
        (tab === "comunidades" ? ' <span class="muted-count">/ 04</span>' : "");
    }

    if (tab === "geral" && el.generalFeed)
      el.generalFeed.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  tabs.forEach((btn) =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab)),
  );
  $$("[data-switch]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(btn.dataset.switch);
    }),
  );
  const requestedView = window.location.hash.replace(/^#/, "");
  switchTab(["geral", "comunidades"].includes(requestedView)
    ? requestedView
    : ($("[data-tab].active")?.dataset.tab || "comunidades"));
})();

/* ---------- MODO CLARO / ESCURO ---------- */
(function initTheme() {
  const themeToggle = $("#themeToggle");
  if (!themeToggle) return;

  const themeKey = "luminova-theme";
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === "light") document.body.classList.add("light-mode");
  themeToggle.textContent = document.body.classList.contains("light-mode") ? "☾" : "☼";
  themeToggle.addEventListener("click", () => {
    const light = document.body.classList.toggle("light-mode");
    localStorage.setItem(themeKey, light ? "light" : "dark");
    themeToggle.textContent = light ? "☾" : "☼";
    themeToggle.setAttribute(
      "aria-label",
      light ? "Ativar modo escuro" : "Ativar modo claro",
    );
    themeToggle.title = light ? "Ativar modo escuro" : "Ativar modo claro";
    toast(light ? "Modo claro ativado ☀" : "Modo escuro ativado ✦");
  });
})();

/* ---------- FEED GERAL: PUBLICAÇÕES, HASHTAGS E RESPOSTAS ---------- */
(function initCommunityFeed() {
  const form = $("#postForm");
  const input = $("#postInput");
  const list = $("#postsList");
  if (!form || !input || !list) return;

  const storageKey = "luminovaPublicPosts";
  let currentFilter = "";
  let latestFirst = false;

  function getSavedPosts() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch (_) { return []; }
  }
  function savePost(post) {
    try {
      const posts = getSavedPosts();
      posts.unshift(post);
      localStorage.setItem(storageKey, JSON.stringify(posts.slice(0, 60)));
    } catch (_) {}
  }
  function filterPosts(tag = "") {
    currentFilter = tag.toLowerCase();
    [...list.children].forEach((card) => {
      const text = (card.querySelector(".post-content p")?.textContent || "").toLowerCase();
      const topic = (card.querySelector(".post-topic")?.textContent || "").toLowerCase();
      card.classList.toggle("filtered-out", Boolean(currentFilter) && !text.includes(currentFilter) && !topic.includes(currentFilter));
    });
    const heading = $(".feed-filters > span");
    if (heading) heading.textContent = currentFilter ? `Conversas sobre ${tag}` : "Explorar conversas";
    $("#clearTrendFilter")?.classList.toggle("hidden", !currentFilter);
    $("#generalFeed")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function appendTextWithHashtags(parent, text) {
    const parts = String(text).split(/(#[\p{L}\p{N}_-]+)/gu);
    parts.forEach((part) => {
      if (/^#[\p{L}\p{N}_-]+$/u.test(part)) {
        const link = document.createElement("button");
        link.type = "button";
        link.className = "inline-hashtag";
        link.textContent = part;
        link.addEventListener("click", () => filterPosts(part));
        parent.append(link);
      } else parent.append(document.createTextNode(part));
    });
  }
  function createPost(data, prepend = true) {
    const card = document.createElement("article");
    card.className = "post-card new-post";
    const avatar = document.createElement("img");
    avatar.className = "post-avatar-img";
    avatar.src = data.avatar || $("#avatar")?.src || "";
    avatar.alt = "";
    const content = document.createElement("div");
    content.className = "post-content";
    const byline = document.createElement("div");
    byline.className = "post-byline";
    const name = document.createElement("strong"); name.textContent = data.name || "Você";
    const handle = document.createElement("span"); handle.className = "post-handle"; handle.textContent = data.handle || "@voce";
    const time = document.createElement("time"); time.textContent = data.time || "agora";
    byline.append(name, handle, document.createTextNode(" · "), time);
    const body = document.createElement("p"); appendTextWithHashtags(body, data.text || "");
    const actions = document.createElement("div"); actions.className = "post-actions";
    actions.innerHTML = `<button type="button" class="post-action like-button">♡ <span>${Number(data.likes) || 0}</span></button><button type="button" class="post-action comment-button">▢ <span>Responder</span></button><button type="button" class="post-action share-post">↗ Compartilhar</button>`;
    const replies = document.createElement("div"); replies.className = "post-replies hidden";
    content.append(byline, body, actions, replies); card.append(avatar, content);
    if (prepend) list.prepend(card); else list.append(card);
    bindPostActions(card);
    return card;
  }

  // Recupera somente as publicações salvas neste navegador.
  getSavedPosts().slice().reverse().forEach((post) => createPost(post, true));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const data = {
      text,
      name: $("#displayName")?.textContent?.trim() || "Você",
      handle: $("#displayHandle")?.textContent?.trim() || "@voce",
      avatar: $("#avatar")?.src || "",
      time: "agora",
      likes: 0,
      createdAt: Date.now()
    };
    createPost(data, true);
    savePost(data);
    input.value = "";
    const count = $("#postCharCount"); if (count) count.textContent = "0/500";
    filterPosts(currentFilter);
    toast("Publicado! Sua conversa já aparece no Geral.");
  });

  input.addEventListener("input", () => {
    const count = $("#postCharCount");
    if (count) count.textContent = `${input.value.length}/500`;
  });

  $("#latestFilter")?.addEventListener("click", () => {
    latestFirst = !latestFirst;
    const cards = [...list.children];
    (latestFirst ? cards : cards.reverse()).forEach((card) => list.append(card));
    $("#latestFilter").classList.toggle("active", latestFirst);
    toast(latestFirst ? "Mostrando as conversas mais recentes." : "Ordem do feed restaurada.");
  });
  $$(".trend-item[data-hashtag]").forEach((button) => button.addEventListener("click", () => filterPosts(button.dataset.hashtag)));
  $("#clearTrendFilter")?.addEventListener("click", () => filterPosts(""));
  // Hashtags das publicações ficam clicáveis.
  list.querySelectorAll(".post-content p").forEach((p) => {
    if (p.querySelector(".inline-hashtag")) return;
    const original = p.textContent;
    p.textContent = "";
    appendTextWithHashtags(p, original);
  });
  list.querySelectorAll(".post-topic").forEach((topic) => {
    topic.tabIndex = 0;
    topic.role = "button";
    topic.title = "Ver conversas com esta hashtag";
    topic.addEventListener("click", () => filterPosts(topic.textContent.trim()));
  });
})();

/* ---------- AÇÕES DOS POSTS ---------- */
function bindPostActions(root = document) {
  root.querySelectorAll(".like-button").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const liked = btn.classList.toggle("liked");
      btn.firstChild.textContent = liked ? "♥ " : "♡ ";
      const count = btn.querySelector("span");
      count.textContent = String(Math.max(0, Number(count.textContent) + (liked ? 1 : -1)));
    });
  });
  root.querySelectorAll(".comment-button").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const card = btn.closest(".post-card");
      const replies = card?.querySelector(".post-replies");
      if (!replies) return;
      replies.classList.toggle("hidden");
      if (replies.dataset.ready) return;
      replies.dataset.ready = "1";
      const form = document.createElement("form"); form.className = "reply-form";
      const field = document.createElement("input"); field.type = "text"; field.maxLength = 240; field.placeholder = "Escreva uma resposta..."; field.required = true;
      const send = document.createElement("button"); send.type = "submit"; send.textContent = "Responder";
      form.append(field, send);
      const repliesList = document.createElement("div"); repliesList.className = "reply-list";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = field.value.trim(); if (!value) return;
        const reply = document.createElement("p"); reply.className = "reply-item";
        const strong = document.createElement("strong"); strong.textContent = $("#displayName")?.textContent?.trim() || "Você";
        const span = document.createElement("span"); span.textContent = value;
        reply.append(strong, span); repliesList.append(reply); field.value = "";
        toast("Resposta adicionada à conversa.");
      });
      replies.append(form, repliesList);
      field.focus();
    });
  });
  root.querySelectorAll(".share-post").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", async () => {
      const text = btn.closest(".post-card")?.querySelector(".post-content p")?.textContent || "";
      try { await navigator.clipboard.writeText(text); toast("Texto da publicação copiado!"); }
      catch { toast("Não foi possível copiar automaticamente. Você pode selecionar o texto da publicação."); }
    });
  });
}

/* ---------- INICIALIZA AÇÕES DAS PUBLICAÇÕES ---------- */
(function initExistingPostActions() {
  if ($("#postsList")) bindPostActions();
})();

/* ---------- MURAL DE AGRADECIMENTOS ---------- */
(function initThanks() {
  const btn = $("#addThanks");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const message = prompt("Escreva uma mensagem de agradecimento:");
    if (!message || !message.trim()) return;

    const note = document.createElement("article");
    note.className = "thanks-note note-lilac";
    const mark = document.createElement("span");
    mark.className = "note-heart";
    mark.textContent = "♡";
    const paragraph = document.createElement("p");
    paragraph.textContent = "“" + message.trim() + "”";
    const author = document.createElement("small");
    author.textContent = "— Você";
    note.append(mark, paragraph, author);
    $("#thanksGrid").prepend(note);
    toast("Mensagem adicionada ao mural!");
  });
})();

/* ---------- ADICIONAR COMUNIDADE ---------- */
(function initAddCommunity() {
  const btn = $("#addCommunity");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const name = prompt("Qual comunidade você quer adicionar?");
    if (!name || !name.trim()) return;

    const card = document.createElement("article");
    card.className = "community-card community-purple";
    card.innerHTML = `
      <div class="community-art art-code"><span>✧</span><i>✦</i><b>NEW</b></div>
      <div class="community-body">
        <div class="card-title"><h3></h3><span class="member-count">◉ Nova</span></div>
        <p>Uma nova conexão no seu universo.</p>
        <div class="card-footer"><span class="tag">COMUNIDADE</span><span class="joined">✓ Participando</span></div>
      </div>`;
    card.querySelector("h3").textContent = name.trim();
    $("#communityGrid").append(card);
    toast("Comunidade adicionada ao perfil!");
  });
})();


/* Fallback robusto para rolagem e edição do perfil */
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;
  const openModal = (event) => {
    if (event) event.preventDefault();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeModal = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  ["editProfile", "openSettings", "openSettings2"].forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.addEventListener("click", openModal);
  });
  modal.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
});

/* Persistência real das preferências do perfil no navegador, sem alterar seu layout. */
(function persistProfilePreferences(){
  const read=(k,d='')=>{try{return localStorage.getItem('luminova_profile_'+k)??d}catch{return d}};
  const save=(k,v)=>{try{localStorage.setItem('luminova_profile_'+k,v)}catch{}};
  document.addEventListener('DOMContentLoaded',()=>{
    const fields={nameInput:'name',handleInput:'handle',bioInput:'bio',pageBgInput:'bg',coverStyle:'cover'};
    Object.entries(fields).forEach(([id,key])=>{const el=document.getElementById(id);const v=read(key);if(el&&v)el.value=v;});
    const apply=()=>{
      const name=read('name','Seu nome'),handle=read('handle','@seuusuario'),bio=read('bio','Adicione uma bio para apresentar seu universo.'),bg=read('bg','#0b0917'),coverStyle=read('cover','cosmic');
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
      set('displayName',name);set('sideName',name);set('displayHandle',handle.startsWith('@')?handle:'@'+handle);set('displayBio',bio);
      const cover=document.querySelector('.cover');if(cover)cover.dataset.style=coverStyle;
      if(document.getElementById('pageBgInput')){document.documentElement.style.setProperty('--bg',bg);document.body.style.background=`radial-gradient(ellipse at 68% -20%, rgba(232,200,138,.10), transparent 45%), ${bg}`;}
    };
    apply();
    const form=document.getElementById('profileForm');if(form&&!form.dataset.persistBound){form.dataset.persistBound='1';form.addEventListener('submit',()=>{Object.entries(fields).forEach(([id,key])=>{const el=document.getElementById(id);if(el)save(key,el.value.trim())});});}
  });
})();
