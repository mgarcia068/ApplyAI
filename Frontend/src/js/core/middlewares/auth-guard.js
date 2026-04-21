(function () {
  const STORAGE_KEYS = { currentUser: 'ApplyAI.currentUser' };

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

  const currentUserJSON = localStorage.getItem(STORAGE_KEYS.currentUser);
  const currentUser = currentUserJSON ? JSON.parse(currentUserJSON) : null;
  const isAuth = !!currentUser;
  
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
        const dashboard = currentUser.role === 'empresa' 
          ? 'pages/empresa/dashboard-empresa.html' 
          : 'pages/candidato/dashboard-candidato.html';
        window.location.replace(resolvePathForContext(dashboard));
        return;
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
