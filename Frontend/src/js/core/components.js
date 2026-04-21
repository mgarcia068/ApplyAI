// USO: agregar en cada HTML, antes del cierre de </body>:
//   <div id="navbar-placeholder"></div>   ← al inicio del body
//   <div id="footer-placeholder"></div>   ← al final del body
//   <script src="js/core/components.js"></script>

const isLanding =
  window.location.pathname === "/" ||
  window.location.pathname.endsWith("index.html");

function isInPagesDir() {
  return getPagesNestingDepth() > 0;
}

function getPagesNestingDepth() {
  const marker = "/pages/";
  const pathname = window.location.pathname;
  const markerIndex = pathname.lastIndexOf(marker);
  if (markerIndex === -1) return 0;

  const rest = pathname.slice(markerIndex + marker.length);
  const segments = rest.split("/").filter(Boolean);
  return segments.length || 1;
}

function getRootPrefix() {
  const depth = getPagesNestingDepth();
  return depth > 0 ? "../".repeat(depth) : "";
}

function resolvePathForContext(pathFromRoot) {
  // pathFromRoot is relative to Frontend/src (e.g. 'pages/auth/login.html', 'pages/candidato/dashboard-candidato.html')
  return `${getRootPrefix()}${pathFromRoot}`;
}

function resolvePagePath(pageFileName) {
  // For pages that live inside Frontend/src/pages/
  // - from root pages: 'pages/<file>'
  // - from /pages: '<file>'
  // - from /pages/<subdir>: '../<file>'
  if (!isInPagesDir()) return `pages/${pageFileName}`;

  const depth = getPagesNestingDepth();
  const prefixToPagesRoot = "../".repeat(Math.max(0, depth - 1));
  return `${prefixToPagesRoot}${pageFileName}`;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function normalizeRole(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "candidato" || normalized === "cliente") return "candidato";
  if (normalized === "empresa") return "empresa";
  return "";
}

function getCurrentUser() {
  const raw = localStorage.getItem("ApplyAI.currentUser");
  if (!raw) return null;
  const parsed = safeJsonParse(raw, null);
  if (!parsed || typeof parsed !== "object") return null;

  const email = String(parsed.email || "").trim().toLowerCase();
  const role = normalizeRole(parsed.role);
  const fullName = String(parsed.fullName || "").trim();

  if (!email || !role) return null;
  return { email, role, fullName };
}

function getProfileStorageKey(email) {
  return `ApplyAI.candidateProfile:${String(email || "").trim().toLowerCase()}`;
}

function getCandidateProfile(email) {
  const key = getProfileStorageKey(email);
  const raw = localStorage.getItem(key);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function handleGlobalLogout() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity 0.2s ease;";

  const modal = document.createElement("div");
  modal.className = "card";
  modal.style.cssText = "background:var(--color-bg);padding:var(--space-6);border-radius:var(--radius-lg);width:90%;max-width:400px;transform:translateY(20px);transition:transform 0.2s ease;box-shadow:var(--shadow-lg);";
  
  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">
      <div style="width:40px;height:40px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;color:var(--color-error);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </div>
      <h3 style="margin:0;font-size:var(--text-lg);color:var(--color-text);">Cerrar sesión</h3>
    </div>
    <p style="margin-bottom:var(--space-6);color:var(--color-text-muted);font-size:var(--text-sm);">¿Estás seguro de que deseas salir de tu cuenta? Tendrás que volver a ingresar tus credenciales para acceder a tus datos.</p>
    <div style="display:flex;justify-content:flex-end;gap:var(--space-3);">
      <button class="btn btn--ghost" id="btn-cancel-logout">Cancelar</button>
      <button class="btn btn--primary" id="btn-confirm-logout" style="background:var(--color-error);border-color:var(--color-error);color:white;">Sí, cerrar sesión</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Animación de entrada
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    modal.style.transform = "translateY(0)";
  });

  const close = () => {
    overlay.style.opacity = "0";
    modal.style.transform = "translateY(20px)";
    setTimeout(() => overlay.remove(), 200);
  };

  document.getElementById("btn-cancel-logout").onclick = close;
  document.getElementById("btn-confirm-logout").onclick = () => {
    localStorage.removeItem("ApplyAI.currentUser");
    window.location.href = resolvePathForContext("index.html");
  };
}

