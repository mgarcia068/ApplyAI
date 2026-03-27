(function () {
  function initSignupValidation() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    const alertEl = document.getElementById('signupAlert');

    let hasAttemptedSubmit = false;
    if (alertEl) alertEl.hidden = true;

    const fullName = document.getElementById('fullName');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    const errors = {
      fullName: document.getElementById('fullNameError'),
      email: document.getElementById('emailError'),
      password: document.getElementById('passwordError'),
      confirmPassword: document.getElementById('confirmPasswordError'),
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

      const fullNameValue = (fullName?.value || '').trim();
      hasAnyError =
        setFieldError(
          fullName,
          errors.fullName,
          fullNameValue.length ? '' : 'Ingresá tu nombre completo.'
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
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSignupValidation);
  } else {
    initSignupValidation();
  }
})();
