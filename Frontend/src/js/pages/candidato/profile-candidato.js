(function () {
  const PROFILE_VERSION = 1;
  const CV_AI_DAILY_LIMIT = 3;

  const PHOTO_EDITOR_SCALE = 1.18;

  const STORAGE_KEYS = {
    currentUser: 'ApplyAI.currentUser',
    profilePrefix: 'ApplyAI.candidateProfile:',
    cvAiDailyUsagePrefix: 'ApplyAI.candidateCvAiDailyUsage:',
  };

  function getLocalDateKey() {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getCvAiDailyUsageKey(email, dateKey) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const safeDateKey = String(dateKey || getLocalDateKey()).trim();
    return `${STORAGE_KEYS.cvAiDailyUsagePrefix}${normalizedEmail}:${safeDateKey}`;
  }

  function getCvAiDailyUsage(email, dateKey) {
    if (!email) return 0;
    const key = getCvAiDailyUsageKey(email, dateKey);
    const raw = localStorage.getItem(key);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
  }

  function setCvAiDailyUsage(email, count, dateKey) {
    if (!email) return;
    const key = getCvAiDailyUsageKey(email, dateKey);
    const safe = Math.max(0, Math.floor(Number(count) || 0));
    localStorage.setItem(key, String(safe));
  }

  function incrementCvAiDailyUsage(email, dateKey) {
    const current = getCvAiDailyUsage(email, dateKey);
    const next = current + 1;
    setCvAiDailyUsage(email, next, dateKey);
    return next;
  }

  function getCvAiRemainingDailyUsage(email, dateKey) {
    const used = getCvAiDailyUsage(email, dateKey);
    return Math.max(0, CV_AI_DAILY_LIMIT - used);
  }

  function hasCvAiReachedDailyLimit(email, dateKey) {
    return getCvAiDailyUsage(email, dateKey) >= CV_AI_DAILY_LIMIT;
  }

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

  function resolveFromSrcRoot(pathFromRoot) {
    const marker = '/pages/';
    const pathname = window.location.pathname;
    const markerIndex = pathname.lastIndexOf(marker);
    if (markerIndex === -1) return pathFromRoot;

    const rest = pathname.slice(markerIndex + marker.length);
    const depth = rest.split('/').filter(Boolean).length || 1;
    return `${'../'.repeat(depth)}${pathFromRoot}`;
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
          window.location.href = resolveFromSrcRoot('index.html');
        }
      });
    }

    if (alertEl) alertEl.hidden = isAllowed;

    const fullName = document.getElementById('fullName');
    const fullNameError = document.getElementById('fullNameError');

    const email = document.getElementById('email');

    const headline = document.getElementById('headline');
    const academicBackground = document.getElementById('academicBackground');
    const workExperience = document.getElementById('workExperience');
    const technicalSkills = document.getElementById('technicalSkills');
    const technicalSkillsCards = document.getElementById('technicalSkillsCards');
    const technicalSkillsError = document.getElementById('technicalSkillsError');
    const languages = document.getElementById('languages');
    const languagesCards = document.getElementById('languagesCards');
    const languagesError = document.getElementById('languagesError');
    const location = document.getElementById('location');
    const phone = document.getElementById('phone');
    const about = document.getElementById('about');

    const profileCatalogApi = window.ApplyAI?.profileCatalogApi || null;

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

    let technicalSkillsItems = [];
    let languagesItems = [];
    let catalogReady = false;

    function normalizeToken(value) {
      return String(value || '')
        .trim()
        .replace(/\s+/g, ' ');
    }

    function uniqueTokens(list) {
      const seen = new Set();
      return list.filter((item) => {
        const key = String(item || '').toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function parseTokenList(value) {
      if (Array.isArray(value)) {
        return uniqueTokens(value.map(normalizeToken).filter(Boolean));
      }

      return uniqueTokens(
        String(value || '')
          .split(/[,;\n]+/)
          .map(normalizeToken)
          .filter(Boolean)
      );
    }

    function stringifyTokenList(list) {
      return uniqueTokens(Array.isArray(list) ? list.map(normalizeToken).filter(Boolean) : []).join(', ');
    }

    function getTokenInputByKind(kind) {
      if (kind === 'technicalSkills') return technicalSkills;
      if (kind === 'languages') return languages;
      return null;
    }

    function getTokenErrorByKind(kind) {
      if (kind === 'technicalSkills') return technicalSkillsError;
      if (kind === 'languages') return languagesError;
      return null;
    }

    function setTokenFieldMessage(kind, message) {
      const inputEl = getTokenInputByKind(kind);
      const errorEl = getTokenErrorByKind(kind);
      if (!inputEl || !errorEl) return;
      setFieldError(inputEl, errorEl, String(message || '').trim());
    }

    function clearTokenFieldMessage(kind) {
      setTokenFieldMessage(kind, '');
    }

    function normalizeSearchText(value) {
      if (profileCatalogApi && typeof profileCatalogApi.normalize === 'function') {
        return profileCatalogApi.normalize(value);
      }

      return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    function listCatalogOptions(kind) {
      if (!catalogReady || !profileCatalogApi) return [];

      if (kind === 'technicalSkills') {
        return profileCatalogApi.listSkills();
      }

      if (kind === 'languages') {
        return profileCatalogApi.listLanguages();
      }

      return [];
    }

    function filterCatalogOptions(kind, query) {
      const q = normalizeSearchText(query);
      if (!q) return [];

      return listCatalogOptions(kind)
        .filter((option) => normalizeSearchText(option).includes(q))
        .slice(0, 8);
    }

    function setupTokenAutocomplete(kind, inputEl) {
      if (!inputEl) return;
      if (inputEl.dataset.catalogAutocompleteReady === 'true') return;

      const wrapper = document.createElement('div');
      wrapper.className = 'autocomplete-wrapper';
      wrapper.style.position = 'relative';

      inputEl.parentNode.insertBefore(wrapper, inputEl);
      wrapper.appendChild(inputEl);

      const list = document.createElement('ul');
      list.className = 'autocomplete-list';
      wrapper.appendChild(list);

      function renderOptions() {
        const query = String(inputEl.value || '').trim();
        if (!query || !catalogReady) {
          list.innerHTML = '';
          list.classList.remove('show');
          return;
        }

        const options = filterCatalogOptions(kind, query);
        list.innerHTML = '';

        if (!options.length) {
          const liEmpty = document.createElement('li');
          liEmpty.className = 'autocomplete-item text-muted';
          liEmpty.textContent = 'No se encontraron resultados';
          list.appendChild(liEmpty);
          list.classList.add('show');
          return;
        }

        options.forEach((optionValue) => {
          const li = document.createElement('li');
          li.className = 'autocomplete-item';
          li.innerHTML = `<strong>${optionValue}</strong>`;
          li.addEventListener('mousedown', () => {
            inputEl.value = optionValue;
            list.classList.remove('show');
            inputEl.focus();
          });
          list.appendChild(li);
        });

        list.classList.add('show');
      }

      inputEl.addEventListener('input', function () {
        clearTokenFieldMessage(kind);
        renderOptions();
      });

      inputEl.addEventListener('focus', function () {
        if (String(inputEl.value || '').trim()) {
          renderOptions();
        }
      });

      inputEl.addEventListener('blur', function () {
        list.classList.remove('show');
      });

      inputEl.dataset.catalogAutocompleteReady = 'true';
    }

    function setupCatalogApi() {
      const hasValidApi = Boolean(
        profileCatalogApi &&
          typeof profileCatalogApi.resolveSkill === 'function' &&
          typeof profileCatalogApi.resolveLanguage === 'function' &&
          typeof profileCatalogApi.listSkills === 'function' &&
          typeof profileCatalogApi.listLanguages === 'function'
      );

      if (!hasValidApi) {
        catalogReady = false;
        if (technicalSkills) technicalSkills.disabled = true;
        if (languages) languages.disabled = true;
        setTokenFieldMessage('technicalSkills', 'No se pudo cargar el catálogo de habilidades.');
        setTokenFieldMessage('languages', 'No se pudo cargar el catálogo de idiomas.');
        return;
      }

      catalogReady = true;

      if (technicalSkills) technicalSkills.disabled = false;
      if (languages) languages.disabled = false;

      setupTokenAutocomplete('technicalSkills', technicalSkills);
      setupTokenAutocomplete('languages', languages);

      clearTokenFieldMessage('technicalSkills');
      clearTokenFieldMessage('languages');
    }

    function resolveTokenFromCatalog(kind, value) {
      if (!catalogReady || !profileCatalogApi) return null;

      const token = normalizeToken(value);
      if (!token) return null;

      if (kind === 'technicalSkills') {
        return profileCatalogApi.resolveSkill(token);
      }
      if (kind === 'languages') {
        return profileCatalogApi.resolveLanguage(token);
      }
      return null;
    }

    function filterTokensByCatalog(kind, tokens) {
      return uniqueTokens(
        (Array.isArray(tokens) ? tokens : [])
          .map((token) => resolveTokenFromCatalog(kind, token))
          .filter(Boolean)
      );
    }

    function getTokenItemsByKind(kind) {
      if (kind === 'technicalSkills') return technicalSkillsItems;
      if (kind === 'languages') return languagesItems;
      return [];
    }

    function setTokenItemsByKind(kind, items) {
      const safeItems = uniqueTokens(Array.isArray(items) ? items.map(normalizeToken).filter(Boolean) : []);
      if (kind === 'technicalSkills') {
        technicalSkillsItems = safeItems;
        return;
      }
      if (kind === 'languages') {
        languagesItems = safeItems;
      }
    }

    function renderTokenCards(listEl, kind, items) {
      if (!listEl) return;
      listEl.innerHTML = '';

      const fragment = document.createDocumentFragment();

      items.forEach((item) => {
        const chip = document.createElement('span');
        chip.className = 'skill-chip profile-token-chip';

        const label = document.createElement('span');
        label.textContent = item;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'profile-token__remove';
        removeBtn.setAttribute('aria-label', `Quitar ${item}`);
        removeBtn.setAttribute('data-token-remove', 'true');
        removeBtn.setAttribute('data-token-kind', kind);
        removeBtn.setAttribute('data-token-value', item);
        removeBtn.textContent = '×';

        chip.appendChild(label);
        chip.appendChild(removeBtn);
        fragment.appendChild(chip);
      });

      listEl.appendChild(fragment);
    }

    function syncTokenCardsUi() {
      renderTokenCards(technicalSkillsCards, 'technicalSkills', technicalSkillsItems);
      renderTokenCards(languagesCards, 'languages', languagesItems);
    }

    function addTokensToKind(kind, rawValue) {
      const nextTokens = parseTokenList(rawValue);
      if (!nextTokens.length) return { added: 0, invalidTokens: [] };

      const validTokens = [];
      const invalidTokens = [];

      nextTokens.forEach((token) => {
        const resolvedToken = resolveTokenFromCatalog(kind, token);
        if (resolvedToken) {
          validTokens.push(resolvedToken);
        } else {
          invalidTokens.push(token);
        }
      });

      const existing = getTokenItemsByKind(kind);
      const merged = uniqueTokens([...existing, ...validTokens]);
      const added = merged.length - existing.length;
      setTokenItemsByKind(kind, merged);
      return {
        added,
        invalidTokens: uniqueTokens(invalidTokens),
      };
    }

    function commitTokenInput(kind) {
      const inputEl = getTokenInputByKind(kind);
      if (!inputEl) {
        return { added: 0, invalidTokens: [] };
      }

      const result = addTokensToKind(kind, inputEl.value || '');

      if (result.invalidTokens.length) {
        const sample = result.invalidTokens.slice(0, 2).join(', ');
        const suffix = result.invalidTokens.length > 2 ? '…' : '';
        setTokenFieldMessage(kind, `No está en el catálogo: ${sample}${suffix}`);
      } else {
        clearTokenFieldMessage(kind);
      }

      if (result.added > 0) {
        inputEl.value = '';
        syncTokenCardsUi();
        return result;
      }

      if (!result.invalidTokens.length) {
        inputEl.value = '';
      } else {
        inputEl.value = String(inputEl.value || '').trim();
      }

      return result;
    }

    function removeTokenFromKind(kind, tokenValue) {
      const normalizedToken = normalizeToken(tokenValue);
      if (!normalizedToken) return false;

      const existing = getTokenItemsByKind(kind);
      const next = existing.filter((item) => String(item).toLowerCase() !== normalizedToken.toLowerCase());

      if (next.length === existing.length) return false;

      setTokenItemsByKind(kind, next);
      syncTokenCardsUi();
      return true;
    }

    function hydrateTokenFieldsFromProfile(profile) {
      const storedSkills = parseTokenList(profile?.technicalSkillsList || profile?.technicalSkills || '');
      const storedLanguages = parseTokenList(profile?.languagesList || profile?.languages || '');

      setTokenItemsByKind('technicalSkills', filterTokensByCatalog('technicalSkills', storedSkills));
      setTokenItemsByKind('languages', filterTokensByCatalog('languages', storedLanguages));
      syncTokenCardsUi();

      if (technicalSkills) technicalSkills.value = '';
      if (languages) languages.value = '';
      clearTokenFieldMessage('technicalSkills');
      clearTokenFieldMessage('languages');
    }

    function buildTokenProfileFields() {
      const technicalSkillsValue = stringifyTokenList(technicalSkillsItems);
      const languagesValue = stringifyTokenList(languagesItems);

      return {
        technicalSkills: technicalSkillsValue,
        technicalSkillsList: technicalSkillsItems.slice(),
        languages: languagesValue,
        languagesList: languagesItems.slice(),
      };
    }

    function commitPendingTokenDrafts() {
      const technicalResult = commitTokenInput('technicalSkills');
      const languagesResult = commitTokenInput('languages');
      return technicalResult.added > 0 || languagesResult.added > 0;
    }

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
      const academicBackgroundText = String(academicBackground?.value || profile.academicBackground || '').trim();
      const workExperienceText = String(workExperience?.value || profile.workExperience || '').trim();
      const profileSkills = filterTokensByCatalog('technicalSkills', technicalSkillsItems.length ? technicalSkillsItems : parseTokenList(profile.technicalSkillsList || profile.technicalSkills || ''));
      const profileLanguages = filterTokensByCatalog('languages', languagesItems.length ? languagesItems : parseTokenList(profile.languagesList || profile.languages || ''));
      const draftSkills = filterTokensByCatalog('technicalSkills', parseTokenList(technicalSkills?.value || ''));
      const draftLanguages = filterTokensByCatalog('languages', parseTokenList(languages?.value || ''));
      const technicalSkillsText = stringifyTokenList([
        ...profileSkills,
        ...draftSkills,
      ]);
      const languagesText = stringifyTokenList([
        ...profileLanguages,
        ...draftLanguages,
      ]);
      const aboutText = String(about?.value || profile.about || '').trim();
      const mergedText = `${headlineText} ${academicBackgroundText} ${workExperienceText} ${technicalSkillsText} ${languagesText} ${aboutText}`.trim();
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

      if (!headlineText && !academicBackgroundText && !workExperienceText && !technicalSkillsText && !languagesText && !aboutText) {
        status = 'Completá más campos del perfil para obtener una evaluación más útil.';
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

      if (cvAiStatus) {
        const baseStatus = String(evaluation.status || 'Evaluación visual lista.');
        const remaining = getCvAiRemainingDailyUsage(userEmail);

        if (remaining <= 0) {
          cvAiStatus.textContent = `Ya usaste tus ${CV_AI_DAILY_LIMIT} análisis de IA de hoy (solo CV). Volvé mañana para continuar.`;
        } else {
          cvAiStatus.textContent = `${baseStatus} Te quedan ${remaining} análisis de IA hoy (solo CV).`;
        }
      }
    }

    function syncCvAiDailyLimitUi() {
      if (!runCvAiEvalBtn || !isAllowed) return;

      const remaining = getCvAiRemainingDailyUsage(userEmail);

      if (remaining <= 0) {
        runCvAiEvalBtn.disabled = true;
        runCvAiEvalBtn.textContent = 'Límite diario alcanzado';

        if (cvAiStatus) {
          cvAiStatus.textContent = `Ya usaste tus ${CV_AI_DAILY_LIMIT} análisis de IA de hoy (solo CV). Volvé mañana para continuar.`;
        }
        return;
      }

      runCvAiEvalBtn.disabled = false;
      if (runCvAiEvalBtn.textContent === 'Límite diario alcanzado') {
        runCvAiEvalBtn.textContent = 'Analizar CV con IA';
      }
    }

    function runCvAiEvaluationSimulation() {
      if (!runCvAiEvalBtn) return;

      if (hasCvAiReachedDailyLimit(userEmail)) {
        syncCvAiDailyLimitUi();
        return;
      }

      runCvAiEvalBtn.disabled = true;
      runCvAiEvalBtn.textContent = 'Analizando...';
      if (cvAiStatus) cvAiStatus.textContent = 'Procesando CV con IA (demo visual)...';

      incrementCvAiDailyUsage(userEmail);

      window.setTimeout(() => {
        renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: true }));

        if (!hasCvAiReachedDailyLimit(userEmail)) {
          runCvAiEvalBtn.disabled = false;
          runCvAiEvalBtn.textContent = 'Volver a analizar';
        }

        syncCvAiDailyLimitUi();
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

    setupCatalogApi();

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
    hydrateTokenFieldsFromProfile(storedProfile);

    if (storedProfile) {
      setFieldValue('fullName', storedProfile.fullName || userName);
      setFieldValue('headline', storedProfile.headline || '');
      setFieldValue('academicBackground', storedProfile.academicBackground || '');
      setFieldValue('workExperience', storedProfile.workExperience || '');
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
    syncCvAiDailyLimitUi();

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

    if (academicBackground) {
      academicBackground.addEventListener('blur', function () {
        renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
      });
    }

    if (workExperience) {
      workExperience.addEventListener('blur', function () {
        renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
      });
    }

    if (technicalSkills) {
      technicalSkills.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const result = commitTokenInput('technicalSkills');
        if (result.added > 0) {
          renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
        }
      });

      technicalSkills.addEventListener('blur', function () {
        renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
      });
    }

    if (languages) {
      languages.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const result = commitTokenInput('languages');
        if (result.added > 0) {
          renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
        }
      });

      languages.addEventListener('blur', function () {
        renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
      });
    }

    if (technicalSkillsCards) {
      technicalSkillsCards.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-token-remove="true"]');
        if (!btn) return;

        const value = String(btn.getAttribute('data-token-value') || '').trim();
        if (removeTokenFromKind('technicalSkills', value)) {
          renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
        }
      });
    }

    if (languagesCards) {
      languagesCards.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-token-remove="true"]');
        if (!btn) return;

        const value = String(btn.getAttribute('data-token-value') || '').trim();
        if (removeTokenFromKind('languages', value)) {
          renderCvAiEvaluation(buildCvAiEvaluation({ withJitter: false }));
        }
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

      commitPendingTokenDrafts();
      const tokenFields = buildTokenProfileFields();

      const existing = existingProfile;
      const nowIso = new Date().toISOString();
      saveCandidateProfile(userEmail, {
        version: PROFILE_VERSION,
        email: userEmail,
        fullName: String(fullName?.value || userName || '').trim(),
        headline: String(headline?.value || '').trim(),
        academicBackground: String(academicBackground?.value || '').trim(),
        workExperience: String(workExperience?.value || '').trim(),
        technicalSkills: tokenFields.technicalSkills,
        technicalSkillsList: tokenFields.technicalSkillsList,
        languages: tokenFields.languages,
        languagesList: tokenFields.languagesList,
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
        commitPendingTokenDrafts();
        const tokenFields = buildTokenProfileFields();

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
          academicBackground: String(academicBackground?.value || profile.academicBackground || '').trim(),
          workExperience: String(workExperience?.value || profile.workExperience || '').trim(),
          technicalSkills: tokenFields.technicalSkills,
          technicalSkillsList: tokenFields.technicalSkillsList,
          languages: tokenFields.languages,
          languagesList: tokenFields.languagesList,
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
      commitPendingTokenDrafts();
      if (!validate()) return;

      const existing = getCandidateProfile(userEmail) || {};
      const photoPan = getPhotoPan(existing);
      const tokenFields = buildTokenProfileFields();
      const nextProfile = {
        version: PROFILE_VERSION,
        email: userEmail,
        fullName: String(fullName?.value || userName || '').trim(),
        headline: String(headline?.value || '').trim(),
        academicBackground: String(academicBackground?.value || '').trim(),
        workExperience: String(workExperience?.value || '').trim(),
        technicalSkills: tokenFields.technicalSkills,
        technicalSkillsList: tokenFields.technicalSkillsList,
        languages: tokenFields.languages,
        languagesList: tokenFields.languagesList,
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
