(function () {
  const STORAGE_KEYS = {
    users: 'ApplyAI.users',
    currentUser: 'ApplyAI.currentUser',
  };

  function getDashboardForRole(role) {
    return role === 'empresa'
      ? 'pages/dashboard-empresa.html'
      : 'pages/dashboard-candidato.html';
  }

  function getGoogleClientIdFromMeta() {
    // Expected format:
    // <meta name="google-client-id" content="<client-id>.apps.googleusercontent.com" />
    const standardMeta = document.querySelector('meta[name="google-client-id"]');
    const standardValue = String(standardMeta?.getAttribute('content') || '').trim();
    if (standardValue) return standardValue;

    // Fallback: tolerate a common misconfiguration where the client id was pasted into `name`
    // and `content` was left empty.
    const misconfiguredMeta = document.querySelector('meta[name$=".apps.googleusercontent.com"]');
    const misconfiguredName = String(misconfiguredMeta?.getAttribute('name') || '').trim();
    if (misconfiguredName.endsWith('.apps.googleusercontent.com')) return misconfiguredName;

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

  function askRoleForGoogleUser() {
    const raw = prompt(
      'Vas a registrarte con Google. Escribí tu rol: candidato o empresa',
      'candidato'
    );

    if (!raw) return '';
    const normalized = normalizeRole(raw);
    if (normalized) return normalized;

    alert('Rol inválido. Usá "candidato" o "empresa".');
    return '';
  }

  function getRoleFromRegisterForm() {
    const checkedRole = document.querySelector('input[name="role"]:checked');
    if (checkedRole) return normalizeRole(checkedRole.value);

    // Backward compatibility (older markup used a <select id="accountRole">)
    const accountRole = document.getElementById('accountRole');
    return normalizeRole(accountRole?.value);
  }

  function setCurrentUserSession(user) {
    localStorage.setItem(
      STORAGE_KEYS.currentUser,
      JSON.stringify({
        email: user.email,
        role: normalizeRole(user.role),
        fullName: user.fullName,
        loggedInAt: new Date().toISOString(),
      })
    );
  }

  function upsertGoogleUserFromPayload(payload) {
    const email = String(payload?.email || '').trim().toLowerCase();
    const fullName = String(payload?.name || payload?.given_name || '').trim();

    if (!email) {
      throw new Error('No se pudo obtener el email desde Google.');
    }

    const users = getUsers();
    const existingUser = users.find((u) => (u?.email || '').toLowerCase() === email) || null;

    let role = normalizeRole(existingUser?.role);
    if (!role) {
      role = getRoleFromRegisterForm() || askRoleForGoogleUser();
    }

    if (!role) {
      return null;
    }

    const nextUser = {
      ...(existingUser || {}),
      role,
      fullName: fullName || existingUser?.fullName || email.split('@')[0],
      email,
      provider: 'google',
      // Don't wipe an existing password-based account.
      password: existingUser?.password || '',
      createdAt: existingUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    upsertUser(nextUser);
    return nextUser;
  }

  function handleGoogleCredentialResponse(response) {
    try {
      const credential = response?.credential;
      if (!credential) throw new Error('No se recibió credencial de Google.');

      const payload = decodeJwtPayload(credential);
      const user = upsertGoogleUserFromPayload(payload);
      if (!user) return;

      setCurrentUserSession(user);
      window.location.href = getDashboardForRole(normalizeRole(user.role));
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Ocurrió un error al iniciar sesión con Google.');
    }
  }

  function initGoogleIdentity(attempt) {
    const googleLoginButton = document.getElementById('googleLoginButton');
    const googleSignupButton = document.getElementById('googleSignupButton');

    if (!googleLoginButton && !googleSignupButton) return;

    const hintEl =
      document.getElementById('googleLoginHint') || document.getElementById('googleSignupHint');

    const clientId = getGoogleClientIdFromMeta();
    if (!clientId) {
      if (hintEl) hintEl.hidden = false;
      return;
    }

    const ready = Boolean(window.google && window.google.accounts && window.google.accounts.id);
    const nextAttempt = Number.isFinite(attempt) ? attempt + 1 : 1;
    if (!ready) {
      if (nextAttempt <= 10) {
        setTimeout(function () {
          initGoogleIdentity(nextAttempt);
        }, 200);
      }
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    const renderOptions = {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      width: 320,
    };

    if (googleLoginButton) {
      window.google.accounts.id.renderButton(googleLoginButton, {
        ...renderOptions,
        text: 'signin_with',
      });
    }

    if (googleSignupButton) {
      window.google.accounts.id.renderButton(googleSignupButton, {
        ...renderOptions,
        text: 'signup_with',
      });
    }
  }

  function normalizeRole(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'candidato' || normalized === 'cliente') return 'candidato';
    if (normalized === 'empresa') return 'empresa';
    return '';
  }

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function getUsers() {
    const raw = localStorage.getItem(STORAGE_KEYS.users);
    const parsed = raw ? safeJsonParse(raw, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function upsertUser(user) {
    const users = getUsers();
    const nextUsers = users.filter((u) => (u?.email || '').toLowerCase() !== user.email);
    nextUsers.push(user);
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
  }

  function initSignupValidation() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    const alertEl = document.getElementById('signupAlert');

    let hasAttemptedSubmit = false;
    if (alertEl) alertEl.hidden = true;

    const fullName = document.getElementById('fullName');
    const fullNameLabel = document.getElementById('fullNameLabel');
    const accountRole = document.getElementById('accountRole');
    const roleInputs = form.querySelectorAll('input[name="role"]');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    const errors = {
      accountRole: document.getElementById('accountRoleError'),
      fullName: document.getElementById('fullNameError'),
      email: document.getElementById('emailError'),
      password: document.getElementById('passwordError'),
      confirmPassword: document.getElementById('confirmPasswordError'),
    };

    function getRole() {
      const checked = form.querySelector('input[name="role"]:checked');
      if (checked) return normalizeRole(checked.value);
      return normalizeRole(accountRole?.value);
    }

    function applyRoleUI(role) {
      if (!fullName) return;

      const isCompany = role === 'empresa';
      if (fullNameLabel) {
        fullNameLabel.textContent = isCompany ? 'Nombre de la empresa' : 'Nombre completo';
      }

      fullName.placeholder = isCompany ? 'Nombre de tu empresa' : 'Tu nombre y apellido';
      fullName.autocomplete = isCompany ? 'organization' : 'name';
    }

    // Preselección por querystring (?rol=candidato|empresa)
    try {
      const qsRole = normalizeRole(new URLSearchParams(window.location.search).get('rol'));
      if (qsRole) {
        const radio = form.querySelector('input[name="role"][value="' + qsRole + '"]');
        if (radio) radio.checked = true;
        else if (accountRole) accountRole.value = qsRole;
      }
    } catch (_) {
      // ignore
    }

    applyRoleUI(getRole());
    if (roleInputs && roleInputs.length) {
      roleInputs.forEach(function (input) {
        input.addEventListener('change', function () {
          applyRoleUI(getRole());
          if (hasAttemptedSubmit) validate({ showAlert: true });
        });
      });
    } else if (accountRole) {
      accountRole.addEventListener('change', function () {
        applyRoleUI(getRole());
        if (hasAttemptedSubmit) validate({ showAlert: true });
      });
    }

    function setFieldError(inputEl, errorEl, message) {
      if (!inputEl || !errorEl) return false;

      if (message) {
        inputEl.classList.add('form-input--error');
        inputEl.setAttribute('aria-invalid', 'true');
        errorEl.textContent = message;
        return true;
      }

      inputEl.classList.remove('form-input--error');
      inputEl.removeAttribute('aria-invalid');
      errorEl.textContent = '';
      return false;
    }

    function setRoleError(message) {
      if (!accountRole || !errors.accountRole) return false;

      if (message) {
        accountRole.classList.add('form-input--error');
        accountRole.setAttribute('aria-invalid', 'true');
        errors.accountRole.textContent = message;
        return true;
      }

      accountRole.classList.remove('form-input--error');
      accountRole.removeAttribute('aria-invalid');
      errors.accountRole.textContent = '';
      return false;
    }

    function validate(options) {
      const showAlert = Boolean(options && options.showAlert);
      let hasAnyError = false;

      const roleValue = getRole();
      hasAnyError = setRoleError(roleValue ? '' : 'Seleccioná si sos candidato o empresa.') || hasAnyError;

      const fullNameValue = (fullName?.value || '').trim();
      const fullNameMessage = fullNameValue.length
        ? ''
        : roleValue === 'empresa'
          ? 'Ingresá el nombre de tu empresa.'
          : 'Ingresá tu nombre completo.';
      hasAnyError =
        setFieldError(
          fullName,
          errors.fullName,
          fullNameMessage
        ) || hasAnyError;

      let emailMessage = '';
      const emailValue = (email?.value || '').trim();
      if (!emailValue) emailMessage = 'Ingresá tu correo.';
      else if (email && !email.checkValidity()) emailMessage = 'Ingresá un correo válido.';
      hasAnyError = setFieldError(email, errors.email, emailMessage) || hasAnyError;

      let passwordMessage = '';
      const passwordValue = password?.value || '';
      if (!passwordValue) passwordMessage = 'Ingresá una contraseña.';
      else if (passwordValue.length < 8) passwordMessage = 'Mínimo 8 caracteres.';
      hasAnyError =
        setFieldError(password, errors.password, passwordMessage) || hasAnyError;

      let confirmMessage = '';
      const confirmValue = confirmPassword?.value || '';
      if (!confirmValue) confirmMessage = 'Confirmá tu contraseña.';
      else if (confirmValue !== passwordValue) confirmMessage = 'Las contraseñas no coinciden.';
      hasAnyError =
        setFieldError(confirmPassword, errors.confirmPassword, confirmMessage) || hasAnyError;

      if (alertEl && (showAlert || hasAttemptedSubmit)) {
        alertEl.hidden = !hasAnyError;
      }
      return !hasAnyError;
    }

    form.addEventListener('submit', function (e) {
      hasAttemptedSubmit = true;

      if (!validate({ showAlert: true })) {
        e.preventDefault();
        const firstInvalid = form.querySelector('.form-input--error');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      e.preventDefault();
      if (alertEl) alertEl.hidden = true;

      // Persistencia mínima (sin backend): guarda el rol para diferenciar perfiles.
      const user = {
        role: getRole(),
        fullName: (fullName?.value || '').trim(),
        email: (email?.value || '').trim().toLowerCase(),
        password: password?.value || '',
        createdAt: new Date().toISOString(),
      };

      try {
        upsertUser(user);
      } catch (_) {
        // ignore
      }

      window.location.href = 'login.html';
    });
  }

  function initLoginValidation() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const alertEl = document.getElementById('loginAlert');
    let hasAttemptedSubmit = false;
    if (alertEl) alertEl.hidden = true;

    const email = document.getElementById('email');
    const password = document.getElementById('password');

    const errors = {
      email: document.getElementById('emailError'),
      password: document.getElementById('passwordError'),
    };

    function setFieldError(inputEl, errorEl, message) {
      if (!inputEl || !errorEl) return false;

      if (message) {
        inputEl.classList.add('form-input--error');
        inputEl.setAttribute('aria-invalid', 'true');
        errorEl.textContent = message;
        return true;
      }

      inputEl.classList.remove('form-input--error');
      inputEl.removeAttribute('aria-invalid');
      errorEl.textContent = '';
      return false;
    }

    function validate(options) {
      const showAlert = Boolean(options && options.showAlert);
      let hasAnyError = false;

      let emailMessage = '';
      const emailValue = (email?.value || '').trim();
      if (!emailValue) emailMessage = 'Ingresá tu correo.';
      else if (email && !email.checkValidity()) emailMessage = 'Ingresá un correo válido.';
      hasAnyError = setFieldError(email, errors.email, emailMessage) || hasAnyError;

      const passwordValue = password?.value || '';
      const passwordMessage = passwordValue ? '' : 'Ingresá tu contraseña.';
      hasAnyError =
        setFieldError(password, errors.password, passwordMessage) || hasAnyError;

      if (alertEl && (showAlert || hasAttemptedSubmit)) {
        alertEl.hidden = true;
      }

      return !hasAnyError;
    }

    form.addEventListener('submit', function (e) {
      hasAttemptedSubmit = true;

      if (!validate({ showAlert: true })) {
        e.preventDefault();
        const firstInvalid = form.querySelector('.form-input--error');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      e.preventDefault();

      const emailValue = (email?.value || '').trim().toLowerCase();
      const passwordValue = password?.value || '';

      let user = null;
      try {
        user = getUsers().find((u) => (u?.email || '').toLowerCase() === emailValue) || null;
      } catch (_) {
        user = null;
      }

      const isPasswordOk = Boolean(user && String(user.password || '') === String(passwordValue));

      if (!user) {
        setFieldError(email, errors.email, 'No existe una cuenta con ese correo.');
      }

      if (user && !isPasswordOk) {
        setFieldError(password, errors.password, 'La contraseña no es correcta.');
      }

      if (!user || !isPasswordOk) {
        if (alertEl) alertEl.hidden = false;
        return;
      }

      try {
        setCurrentUserSession(user);
      } catch (_) {
        // ignore
      }

      const role = normalizeRole(user.role);
      window.location.href = getDashboardForRole(role);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSignupValidation();
      initLoginValidation();
      initGoogleIdentity(0);
    });
  } else {
    initSignupValidation();
    initLoginValidation();
    initGoogleIdentity(0);
  }
})();
