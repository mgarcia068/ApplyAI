(function () {
  const STORAGE_KEYS = { currentUser: 'ApplyAI.currentUser' };

  const API_BASE_URL = `${window.APP_CONFIG.API_URL}/api`;

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function normalizeRole(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'candidato' || normalized === 'candidate' || normalized === 'candidate_role') return 'candidato';
    if (normalized === 'empresa' || normalized === 'company' || normalized === 'company_role') return 'empresa';
    return '';
  }

  function decodeJwtPayload(jwt) {
    const parts = String(jwt || '').split('.');
    if (parts.length < 2) throw new Error('Token inválido.');

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(json);
  }

  function isJwtExpired(jwt, leewayMs) {
    const leeway = Number.isFinite(leewayMs) ? leewayMs : 0;
    const payload = decodeJwtPayload(jwt);
    const exp = Number(payload?.exp);
    if (!Number.isFinite(exp)) return false;
    return Date.now() >= exp * 1000 - leeway;
  }

  function getValidSession() {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (!raw) return null;

    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object') return null;

    const token = String(parsed.token || parsed.accessToken || parsed.access_token || '').trim();
    if (!token || token === 'null' || token === 'undefined') return null;

    const role = normalizeRole(parsed.role);
    if (!role) return null;

    try {
      if (isJwtExpired(token, 30000)) return null;
    } catch (_) {
      return null;
    }

    return { ...parsed, token, role };
  }

  async function validateSessionWithApi(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.ok;
    } catch (_) {
      return false;
    }
  }

  function getPagesNestingDepth() {
    const marker = '/pages/';
    const pathname = window.location.pathname;
    const markerIndex = pathname.lastIndexOf(marker);
    if (markerIndex === -1) return 0;
    const rest = pathname.slice(markerIndex + marker.length);
    const segments = rest.split('/').filter(Boolean);
    return segments.length || 1;
  }

  function getRootPrefix() {
    const depth = getPagesNestingDepth();
    return depth > 0 ? '../'.repeat(depth) : '';
  }

  function resolvePathForContext(pathFromRoot) {
    return `${getRootPrefix()}${pathFromRoot}`;
  }

  const currentUser = getValidSession();
  const isAuth = !!currentUser;

  // Limpia sesiones inválidas/stale para evitar redirects incorrectos.
  if (!isAuth && localStorage.getItem(STORAGE_KEYS.currentUser)) {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
  }
  
  const path = window.location.pathname;
  
  // Public routes
  const isIndex = path.endsWith('/') || path.endsWith('index.html') || path.endsWith('candidato.html') || path.endsWith('login.html') || path.endsWith('register.html'); // Added backward comp redirect files
  const isLogin = path.includes('pages/auth/login.html');
  const isRegister = path.includes('pages/auth/register.html');
  const isAuthPage = isLogin || isRegister;
  
  // Role checks
  const isCandidatoPage = path.includes('pages/candidato/') && !path.includes('dashboard-candidato.html');
  const isEmpresaPage = path.includes('pages/empresa/') && !path.includes('perfil-empresa-publico.html');

  if (!isAuth) {
    // If NOT authenticated
    if (!isIndex && !isAuthPage) {
      window.location.replace(resolvePathForContext('pages/auth/login.html'));
      return;
    }
  } else {
    // If Authenticated
    if (isAuthPage) {
      // Antes de redirigir fuera de login/register, validamos el token con el backend.
      // Esto evita quedar atrapado en un redirect si quedó un token viejo/invalidado.
      validateSessionWithApi(currentUser.token).then((ok) => {
        if (!ok) {
          localStorage.removeItem(STORAGE_KEYS.currentUser);
          return;
        }

        const dashboard = currentUser.role === 'empresa'
          ? 'pages/empresa/dashboard-empresa.html'
          : 'pages/candidato/dashboard-candidato.html';
        window.location.replace(resolvePathForContext(dashboard));
      });
      return;
    }

    // En páginas protegidas, si el token ya no es válido, limpiamos sesión y volvemos a login.
    if (!isIndex && !isAuthPage) {
      validateSessionWithApi(currentUser.token).then((ok) => {
        if (ok) return;
        localStorage.removeItem(STORAGE_KEYS.currentUser);
        window.location.replace(resolvePathForContext('pages/auth/login.html'));
      });
    }
    
    // Check Authorization bounds (candidato can't visit empresa and vice versa)
    if (isCandidatoPage && currentUser.role !== 'candidato') {
      window.location.replace(resolvePathForContext('pages/empresa/dashboard-empresa.html'));
      return;
    }
    if (isEmpresaPage && currentUser.role !== 'empresa') {
      window.location.replace(resolvePathForContext('pages/candidato/dashboard-candidato.html'));
      return;
    }
  }
})();
