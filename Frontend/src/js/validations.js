(function () {
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
    const key = 'talentiq.users';
    const raw = localStorage.getItem(key);
    const parsed = raw ? safeJsonParse(raw, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function upsertUser(user) {
    const key = 'talentiq.users';
    const users = getUsers();
    const nextUsers = users.filter((u) => (u?.email || '').toLowerCase() !== user.email);
    nextUsers.push(user);
    localStorage.setItem(key, JSON.stringify(nextUsers));
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
      if (accountRole && qsRole) accountRole.value = qsRole;
    } catch (_) {
      // ignore
    }

    applyRoleUI(getRole());
    if (accountRole) {
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

    function validate(options) {
      const showAlert = Boolean(options && options.showAlert);
      let hasAnyError = false;

      const roleValue = getRole();
      hasAnyError =
        setFieldError(
          accountRole,
          errors.accountRole,
          roleValue ? '' : 'Seleccioná si sos candidato o empresa.'
        ) || hasAnyError;

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

    function getDashboardForRole(role) {
      return role === 'empresa' ? 'dashboard-empresa.html' : 'dashboard-candidato.html';
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
        localStorage.setItem(
          'talentiq.currentUser',
          JSON.stringify({
            email: user.email,
            role: normalizeRole(user.role),
            fullName: user.fullName,
            loggedInAt: new Date().toISOString(),
          })
        );
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
    });
  } else {
    initSignupValidation();
    initLoginValidation();
  }
})();
