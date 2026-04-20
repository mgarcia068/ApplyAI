(function () {
  const PROFILE_VERSION = 1;

  const PHOTO_EDITOR_SCALE = 1.18;

  const STORAGE_KEYS = {
    currentUser: 'ApplyAI.currentUser',
    profilePrefix: 'ApplyAI.candidateProfile:',
  };

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function normalizeRole(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'candidato' || normalized === 'cliente') return 'candidato';
    if (normalized === 'empresa') return 'empresa';
    return '';
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (!raw) return null;
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      email: String(parsed.email || '').trim().toLowerCase(),
      role: normalizeRole(parsed.role),
      fullName: String(parsed.fullName || '').trim(),
    };
  }

  function getProfileStorageKey(email) {
    return `${STORAGE_KEYS.profilePrefix}${String(email || '').trim().toLowerCase()}`;
  }

  function getCandidateProfile(email) {
    const key = getProfileStorageKey(email);
    const raw = localStorage.getItem(key);
    const parsed = raw ? safeJsonParse(raw, null) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== PROFILE_VERSION) return parsed; // tolerante a migraciones futuras
    return parsed;
  }

  function saveCandidateProfile(email, profile) {
    const key = getProfileStorageKey(email);
    localStorage.setItem(key, JSON.stringify(profile));
  }

  function initialsFromName(name) {
    const clean = String(name || '').trim();
    if (!clean) return '?';

    const parts = clean
      .split(/\s+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const first = parts[0]?.[0] || '';
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';

    const result = (first + second).toUpperCase();
    return result || '?';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
  }

  function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : String(value);
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
    imgEl.style.removeProperty('--photo-pan-x');
    imgEl.style.removeProperty('--photo-pan-y');
    imgEl.style.removeProperty('--photo-pan-scale');
  }

  function applyPhotoPan(imgEl, viewportEl, pan, scale) {
    if (!imgEl || !viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    const maxX = ((scale || 1) - 1) * rect.width * 0.5;
    const maxY = ((scale || 1) - 1) * rect.height * 0.5;
    const xN = clampNumber(pan?.x, -1, 1);
    const yN = clampNumber(pan?.y, -1, 1);

    const tx = maxX ? xN * maxX : 0;
    const ty = maxY ? yN * maxY : 0;

    imgEl.style.setProperty('--photo-pan-x', `${tx}px`);
    imgEl.style.setProperty('--photo-pan-y', `${ty}px`);
    imgEl.style.setProperty('--photo-pan-scale', String(scale || 1));
  }

  function init() {
    const alertEl = document.getElementById('profileAlert');

    const logoutBtn = document.getElementById('logoutBtn');

    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmModalOverlay = document.getElementById('confirmModalOverlay');

    let confirmResolve = null;
    let confirmLastActiveEl = null;

    function isConfirmOpen() {
      return Boolean(confirmModal && !confirmModal.hidden);
    }

    function closeConfirmModal(result) {
      if (!confirmModal) return;

      confirmModal.hidden = true;
      confirmModal.setAttribute('aria-hidden', 'true');

      const resolve = confirmResolve;
      confirmResolve = null;

      if (confirmLastActiveEl && typeof confirmLastActiveEl.focus === 'function') {
        confirmLastActiveEl.focus();
      }
      confirmLastActiveEl = null;

      if (typeof resolve === 'function') {
        resolve(Boolean(result));
      }
    }

    function confirmWithModal(options) {
      const title = String(options?.title || '¿Estás seguro?');
      const message = String(options?.message || 'Esta acción no se puede deshacer.');
      const confirmText = String(options?.confirmText || 'Confirmar');

      if (!confirmModal || !confirmOkBtn || !confirmCancelBtn) {
        return Promise.resolve(window.confirm(message));
      }

      if (isConfirmOpen()) {
        // Si hay una confirmación abierta, cancelarla y abrir la nueva.
        closeConfirmModal(false);
      }

      confirmLastActiveEl = document.activeElement;

      if (confirmTitle) confirmTitle.textContent = title;
      if (confirmMessage) confirmMessage.textContent = message;
      confirmOkBtn.textContent = confirmText;

      confirmModal.hidden = false;
      confirmModal.setAttribute('aria-hidden', 'false');

      // Focus inicial
      confirmCancelBtn.focus();

      return new Promise((resolve) => {
        confirmResolve = resolve;
      });
    }

    function initConfirmModalOnce() {
      if (!confirmModal) return;
      if (confirmModal.dataset.initialized === 'true') return;
      confirmModal.dataset.initialized = 'true';

      if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', function () {
          closeConfirmModal(false);
        });
      }

      if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', function () {
          closeConfirmModal(true);
        });
      }

      if (confirmModalOverlay) {
        confirmModalOverlay.addEventListener('click', function () {
          closeConfirmModal(false);
        });
      }

      window.addEventListener('keydown', function (e) {
        if (!isConfirmOpen()) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          closeConfirmModal(false);
        }
      });
    }

    const form = document.getElementById('candidateProfileForm');
    if (!form) return;

    const currentUser = getCurrentUser();
    const isAllowed = Boolean(currentUser && currentUser.email && currentUser.role === 'candidato');

    if (logoutBtn) {
      logoutBtn.hidden = !isAllowed;
      logoutBtn.addEventListener('click', function () {
        if (typeof handleGlobalLogout === 'function') {
          handleGlobalLogout();
        } else {
          try {
            localStorage.removeItem(STORAGE_KEYS.currentUser);
          } catch (_) {
            // ignore
          }
          window.location.href = 'index.html';
        }
      });
    }

    if (alertEl) alertEl.hidden = isAllowed;

    const fullName = document.getElementById('fullName');
    const fullNameError = document.getElementById('fullNameError');

    const email = document.getElementById('email');

    const headline = document.getElementById('headline');
    const location = document.getElementById('location');
    const phone = document.getElementById('phone');
    const about = document.getElementById('about');

    const photoInput = document.getElementById('profilePhoto');
    const photoError = document.getElementById('profilePhotoError');
    const removePhotoBtn = document.getElementById('removePhotoBtn');

    const cvInput = document.getElementById('cvFile');
    const cvError = document.getElementById('cvFileError');
    const cvInfo = document.getElementById('cvInfo');
    const cvFileName = document.getElementById('cvFileName');
    const cvUpdatedAt = document.getElementById('cvUpdatedAt');
    const cvViewLink = document.getElementById('cvViewLink');
    const removeCvBtn = document.getElementById('removeCvBtn');
    const cvAiUploadHint = document.getElementById('cvAiUploadHint');

    const cvAiScoreRing = document.getElementById('cvAiScoreRing');
    const cvAiOverallScore = document.getElementById('cvAiOverallScore');
    const cvAiScoreLabel = document.getElementById('cvAiScoreLabel');
    const cvAiInsight = document.getElementById('cvAiInsight');
    const cvAiClarityValue = document.getElementById('cvAiClarityValue');
    const cvAiSkillsValue = document.getElementById('cvAiSkillsValue');
    const cvAiExperienceValue = document.getElementById('cvAiExperienceValue');
    const cvAiClarityFill = document.getElementById('cvAiClarityFill');
    const cvAiSkillsFill = document.getElementById('cvAiSkillsFill');
    const cvAiExperienceFill = document.getElementById('cvAiExperienceFill');
    const cvAiStatus = document.getElementById('cvAiStatus');
    const runCvAiEvalBtn = document.getElementById('runCvAiEvalBtn');

    const avatarPreview = document.getElementById('avatarPreview');
    const avatarFallback = document.getElementById('avatarFallback');
    const avatarInitials = document.getElementById('avatarInitials');

    const avatarContainer = document.getElementById('profileAvatar');

    const photoCropModal = document.getElementById('photoCropModal');
    const photoEditorViewport = document.getElementById('photoEditorViewport');
    const photoEditorImg = document.getElementById('photoEditorImg');
    const photoCropCancelBtn = document.getElementById('photoCropCancelBtn');
    const photoCropSaveBtn = document.getElementById('photoCropSaveBtn');

    const photoUploadLabel = photoInput ? photoInput.closest('label.form-file') : null;
    const cvUploadLabel = cvInput ? cvInput.closest('label.form-file') : null;

    function hasPhoto(profile) {
      return Boolean(profile && String(profile.photoDataUrl || '').trim());
    }

    function hasCv(profile) {
      return Boolean(profile && String(profile.cvDataUrl || '').trim());
    }

    const CV_AI_KEYWORDS = [
      'javascript',
      'typescript',
      'react',
      'node',
      'python',
      'java',
      'sql',
      'aws',
      'docker',
      'qa',
      'testing',
      'scrum',
      'agile',
      'ux',
      'ui',
    ];

    function describeCvScore(score) {
      const safe = clampNumber(score, 0, 100);
      if (safe >= 85) return 'Excelente perfil';
      if (safe >= 70) return 'Perfil sólido';
      if (safe >= 55) return 'Buen potencial';
      return 'En desarrollo';
    }

    function scoreBand(score) {
      const safe = clampNumber(score, 0, 100);
      if (safe >= 75) return 'high';
      if (safe >= 55) return 'medium';
      return 'low';
    }

    function scoreRingPalette(score) {
      const band = scoreBand(score);
      if (band === 'high') {
        return {
          band,
          start: '#22c55e',
          end: '#14b8a6',
        };
      }
      if (band === 'medium') {
        return {
          band,
          start: '#f59e0b',
          end: '#f97316',
        };
      }
      return {
        band,
        start: '#ef4444',
        end: '#ec4899',
      };
    }

    function buildCvAiInsight(evaluation) {
      if (!evaluation) return 'Sin datos de evaluación todavía.';

      const metrics = [
        { key: 'clarity', label: 'claridad', value: Number(evaluation.clarity || 0) },
        { key: 'skills', label: 'habilidades', value: Number(evaluation.skills || 0) },
        { key: 'experience', label: 'experiencia', value: Number(evaluation.experience || 0) },
      ];

      const strongest = metrics.slice().sort((a, b) => b.value - a.value)[0];
      const weakest = metrics.slice().sort((a, b) => a.value - b.value)[0];
      const overall = clampNumber(Number(evaluation.overall || 0), 0, 100);

      if (overall >= 75) {
        return `Tu CV muestra muy buen nivel general. Tu punto más fuerte es ${strongest.label}; para subir aún más, reforzá ${weakest.label} con ejemplos concretos y resultados.`;
      }

      if (overall >= 55) {
        return `Tu perfil tiene buena base, especialmente en ${strongest.label}. El mayor salto ahora está en ${weakest.label}: sumá logros medibles, tecnologías usadas y contexto.`;
      }

      return `La base del CV todavía es inicial. Empezá por mejorar ${weakest.label} y destacá mejor ${strongest.label} para que el perfil gane impacto en pocos segundos de lectura.`;
    }

    function setCvAiMetric(valueEl, fillEl, value) {
      const safe = Math.round(clampNumber(value, 0, 100));
      if (valueEl) valueEl.textContent = `${safe}/100`;
      if (fillEl) fillEl.style.width = `${safe}%`;
    }

    function countKeywordHits(text, keywords) {
      const lower = String(text || '').toLowerCase();
      return keywords.reduce((acc, keyword) => (lower.includes(keyword) ? acc + 1 : acc), 0);
    }

    function buildCvAiEvaluation(options = {}) {
      const withJitter = Boolean(options.withJitter);
      const profile = getCandidateProfile(userEmail) || {};

      const headlineText = String(headline?.value || profile.headline || '').trim();
      const aboutText = String(about?.value || profile.about || '').trim();
      const mergedText = `${headlineText} ${aboutText}`.trim();
      const hasUploadedCv = hasCv(profile);

      const keywordHits = countKeywordHits(mergedText, CV_AI_KEYWORDS);
      const yearsMatch = mergedText.match(/\b([0-2]?\d)\s*(años|anos|years?)\b/i);
      const years = yearsMatch ? clampNumber(Number(yearsMatch[1]), 0, 30) : 0;

      const clarityBase = 36 + Math.min(aboutText.length, 420) * 0.09 + (hasUploadedCv ? 18 : 0);
      const skillsBase = 32 + keywordHits * 6.5 + (headlineText ? 10 : 0) + (hasUploadedCv ? 12 : 0);
      const experienceBase = 30 + years * 3.1 + Math.min(aboutText.length, 380) * 0.05 + (hasUploadedCv ? 10 : 0);

      const jitter = () => (withJitter ? Math.floor(Math.random() * 9) - 4 : 0);

      const clarity = Math.round(clampNumber(clarityBase + jitter(), 0, 100));
      const skills = Math.round(clampNumber(skillsBase + jitter(), 0, 100));
      const experience = Math.round(clampNumber(experienceBase + jitter(), 0, 100));
      const overall = Math.round(clarity * 0.34 + skills * 0.36 + experience * 0.30);

      let status = hasUploadedCv
        ? 'Análisis visual generado en modo demo IA.'
        : 'Análisis visual generado con la información de tu perfil.';

      if (!headlineText && !aboutText) {
        status = 'Completá título y descripción para obtener una evaluación más útil.';
      }

      return {
        clarity,
        skills,
        experience,
        overall,
        status,
      };
    }

    function renderCvAiEvaluation(evaluation) {
      if (!evaluation) return;

      const overall = Math.round(clampNumber(evaluation.overall, 0, 100));
      const palette = scoreRingPalette(overall);

      if (cvAiScoreRing) {
        cvAiScoreRing.style.setProperty('--cv-ai-score', String(overall));
        cvAiScoreRing.style.setProperty('--cv-ai-score-color-start', palette.start);
        cvAiScoreRing.style.setProperty('--cv-ai-score-color-end', palette.end);
        cvAiScoreRing.setAttribute('data-band', palette.band);
      }
      if (cvAiOverallScore) cvAiOverallScore.textContent = String(overall);
      if (cvAiScoreLabel) cvAiScoreLabel.textContent = describeCvScore(overall);
      if (cvAiInsight) cvAiInsight.textContent = buildCvAiInsight(evaluation);

      setCvAiMetric(cvAiClarityValue, cvAiClarityFill, evaluation.clarity);
      setCvAiMetric(cvAiSkillsValue, cvAiSkillsFill, evaluation.skills);
      setCvAiMetric(cvAiExperienceValue, cvAiExperienceFill, evaluation.experience);

      if (cvAiStatus) cvAiStatus.textContent = String(evaluation.status || 'Evaluación visual lista.');
    }

    function runCvAiEvaluationSimulation() {
      if (!runCvAiEvalBtn) return;

      runCvAiEvalBtn.disabled = true;
      runCvAiEvalBtn.textContent = 'Analizando...';
      if (cvAiStatus) cvAiStatus.textContent = 'Procesando CV con IA (demo visual)...';

      window.setTimeout(() => {
        renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: true }));
        runCvAiEvalBtn.disabled = false;
        runCvAiEvalBtn.textContent = 'Volver a analizar';
      }, 900);
    }

    function syncPhotoUi(profile) {
      const available = hasPhoto(profile);
      if (removePhotoBtn) removePhotoBtn.hidden = !available;
      // No other restriction on re-uploading photo.
      if (photoUploadLabel) photoUploadLabel.hidden = false;
    }

    function syncCvUi(profile) {
      const uploaded = hasCv(profile);

      if (cvUploadLabel) cvUploadLabel.hidden = uploaded;
      if (cvAiUploadHint) cvAiUploadHint.hidden = uploaded;
      if (cvInput) cvInput.disabled = uploaded;
    }

    let pendingPhotoDataUrl = '';
    let pendingPanX = 0;
    let pendingPanY = 0;

    const userName = currentUser?.fullName || '';
    const userEmail = currentUser?.email || '';

    if (runCvAiEvalBtn) {
      runCvAiEvalBtn.addEventListener('click', runCvAiEvaluationSimulation);
    }

    setText('profileName', userName || '—');
    setText('profileEmail', userEmail || '—');
    if (avatarInitials) avatarInitials.textContent = initialsFromName(userName);

    if (email) email.value = userEmail;
    if (fullName) fullName.value = userName;

    if (!isAllowed) {
      // Dejar el formulario visible pero no editable para no romper UX.
      form.querySelectorAll('input, textarea, button').forEach((el) => {
        if (el && el.id !== 'removePhotoBtn') {
          el.disabled = true;
        }
      });
      if (removePhotoBtn) removePhotoBtn.disabled = true;
      if (removeCvBtn) removeCvBtn.disabled = true;
      if (removePhotoBtn) removePhotoBtn.hidden = true;
      if (runCvAiEvalBtn) runCvAiEvalBtn.disabled = true;
      if (cvAiStatus) cvAiStatus.textContent = 'Iniciá sesión como candidato para usar la evaluación visual del CV.';
      if (cvAiInsight) cvAiInsight.textContent = 'Iniciá sesión para generar una descripción de análisis con IA.';
      return;
    }

    const storedProfile = getCandidateProfile(userEmail);
    if (storedProfile) {
      setFieldValue('fullName', storedProfile.fullName || userName);
      setFieldValue('headline', storedProfile.headline || '');
      setFieldValue('location', storedProfile.location || '');
      setFieldValue('phone', storedProfile.phone || '');
      setFieldValue('about', storedProfile.about || '');

      if (storedProfile.photoDataUrl && avatarPreview && avatarFallback) {
        avatarPreview.src = storedProfile.photoDataUrl;
        avatarPreview.hidden = false;
        avatarFallback.hidden = true;

        if (avatarContainer) {
          applyPhotoPan(avatarPreview, avatarContainer, getPhotoPan(storedProfile), PHOTO_EDITOR_SCALE);
        }
      }

      if (storedProfile.cvDataUrl && cvInfo) {
        cvInfo.hidden = false;
        if (cvFileName) cvFileName.textContent = storedProfile.cvFileName || 'CV.pdf';
        if (cvUpdatedAt) {
          const dateText = storedProfile.cvUpdatedAt
            ? new Date(storedProfile.cvUpdatedAt).toLocaleString()
            : '';
          cvUpdatedAt.textContent = dateText ? `Actualizado: ${dateText}` : '';
        }
        if (cvViewLink) {
          cvViewLink.href = storedProfile.cvDataUrl;
          cvViewLink.hidden = false;
          cvViewLink.setAttribute('download', storedProfile.cvFileName || 'CV.pdf');
        }
      }

      const nameForHeader = String(storedProfile.fullName || userName || '').trim();
      setText('profileName', nameForHeader || '—');
      if (avatarInitials) avatarInitials.textContent = initialsFromName(nameForHeader);
    }

    syncPhotoUi(storedProfile);
    syncCvUi(storedProfile);
    renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));

    if (typeof geoService !== 'undefined') {
      geoService.setupAutocomplete('#location');
    }

    initConfirmModalOnce();

    function updateHeaderFromFullName() {
      const value = String(fullName?.value || '').trim();
      setText('profileName', value || userName || '—');
      if (avatarInitials) avatarInitials.textContent = initialsFromName(value || userName);
    }

    if (fullName) {
      fullName.addEventListener('input', updateHeaderFromFullName);
    }

    if (headline) {
      headline.addEventListener('blur', function () {
        renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
      });
    }

    if (about) {
      about.addEventListener('blur', function () {
        renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
      });
    }

    function clearPhotoError() {
      if (photoError) photoError.textContent = '';
    }

    function clearCvError() {
      if (cvError) cvError.textContent = '';
    }

    function showCvError(message) {
      if (!cvError) return;
      cvError.textContent = message || '';
    }

    function showPhotoError(message) {
      if (!photoError) return;
      photoError.textContent = message || '';
    }

    function isModalOpen() {
      return Boolean(photoCropModal && !photoCropModal.hidden);
    }

    function openPhotoModal(dataUrl) {
      if (!photoCropModal || !photoEditorImg || !photoEditorViewport) return;

      pendingPhotoDataUrl = String(dataUrl || '');
      const existing = getCandidateProfile(userEmail) || {};
      const pan = getPhotoPan(existing);
      pendingPanX = pan.x;
      pendingPanY = pan.y;

      photoEditorImg.src = pendingPhotoDataUrl;
      applyPhotoPan(photoEditorImg, photoEditorViewport, { x: pendingPanX, y: pendingPanY }, PHOTO_EDITOR_SCALE);

      photoCropModal.hidden = false;
      photoCropModal.setAttribute('aria-hidden', 'false');
    }

    function closePhotoModal() {
      if (!photoCropModal) return;
      photoCropModal.hidden = true;
      photoCropModal.setAttribute('aria-hidden', 'true');
      pendingPhotoDataUrl = '';
      pendingPanX = 0;
      pendingPanY = 0;
    }

    async function setPhotoFromFile(file) {
      clearPhotoError();

      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        showPhotoError('Seleccioná una imagen válida.');
        return;
      }

      const maxBytes = 2 * 1024 * 1024;
      if (file.size > maxBytes) {
        showPhotoError('La imagen supera los 2MB. Probá con una más liviana.');
        return;
      }

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
        reader.readAsDataURL(file);
      }).catch(() => '');

      if (!dataUrl) {
        showPhotoError('No se pudo cargar la imagen.');
        return;
      }

      // Abrir modal para que el usuario ajuste el encuadre antes de guardar.
      openPhotoModal(dataUrl);
    }

    async function setCvFromFile(file) {
      clearCvError();

      if (!file) return;

      const existingProfile = getCandidateProfile(userEmail) || {};
      if (hasCv(existingProfile)) {
        showCvError('Ya tenés un CV subido. Primero quitá el CV actual para subir otro.');
        if (cvInput) cvInput.value = '';
        syncCvUi(existingProfile);
        return;
      }

      if (file.type !== 'application/pdf') {
        showCvError('Seleccioná un archivo PDF.');
        return;
      }

      const maxBytes = 3 * 1024 * 1024;
      if (file.size > maxBytes) {
        showCvError('El PDF supera los 3MB. Probá con uno más liviano.');
        return;
      }

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer el PDF'));
        reader.readAsDataURL(file);
      }).catch(() => '');

      if (!dataUrl) {
        showCvError('No se pudo cargar el PDF.');
        return;
      }

      const existing = existingProfile;
      const nowIso = new Date().toISOString();
      saveCandidateProfile(userEmail, {
        version: PROFILE_VERSION,
        email: userEmail,
        fullName: String(fullName?.value || userName || '').trim(),
        headline: String(headline?.value || '').trim(),
        location: String(location?.value || '').trim(),
        phone: String(phone?.value || '').trim(),
        about: String(about?.value || '').trim(),
        photoDataUrl: String(existing.photoDataUrl || ''),
        cvDataUrl: dataUrl,
        cvFileName: file.name || 'CV.pdf',
        cvSize: Number(file.size || 0),
        cvUpdatedAt: nowIso,
        updatedAt: nowIso,
        createdAt: existing.createdAt || nowIso,
      });

      if (cvInfo) cvInfo.hidden = false;
      if (cvFileName) cvFileName.textContent = file.name || 'CV.pdf';
      if (cvUpdatedAt) cvUpdatedAt.textContent = `Actualizado: ${new Date(nowIso).toLocaleString()}`;
      if (cvViewLink) {
        cvViewLink.href = dataUrl;
        cvViewLink.hidden = false;
        cvViewLink.setAttribute('download', file.name || 'CV.pdf');
      }

      if (cvInput) cvInput.value = '';
      syncCvUi({ ...existing, cvDataUrl: dataUrl });
      renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
    }

    if (photoInput) {
      photoInput.addEventListener('change', function () {
        const file = photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
        void setPhotoFromFile(file);
      });
    }

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', function () {
        clearPhotoError();

        const existing = getCandidateProfile(userEmail) || {};
        if (!hasPhoto(existing)) {
          syncPhotoUi(existing);
          return;
        }

        void confirmWithModal({
          title: 'Quitar foto',
          message: '¿Estás seguro que querés quitar la foto?',
          confirmText: 'Quitar',
        }).then((ok) => {
          if (!ok) return;

          if (isModalOpen()) closePhotoModal();

          if (photoInput) photoInput.value = '';

          if (avatarPreview && avatarFallback) {
            avatarPreview.src = '';
            clearPhotoPan(avatarPreview);
            avatarPreview.hidden = true;
            avatarFallback.hidden = false;
          }

          saveCandidateProfile(userEmail, {
            ...existing,
            version: PROFILE_VERSION,
            email: userEmail,
            photoDataUrl: '',
            photoPanX: 0,
            photoPanY: 0,
            cvDataUrl: String(existing.cvDataUrl || ''),
            cvFileName: String(existing.cvFileName || ''),
            cvSize: Number(existing.cvSize || 0),
            cvUpdatedAt: String(existing.cvUpdatedAt || ''),
            updatedAt: new Date().toISOString(),
            createdAt: existing.createdAt || new Date().toISOString(),
          });

          syncPhotoUi({ ...existing, photoDataUrl: '' });
        });
      });
    }

    // Editor de encuadre en modal: arrastrar para ajustar object-position.
    if (photoEditorViewport && photoEditorImg) {
      let dragging = false;
      let startClientX = 0;
      let startClientY = 0;
      let startPanX = 0;
      let startPanY = 0;

      function onGlobalPointerMove(e) {
        if (!dragging) return;
        if (!pendingPhotoDataUrl) return;

        e.preventDefault();

        const rect = photoEditorViewport.getBoundingClientRect();
        const maxX = (PHOTO_EDITOR_SCALE - 1) * rect.width * 0.5;
        const maxY = (PHOTO_EDITOR_SCALE - 1) * rect.height * 0.5;

        const dx = e.clientX - startClientX;
        const dy = e.clientY - startClientY;

        const startTx = maxX ? startPanX * maxX : 0;
        const startTy = maxY ? startPanY * maxY : 0;

        const nextTx = clampNumber(startTx + dx, -maxX, maxX);
        const nextTy = clampNumber(startTy + dy, -maxY, maxY);

        pendingPanX = maxX ? nextTx / maxX : 0;
        pendingPanY = maxY ? nextTy / maxY : 0;

        applyPhotoPan(photoEditorImg, photoEditorViewport, { x: pendingPanX, y: pendingPanY }, PHOTO_EDITOR_SCALE);
      }

      function onGlobalPointerUp(e) {
        if (!dragging) return;
        e.preventDefault();
        dragging = false;
        window.removeEventListener('pointermove', onGlobalPointerMove);
        window.removeEventListener('pointerup', onGlobalPointerUp);
        window.removeEventListener('pointercancel', onGlobalPointerUp);
      }

      photoEditorImg.addEventListener('dragstart', function (e) {
        e.preventDefault();
      });

      photoEditorViewport.addEventListener('dragstart', function (e) {
        e.preventDefault();
      });

      photoEditorViewport.addEventListener('pointerdown', function (e) {
        if (!pendingPhotoDataUrl) return;
        e.preventDefault();
        dragging = true;
        startClientX = e.clientX;
        startClientY = e.clientY;

        startPanX = pendingPanX;
        startPanY = pendingPanY;

        window.addEventListener('pointermove', onGlobalPointerMove, { passive: false });
        window.addEventListener('pointerup', onGlobalPointerUp, { passive: false });
        window.addEventListener('pointercancel', onGlobalPointerUp, { passive: false });
      });

      // Si el puntero sale del viewport, el global handler sigue capturando el drag.
    }

    if (photoCropCancelBtn) {
      photoCropCancelBtn.addEventListener('click', function () {
        // Descartar el upload si canceló.
        if (photoInput) photoInput.value = '';
        closePhotoModal();
      });
    }

    if (photoCropSaveBtn) {
      photoCropSaveBtn.addEventListener('click', function () {
        if (!pendingPhotoDataUrl) {
          closePhotoModal();
          return;
        }

        const savedPhotoDataUrl = pendingPhotoDataUrl;

        const profile = getCandidateProfile(userEmail) || {};
        const nowIso = new Date().toISOString();

        // Aplicar al avatar y persistir.
        if (avatarPreview && avatarFallback) {
          avatarPreview.src = savedPhotoDataUrl;
          avatarPreview.hidden = false;
          avatarFallback.hidden = true;
          if (avatarContainer) {
            applyPhotoPan(
              avatarPreview,
              avatarContainer,
              { x: pendingPanX, y: pendingPanY },
              PHOTO_EDITOR_SCALE
            );
          }
        }

        saveCandidateProfile(userEmail, {
          version: PROFILE_VERSION,
          email: userEmail,
          fullName: String(fullName?.value || userName || '').trim(),
          headline: String(headline?.value || '').trim(),
          location: String(location?.value || '').trim(),
          phone: String(phone?.value || '').trim(),
          about: String(about?.value || '').trim(),
          photoDataUrl: savedPhotoDataUrl,
          photoPanX: clampNumber(pendingPanX, -1, 1),
          photoPanY: clampNumber(pendingPanY, -1, 1),
          cvDataUrl: String(profile.cvDataUrl || ''),
          cvFileName: String(profile.cvFileName || ''),
          cvSize: Number(profile.cvSize || 0),
          cvUpdatedAt: String(profile.cvUpdatedAt || ''),
          updatedAt: nowIso,
          createdAt: profile.createdAt || nowIso,
        });

        if (photoInput) photoInput.value = '';
        closePhotoModal();

        const next = { ...profile, photoDataUrl: savedPhotoDataUrl };
        syncPhotoUi(next);
      });
    }

    if (cvInput) {
      cvInput.addEventListener('change', function () {
        const file = cvInput.files && cvInput.files[0] ? cvInput.files[0] : null;
        void setCvFromFile(file);
      });
    }

    if (removeCvBtn) {
      removeCvBtn.addEventListener('click', function () {
        clearCvError();

        const existing = getCandidateProfile(userEmail) || {};
        if (!hasCv(existing)) {
          syncCvUi(existing);
          return;
        }

        void confirmWithModal({
          title: 'Quitar CV',
          message: '¿Estás seguro que querés quitar el CV?',
          confirmText: 'Quitar',
        }).then((ok) => {
          if (!ok) return;

          if (cvInput) cvInput.value = '';

          if (cvInfo) cvInfo.hidden = true;
          if (cvFileName) cvFileName.textContent = '—';
          if (cvUpdatedAt) cvUpdatedAt.textContent = '';
          if (cvViewLink) {
            cvViewLink.href = '#';
            cvViewLink.hidden = true;
            cvViewLink.removeAttribute('download');
          }

          saveCandidateProfile(userEmail, {
            ...existing,
            version: PROFILE_VERSION,
            email: userEmail,
            cvDataUrl: '',
            cvFileName: '',
            cvSize: 0,
            cvUpdatedAt: '',
            updatedAt: new Date().toISOString(),
            createdAt: existing.createdAt || new Date().toISOString(),
          });

          syncCvUi({ ...existing, cvDataUrl: '' });
          renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
        });
      });
    }

    function validate() {
      let hasAnyError = false;

      const nameValue = String(fullName?.value || '').trim();
      hasAnyError =
        setFieldError(fullName, fullNameError, nameValue ? '' : 'Ingresá tu nombre.') || hasAnyError;

      return !hasAnyError;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;

      const existing = getCandidateProfile(userEmail) || {};
      const photoPan = getPhotoPan(existing);
      const nextProfile = {
        version: PROFILE_VERSION,
        email: userEmail,
        fullName: String(fullName?.value || userName || '').trim(),
        headline: String(headline?.value || '').trim(),
        location: String(location?.value || '').trim(),
        phone: String(phone?.value || '').trim(),
        about: String(about?.value || '').trim(),
        photoDataUrl: String(existing.photoDataUrl || ''),
        photoPanX: photoPan.x,
        photoPanY: photoPan.y,
        cvDataUrl: String(existing.cvDataUrl || ''),
        cvFileName: String(existing.cvFileName || ''),
        cvSize: Number(existing.cvSize || 0),
        cvUpdatedAt: String(existing.cvUpdatedAt || ''),
        updatedAt: new Date().toISOString(),
        createdAt: existing.createdAt || new Date().toISOString(),
      };

      try {
        saveCandidateProfile(userEmail, nextProfile);
      } catch (_) {
        // ignore
      }

      setText('profileName', nextProfile.fullName || '—');
      if (avatarInitials) avatarInitials.textContent = initialsFromName(nextProfile.fullName);
      renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));

      if (typeof updateNavbarActions === 'function') {
        updateNavbarActions();
      }

      // Feedback simple usando el title del documento.
      const originalTitle = document.title;
      document.title = 'Perfil guardado ✓';
      window.setTimeout(() => {
        document.title = originalTitle;
      }, 1200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