function initialsFromName(name) {
  const clean = String(name || "").trim();
  if (!clean) return "?";

  const parts = clean.split(/\s+/).map((p) => p.trim()).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  const result = (first + second).toUpperCase();
  return result || "?";
}

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function getPhotoPan(profile) {
  const x = clampNumber(profile?.photoPanX, -1, 1);
  const y = clampNumber(profile?.photoPanY, -1, 1);
  return { x, y };
}

function clearPhotoPan(imgEl) {
  if (!imgEl) return;
  imgEl.style.removeProperty("--photo-pan-x");
  imgEl.style.removeProperty("--photo-pan-y");
  imgEl.style.removeProperty("--photo-pan-scale");
}

function applyPhotoPan(imgEl, viewportEl, pan, scale) {
  if (!imgEl || !viewportEl) return;

  const rect = viewportEl.getBoundingClientRect();
  const appliedScale = Number(scale) || 1;
  const maxX = (appliedScale - 1) * rect.width * 0.5;
  const maxY = (appliedScale - 1) * rect.height * 0.5;
  const xN = clampNumber(pan?.x, -1, 1);
  const yN = clampNumber(pan?.y, -1, 1);

  const tx = maxX ? xN * maxX : 0;
  const ty = maxY ? yN * maxY : 0;

  imgEl.style.setProperty("--photo-pan-x", `${tx}px`);
  imgEl.style.setProperty("--photo-pan-y", `${ty}px`);
  imgEl.style.setProperty("--photo-pan-scale", String(appliedScale));
}

function ensureElementId(el, id) {
  if (!el) return null;
  if (!el.id) el.id = id;
  return el;
}

function ensureButtonLabel(btn, text) {
  if (!btn) return;
  let span = btn.querySelector("span");
  if (!span) {
    span = document.createElement("span");
    btn.appendChild(span);
  }
  span.textContent = text;
}

