// USO: agregar en cada HTML, antes del cierre de </body>:
//   <div id="navbar-placeholder"></div>   ← al inicio del body
//   <div id="footer-placeholder"></div>   ← al final del body
//   <script src="js/components.js"></script>

const isLanding =
  window.location.pathname === "/" ||
  window.location.pathname.endsWith("index.html");

function isInPagesDir() {
  return window.location.pathname.includes("/pages/");
}

function resolvePathForContext(pathFromRoot) {
  // pathFromRoot is relative to Frontend/src (e.g. 'login.html', 'pages/dashboard-candidato.html')
  // If we're currently inside Frontend/src/pages, we need to go up one level.
  return isInPagesDir() ? `../${pathFromRoot}` : pathFromRoot;
}

function resolvePagePath(pageFileName) {
  // For pages that live inside Frontend/src/pages/
  // - from root pages: 'pages/<file>'
  // - from pages dir: '<file>'
  return isInPagesDir() ? pageFileName : `pages/${pageFileName}`;
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
          <div class="user-dropdown__email" id="navbar-user-email">—</div>
        </div>
        <div class="divider"></div>
        <button class="user-dropdown__item" id="navbar-profile-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Mi perfil</span>
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

  const emailEl = document.getElementById("navbar-user-email") || userMenu.querySelector(".user-dropdown__email") || userMenu.querySelector(".navbar-user-dropdown__email");
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

  let applicationsBtn = document.getElementById("navbar-applications-btn") || userMenu.querySelector("#navbar-applications-btn");
  if (!applicationsBtn && userDropdown) {
    // Insert after profile.
    applicationsBtn = document.createElement("button");
    applicationsBtn.type = "button";
    applicationsBtn.className = "user-dropdown__item";
    applicationsBtn.id = "navbar-applications-btn";
    applicationsBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <span>Mis postulaciones</span>
    `;
    profileBtn?.insertAdjacentElement("afterend", applicationsBtn);
  }
  ensureButtonLabel(applicationsBtn, "Mis postulaciones");

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
    (applicationsBtn || profileBtn)?.insertAdjacentElement("afterend", themeToggleBtn);
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
    themeToggleBtn?.insertAdjacentElement("afterend", logoutBtn);
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

  // Hay usuario: ocultar login/register, mostrar menu si es candidato
  if (loginBtn) loginBtn.style.display = "none";
  if (registerBtn) registerBtn.style.display = "none";

  if (user.role === "candidato") {
    if (dashboardBtn) dashboardBtn.hidden = true;
    // Show user dropdown
    if (userMenu) {
      userMenu.hidden = false;
      
      // Update user info
      const profile = getCandidateProfile(user.email);
      const displayName = profile?.fullName || user.fullName || user.email;
      const initials = initialsFromName(displayName);
      
      const nameEl = document.getElementById("navbar-user-name");
      const emailEl = document.getElementById("navbar-user-email");
      const avatarEl = document.getElementById("navbar-user-avatar");
      const avatarImgEl = document.getElementById("navbar-user-avatar-img");
      const avatarFallbackEl = document.getElementById("navbar-user-avatar-fallback");
      
      if (nameEl) nameEl.textContent = displayName;
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
    return;
  }

  // empresa
  if (userMenu) userMenu.hidden = true;
  if (dashboardBtn) dashboardBtn.hidden = false;
}

function initNavbarDashboardButton() {
  const dashboardBtn = document.getElementById("navbar-dashboard-btn");
  if (!dashboardBtn) return;

  if (dashboardBtn.dataset.initialized === "true") return;
  dashboardBtn.dataset.initialized = "true";

  dashboardBtn.addEventListener("click", () => {
    window.location.href = resolvePagePath("dashboard-empresa.html");
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
  const applicationsBtn = document.getElementById("navbar-applications-btn");
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

  // Profile button
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = resolvePathForContext("perfil-candidato.html");
    });
  }

  // Applications button
  if (applicationsBtn) {
    applicationsBtn.addEventListener("click", () => {
      window.location.href = resolvePagePath("dashboard-candidato.html");
    });
  }

  // Theme toggle (inside avatar dropdown)
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      if (typeof window.toggleTheme === "function") {
        window.toggleTheme();
      }
    });
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("ApplyAI.currentUser");
      window.location.href = resolvePathForContext("index.html");
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