function ensureNavbarDom() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  const actions = navbar.querySelector(".navbar__actions");
  if (!actions) return;

  // Ensure the public theme toggle is identifiable so we can show/hide it.
  let publicThemeToggle = document.getElementById("navbar-public-theme-toggle");
  if (!publicThemeToggle) {
    const existingPublicToggle = actions.querySelector(':scope > label.theme-switch-wrapper');
    if (existingPublicToggle) {
      existingPublicToggle.id = "navbar-public-theme-toggle";
      publicThemeToggle = existingPublicToggle;
    }
  }

  // Ensure login/register IDs exist (older navbar.html didn't have them).
  const loginAnchor = document.getElementById("navbar-login-btn") || actions.querySelector('a[href$="login.html"]');
  if (loginAnchor) loginAnchor.id = "navbar-login-btn";

  const registerAnchor = document.getElementById("navbar-register-btn") || actions.querySelector('a[href$="register.html"]');
  if (registerAnchor) registerAnchor.id = "navbar-register-btn";

  // Ensure dashboard button exists.
  if (!document.getElementById("navbar-dashboard-btn")) {
    const dashboardBtn = document.createElement("button");
    dashboardBtn.className = "btn btn--primary btn--sm";
    dashboardBtn.type = "button";
    dashboardBtn.id = "navbar-dashboard-btn";
    dashboardBtn.hidden = true;
    dashboardBtn.textContent = "Mi panel";
    actions.appendChild(dashboardBtn);
  }

  // Ensure candidate user dropdown exists.
  let userMenu = document.getElementById("navbar-user-menu");
  if (!userMenu) {
    userMenu = document.createElement("div");
    userMenu.className = "navbar-user-menu";
    userMenu.id = "navbar-user-menu";
    userMenu.hidden = true;
    userMenu.innerHTML = `
      <button class="navbar-user-btn" id="navbar-user-btn" aria-haspopup="true" aria-expanded="false">
        <div class="avatar avatar--sm" id="navbar-user-avatar" aria-hidden="true">
          <img id="navbar-user-avatar-img" alt="" hidden />
          <span id="navbar-user-avatar-fallback">?</span>
        </div>
      </button>

      <div class="user-dropdown" id="navbar-user-dropdown">
        <div class="user-dropdown__header">
          <div class="user-dropdown__name" id="navbar-user-name">—</div>
          <div class="user-dropdown__email" id="navbar-user-location" hidden>—</div>
          <div class="user-dropdown__email" id="navbar-user-email">—</div>
        </div>
        <div class="divider"></div>
        <button class="user-dropdown__item" id="navbar-profile-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Mi perfil</span>
        </button>
        <button class="user-dropdown__item" id="navbar-offers-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Ofertas laborales</span>
        </button>
        <button class="user-dropdown__item" id="navbar-favorites-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span>Mis empresas favoritas</span>
        </button>
        <button class="user-dropdown__item" id="navbar-applications-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <span>Mis postulaciones</span>
        </button>
        <div class="user-dropdown__item" id="navbar-theme-toggle-btn" style="padding: var(--space-2) var(--space-4);">
          <label class="theme-switch-wrapper" style="gap: var(--space-2);">
            <div class="theme-switch__label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              Cambiar tema
            </div>
            <div class="theme-switch" id="navbar-theme-switch-btn-2" aria-hidden="true"></div>
          </label>
        </div>
        <div class="divider"></div>
        <button class="user-dropdown__item text-error" id="navbar-logout-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    `;
    actions.appendChild(userMenu);
  }

  // If dropdown exists but comes from an older cached navbar.html, ensure required ids.
  const userBtn = document.getElementById("navbar-user-btn") || userMenu.querySelector(".navbar-user-btn");
  ensureElementId(userBtn, "navbar-user-btn");

  const userDropdown = document.getElementById("navbar-user-dropdown") || userMenu.querySelector(".user-dropdown") || userMenu.querySelector(".navbar-user-dropdown");
  ensureElementId(userDropdown, "navbar-user-dropdown");

  // Ensure header fields.
  const nameEl = document.getElementById("navbar-user-name") || userMenu.querySelector(".user-dropdown__name") || userMenu.querySelector(".navbar-user-dropdown__name");
  ensureElementId(nameEl, "navbar-user-name");

  let locationEl = document.getElementById("navbar-user-location") || userMenu.querySelector("#navbar-user-location");
  if (!locationEl && nameEl) {
    locationEl = document.createElement("div");
    locationEl.className = "user-dropdown__email";
    locationEl.id = "navbar-user-location";
    locationEl.hidden = true;
    locationEl.textContent = "—";
    nameEl.insertAdjacentElement("afterend", locationEl);
  }
  ensureElementId(locationEl, "navbar-user-location");

  const emailEl =
    document.getElementById("navbar-user-email") ||
    userMenu.querySelector('.user-dropdown__email:not(#navbar-user-location)') ||
    userMenu.querySelector('.navbar-user-dropdown__email:not(#navbar-user-location)');
  ensureElementId(emailEl, "navbar-user-email");

  // Ensure avatar structure.
  const avatarEl = document.getElementById("navbar-user-avatar") || userMenu.querySelector(".avatar");
  ensureElementId(avatarEl, "navbar-user-avatar");
  if (avatarEl) {
    let avatarImg = document.getElementById("navbar-user-avatar-img") || avatarEl.querySelector("img");
    if (!avatarImg) {
      avatarImg = document.createElement("img");
      avatarImg.hidden = true;
      avatarImg.alt = "";
      avatarEl.prepend(avatarImg);
    }
    avatarImg.id = "navbar-user-avatar-img";

    let avatarFallback = document.getElementById("navbar-user-avatar-fallback") || avatarEl.querySelector("span");
    if (!avatarFallback) {
      avatarFallback = document.createElement("span");
      avatarFallback.textContent = "?";
      avatarEl.appendChild(avatarFallback);
    }
    avatarFallback.id = "navbar-user-avatar-fallback";
  }

  // Ensure menu items exist and have visible labels.
  const profileBtn = ensureElementId(document.getElementById("navbar-profile-btn") || userMenu.querySelector("#navbar-profile-btn") || userMenu.querySelector("button"), "navbar-profile-btn");
  ensureButtonLabel(profileBtn, "Mi perfil");

  let empresaPanelBtn = document.getElementById("navbar-empresa-panel-btn") || userMenu.querySelector("#navbar-empresa-panel-btn");
  if (!empresaPanelBtn && userDropdown) {
    empresaPanelBtn = document.createElement("button");
    empresaPanelBtn.type = "button";
    empresaPanelBtn.className = "user-dropdown__item";
    empresaPanelBtn.id = "navbar-empresa-panel-btn";
    empresaPanelBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
      <span>Mi panel</span>
    `;
    profileBtn?.insertAdjacentElement("afterend", empresaPanelBtn);
  }
  ensureButtonLabel(empresaPanelBtn, "Mi panel");

  let offersBtn = document.getElementById("navbar-offers-btn") || userMenu.querySelector("#navbar-offers-btn");
  if (!offersBtn && userDropdown) {
    // Insert after profile.
    offersBtn = document.createElement("button");
    offersBtn.type = "button";
    offersBtn.className = "user-dropdown__item";
    offersBtn.id = "navbar-offers-btn";
    offersBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>Ofertas laborales</span>
    `;
    profileBtn?.insertAdjacentElement("afterend", offersBtn);
  }
  ensureButtonLabel(offersBtn, "Ofertas laborales");

  let applicationsBtn = document.getElementById("navbar-applications-btn") || userMenu.querySelector("#navbar-applications-btn");
  if (!applicationsBtn && userDropdown) {
    // Insert after favorites/offers.
    applicationsBtn = document.createElement("button");
    applicationsBtn.type = "button";
    applicationsBtn.className = "user-dropdown__item";
    applicationsBtn.id = "navbar-applications-btn";
    applicationsBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <span>Mis postulaciones</span>
    `;
    (offersBtn || profileBtn)?.insertAdjacentElement("afterend", applicationsBtn);
  }
  ensureButtonLabel(applicationsBtn, "Mis postulaciones");

  if (applicationsBtn && !applicationsBtn.querySelector("svg")) {
    applicationsBtn.insertAdjacentHTML(
      "afterbegin",
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>'
    );
  }

  let favoritesBtn = document.getElementById("navbar-favorites-btn") || userMenu.querySelector("#navbar-favorites-btn");
  if (!favoritesBtn && userDropdown) {
    favoritesBtn = document.createElement("button");
    favoritesBtn.type = "button";
    favoritesBtn.className = "user-dropdown__item";
    favoritesBtn.id = "navbar-favorites-btn";
    favoritesBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      <span>Mis empresas favoritas</span>
    `;
    (offersBtn || profileBtn)?.insertAdjacentElement("afterend", favoritesBtn);
  }
  ensureButtonLabel(favoritesBtn, "Mis empresas favoritas");

  if (favoritesBtn && !favoritesBtn.querySelector("svg")) {
    favoritesBtn.insertAdjacentHTML(
      "afterbegin",
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
    );
  }

  let themeToggleBtn = document.getElementById("navbar-theme-toggle-btn") || userMenu.querySelector("#navbar-theme-toggle-btn");
  if (!themeToggleBtn && userDropdown) {
    themeToggleBtn = document.createElement("div");
    themeToggleBtn.className = "user-dropdown__item";
    themeToggleBtn.id = "navbar-theme-toggle-btn";
    themeToggleBtn.style.padding = "var(--space-2) var(--space-4)";
    themeToggleBtn.innerHTML = `
      <label class="theme-switch-wrapper" style="gap: var(--space-2);">
        <div class="theme-switch__label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          Cambiar tema
        </div>
        <div class="theme-switch" id="navbar-theme-switch-btn-2" aria-hidden="true"></div>
      </label>
    `;
    (applicationsBtn || favoritesBtn || offersBtn || profileBtn)?.insertAdjacentElement("afterend", themeToggleBtn);
  }

  // Enforce final dropdown order for both injected and cached navbars.
  if (userDropdown && profileBtn && empresaPanelBtn) {
    profileBtn.insertAdjacentElement("afterend", empresaPanelBtn);
  }
  if (userDropdown && empresaPanelBtn && offersBtn) {
    empresaPanelBtn.insertAdjacentElement("afterend", offersBtn);
  }
  if (userDropdown && profileBtn && offersBtn && !empresaPanelBtn) {
    profileBtn.insertAdjacentElement("afterend", offersBtn);
  }
  if (userDropdown && offersBtn && favoritesBtn) {
    offersBtn.insertAdjacentElement("afterend", favoritesBtn);
  }
  if (userDropdown && favoritesBtn && applicationsBtn) {
    favoritesBtn.insertAdjacentElement("afterend", applicationsBtn);
  }
  if (userDropdown && applicationsBtn && themeToggleBtn) {
    applicationsBtn.insertAdjacentElement("afterend", themeToggleBtn);
  }

  let logoutBtn = document.getElementById("navbar-logout-btn") || userMenu.querySelector("#navbar-logout-btn");
  if (!logoutBtn && userDropdown) {
    logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "user-dropdown__item text-error";
    logoutBtn.id = "navbar-logout-btn";
    logoutBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      <span>Cerrar sesión</span>
    `;
    (themeToggleBtn || applicationsBtn || favoritesBtn || offersBtn || profileBtn)?.insertAdjacentElement("afterend", logoutBtn);
  }

  // Ensure the logout item is visually separated like the company dashboard dropdown.
  // Some older cached navbar.html versions may not include the divider, so we enforce it here.
  if (userDropdown && logoutBtn) {
    const existingDividerBeforeLogout = logoutBtn.previousElementSibling?.classList?.contains("divider")
      ? logoutBtn.previousElementSibling
      : null;

    if (!existingDividerBeforeLogout) {
      const divider = document.createElement("div");
      divider.className = "divider";
      logoutBtn.insertAdjacentElement("beforebegin", divider);
    }
  }
  ensureButtonLabel(logoutBtn, "Cerrar sesión");
}

function updateNavbarActions() {
  const actions = document.querySelector(".navbar__actions");
  if (!actions) return;

  const user = getCurrentUser();
  const publicThemeToggle = document.getElementById("navbar-public-theme-toggle");
  const loginBtn = document.getElementById("navbar-login-btn");
  const registerBtn = document.getElementById("navbar-register-btn");
  const dashboardBtn = document.getElementById("navbar-dashboard-btn");
  const userMenu = document.getElementById("navbar-user-menu");

  // El cambio de tema vive dentro del dropdown del avatar.
  // Acá solo administramos qué acciones del navbar se muestran por rol.

  if (!user) {
    if (publicThemeToggle) publicThemeToggle.style.display = "";
    // No hay usuario: mostrar login/register, ocultar menu
    if (loginBtn) loginBtn.style.display = "";
    if (registerBtn) registerBtn.style.display = "";
    if (dashboardBtn) dashboardBtn.hidden = true;
    if (userMenu) userMenu.hidden = true;
    return;
  }

  if (publicThemeToggle) publicThemeToggle.style.display = "none";

  // Hay usuario: ocultar login/register, mostrar menu para ambos
  if (loginBtn) loginBtn.style.display = "none";
  if (registerBtn) registerBtn.style.display = "none";
  if (dashboardBtn) dashboardBtn.hidden = true;

  if (userMenu) {
    userMenu.hidden = false;
    
    const isEmpresa = user.role === "empresa";
    const profileBtn = document.getElementById("navbar-profile-btn");
    const empresaPanelBtn = document.getElementById("navbar-empresa-panel-btn");
    const offersBtn = document.getElementById("navbar-offers-btn");
    const favoritesBtn = document.getElementById("navbar-favorites-btn");
    const applicationsBtn = document.getElementById("navbar-applications-btn");

    if (profileBtn) {
      profileBtn.style.display = isEmpresa ? "none" : "";
      ensureButtonLabel(profileBtn, "Mi perfil");
    }

    if (empresaPanelBtn) {
      empresaPanelBtn.style.display = isEmpresa ? "" : "none";
    }

    if (offersBtn) offersBtn.style.display = isEmpresa ? "none" : "";
    if (favoritesBtn) favoritesBtn.style.display = isEmpresa ? "none" : "";
    if (applicationsBtn) applicationsBtn.style.display = isEmpresa ? "none" : "";

    // Update user info
    const profile = isEmpresa ? null : getCandidateProfile(user.email);
    let displayName = profile?.fullName || user.fullName || user.email;
    if (isEmpresa) {
        try {
            const savedRaw = localStorage.getItem(`ApplyAI.perfilEmpresa_${user.email}`);
            if (savedRaw) {
               const saved = JSON.parse(savedRaw);
               if (saved.nombre) displayName = saved.nombre;
            }
        } catch(e){}
    }
    const initials = initialsFromName(displayName);
    
    const nameEl = document.getElementById("navbar-user-name");
    const locationEl = document.getElementById("navbar-user-location");
    const emailEl = document.getElementById("navbar-user-email");
    const avatarEl = document.getElementById("navbar-user-avatar");
    const avatarImgEl = document.getElementById("navbar-user-avatar-img");
    const avatarFallbackEl = document.getElementById("navbar-user-avatar-fallback");
    
    if (nameEl) nameEl.textContent = displayName;

    const locationText = String(profile?.location || "").trim();
    if (locationEl) {
      if (locationText) {
        locationEl.textContent = locationText;
        locationEl.hidden = false;
      } else {
        locationEl.textContent = "—";
        locationEl.hidden = true;
      }
    }

    if (emailEl) emailEl.textContent = user.email;

    if (avatarFallbackEl) avatarFallbackEl.textContent = initials;

    const photoDataUrl = String(profile?.photoDataUrl || "").trim();
    if (photoDataUrl && avatarEl && avatarImgEl) {
      avatarImgEl.src = photoDataUrl;
      avatarImgEl.hidden = false;
      if (avatarFallbackEl) avatarFallbackEl.hidden = true;

      // Match the crop/pan behavior from the candidate profile editor.
      applyPhotoPan(avatarImgEl, avatarEl, getPhotoPan(profile), 1.18);
    } else {
      if (avatarImgEl) {
        avatarImgEl.hidden = true;
        avatarImgEl.removeAttribute("src");
        clearPhotoPan(avatarImgEl);
      }
      if (avatarFallbackEl) avatarFallbackEl.hidden = false;
    }
  }
}

function initNavbarDashboardButton() {
  const dashboardBtn = document.getElementById("navbar-dashboard-btn");
  if (!dashboardBtn) return;

  if (dashboardBtn.dataset.initialized === "true") return;
  dashboardBtn.dataset.initialized = "true";

  dashboardBtn.addEventListener("click", () => {
    window.location.href = resolvePathForContext("pages/empresa/dashboard-empresa.html");
  });
}

async function loadComponent(url, placeholderId) {
  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) return;

  try {
    const cacheBustedUrl = url.includes("?") ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`;
    const res = await fetch(cacheBustedUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
    placeholder.outerHTML = await res.text();
  } catch (err) {
    console.warn("[ApplyAI] componente no encontrado:", url, err);
  }
}

function initNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  if (!isLanding) {
    navbar.classList.add("solid");
    return;
  }

  const onScroll = () => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function markActiveLink() {
  const currentPath = window.location.pathname;
  const links = document.querySelectorAll(".navbar__actions a");

  links.forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    if (linkPath === currentPath) {
      link.classList.add("active");
    }
  });
}

function initNavbarUserDropdown() {
  const userBtn = document.getElementById("navbar-user-btn");
  const userDropdown = document.getElementById("navbar-user-dropdown");
  const profileBtn = document.getElementById("navbar-profile-btn");
  const empresaPanelBtn = document.getElementById("navbar-empresa-panel-btn");
  const offersBtn = document.getElementById("navbar-offers-btn");
  const applicationsBtn = document.getElementById("navbar-applications-btn");
  const favoritesBtn = document.getElementById("navbar-favorites-btn");
  const themeToggleBtn = document.getElementById("navbar-theme-toggle-btn");
  const logoutBtn = document.getElementById("navbar-logout-btn");

  if (!userBtn || !userDropdown) return;

  // Toggle dropdown
  userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("show");
    userBtn.setAttribute("aria-expanded", userDropdown.classList.contains("show"));
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    userDropdown.classList.remove("show");
    userBtn.setAttribute("aria-expanded", "false");
  });

  // Prevent closing when clicking inside dropdown
  userDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Profile button (Candidato)
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = resolvePathForContext("pages/candidato/perfil-candidato.html");
    });
  }

  // Panel button (Empresa)
  if (empresaPanelBtn) {
    empresaPanelBtn.addEventListener("click", () => {
      window.location.href = resolvePathForContext("pages/empresa/dashboard-empresa.html");
    });
  }

  // Ofertas laborales
  if (offersBtn) {
    offersBtn.addEventListener("click", () => {
      window.location.href = resolvePathForContext("pages/candidato/dashboard-candidato.html");
    });
  }

  // Mis postulaciones
  if (applicationsBtn) {
    applicationsBtn.addEventListener("click", () => {
      window.location.href = resolvePathForContext("pages/candidato/mis-postulaciones.html");
    });
  }

  // Mis empresas favoritas
  if (favoritesBtn) {
    favoritesBtn.addEventListener("click", () => {
      window.location.href = resolvePathForContext("pages/candidato/mis-empresas-favoritas.html");
    });
  }

  // Theme toggle (inside avatar dropdown)
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof window.toggleTheme === "function") {
        window.toggleTheme();
      }
    });
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (typeof handleGlobalLogout === "function") {
        handleGlobalLogout();
      } else {
        localStorage.removeItem("ApplyAI.currentUser");
        window.location.href = resolvePathForContext("index.html");
      }
    });
  }
}

function rewriteInjectedComponentLinks() {
  if (!isInPagesDir()) return;

  const anchors = document.querySelectorAll('#navbar a[href], .footer a[href]');

  anchors.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;

    const trimmed = href.trim();
    if (!trimmed) return;

    // Ignore external/special links.
    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('./') ||
      trimmed.startsWith('../') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:')
    ) {
      return;
    }

    // For pages under /pages/, make relative routes point one level up.
    a.setAttribute('href', resolvePathForContext(trimmed));
  });
}

async function init() {
  await loadComponent(resolvePathForContext("components/navbar.html"), "navbar-placeholder");
  await loadComponent(resolvePathForContext("components/footer.html"), "footer-placeholder");

  initNavbar();
  rewriteInjectedComponentLinks();
  ensureNavbarDom();
  updateNavbarActions();
  initNavbarUserDropdown();
  initNavbarDashboardButton();
  markActiveLink();
}

document.addEventListener("DOMContentLoaded", init);
