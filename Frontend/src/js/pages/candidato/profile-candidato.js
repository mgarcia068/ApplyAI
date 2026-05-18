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
      token: String(parsed.token || '').trim(),
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

  async function syncProfileWithBackend(profile) {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.token || currentUser.role !== 'candidato') return;

    try {
      // Map frontend fields to backend DTO
      const payload = {
        fullName: profile.fullName,
        name: profile.fullName,
        location: profile.location,
        bio: profile.about,
        education: profile.academicBackground,
        experience: profile.workExperience,
        skills: profile.technicalSkillsList || [],
        languages: profile.languagesList || [],
        cvUrl: profile.cvDataUrl && profile.cvDataUrl.trim() !== '' ? profile.cvDataUrl : undefined,
        cvOriginalName: profile.cvFileName || undefined,
        photoUrl: profile.photoUrl || profile.photoDataUrl || undefined,
      };

      const response = await fetch('http://localhost:3000/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Failed to sync profile with backend');
      }
    } catch (error) {
      console.error('Error syncing profile with backend:', error);
    }
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

  function visualizarCV(nombreCandidato, urlOriginal, rating = '0.0') {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const backendOrigin = 'http://localhost:3000';
    
    let docUrl = urlOriginal || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    // Si es una ruta local (empieza con /api o /cv), le anteponemos el origen del backend
    if (docUrl.startsWith('/')) {
      docUrl = `${backendOrigin}${docUrl}`;
    }

    const overlay = document.createElement('div');
    overlay.id = 'cv-preview-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 100500; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); padding: 12px;';
    
    const modal = document.createElement('div');
    modal.style.cssText = `background: #fff; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); width: ${isMobile ? '100%' : '90vw'}; max-width: 1000px; height: ${isMobile ? 'calc(100vh - 24px)' : '90vh'}; max-height: calc(100vh - 24px); display: flex; flex-direction: column; overflow: hidden;`;
    
    // Calcular color según rating (usamos lógica similar para el dashboard)
    const ratingNum = parseFloat(rating);
    let ratingColor = '#3B82F6';
    let ratingBg = 'rgba(59, 130, 246, 0.1)';

    if (ratingNum >= 8.5) {
      ratingColor = '#10B981';
      ratingBg = 'rgba(16, 185, 129, 0.1)';
    } else if (ratingNum >= 5.5) {
      ratingColor = '#F59E0B';
      ratingBg = 'rgba(245, 158, 11, 0.1)';
    } else {
      ratingColor = '#EF4444';
      ratingBg = 'rgba(239, 68, 68, 0.1)';
    }

    modal.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; background: #fff;">
        <div style="display: flex; align-items: center; gap: 16px; min-width: 0; flex: 1;">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center; color: #3B82F6; flex-shrink: 0;">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"></path></svg>
          </div>
          <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827; line-height: 1.2;">CV de ${nombreCandidato}</h3>
            <p style="margin: 0; font-size: 14px; color: #6B7280;">Previsualización del documento PDF</p>
          </div>
          <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: ${ratingBg}; border: 3px solid ${ratingColor}; font-size: 15px; font-weight: 700; color: ${ratingColor}; margin-left: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); flex-shrink: 0;" title="Puntuación del CV">
            ${rating}
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; margin-left: auto;">
          <a href="${docUrl}" target="_blank" style="padding: 8px 16px; background: #f3f4f6; color: #374151; font-weight: 500; font-size: 13px; border-radius: 6px; text-decoration: none; display: flex; align-items: center; gap: 6px; border: 1px solid #d1d5db;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
            Abrir original
          </a>
          <button id="cv-close-btn" style="padding: 8px; width: 36px; height: 36px; background: none; border: none; color: #6B7280; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 6px;" onmouseover="this.style.background='#f3f4f6'; this.style.color='#ef4444';" onmouseout="this.style.background='none'; this.style.color='#6b7280';">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>
      <div style="flex: 1; background: #525659; display: flex; align-items: center; justify-content: center;">
        <object data="${docUrl}" type="application/pdf" width="100%" height="100%">
          <iframe src="${docUrl}" width="100%" height="100%" style="border: none;">
            <p>Tu navegador no soporta PDFs embebidos. <a href="${docUrl}">Descarga el PDF aquí</a>.</p>
          </iframe>
        </object>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const close = () => overlay.remove();
    modal.querySelector('#cv-close-btn').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
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
          li.addEventListener('mousedown', (e) => {
            e.preventDefault();
            inputEl.value = optionValue;
            list.classList.remove('show');
            commitTokenInput(kind);
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

    function syncPhotoUi(profile) {
      const available = hasPhoto(profile);
      if (removePhotoBtn) removePhotoBtn.hidden = !available;
      // No other restriction on re-uploading photo.
      if (photoUploadLabel) photoUploadLabel.hidden = false;
    }


    let pendingPhotoDataUrl = '';
    let pendingPanX = 0;
    let pendingPanY = 0;

    const userName = currentUser?.fullName || '';
    const userEmail = currentUser?.email || '';


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
      if (removePhotoBtn) removePhotoBtn.hidden = true;
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

      const profilePhoto = storedProfile.photoUrl || storedProfile.photoDataUrl;
      if (profilePhoto && avatarPreview && avatarFallback) {
        avatarPreview.src = profilePhoto;
        avatarPreview.hidden = false;
        avatarFallback.hidden = true;

        if (avatarContainer) {
          applyPhotoPan(avatarPreview, avatarContainer, getPhotoPan(storedProfile), PHOTO_EDITOR_SCALE);
        }
      }


      const nameForHeader = String(storedProfile.fullName || userName || '').trim();
      setText('profileName', nameForHeader || '—');
      if (avatarInitials) avatarInitials.textContent = initialsFromName(nameForHeader);
    }

    syncPhotoUi(storedProfile);
    

    if (typeof geoService !== 'undefined') {
      geoService.setupAutocomplete('#location');
    }

    initConfirmModalOnce();

    async function hydrateFromBackend() {
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.token || currentUser.role !== 'candidato') return;

      try {
        const response = await fetch('http://localhost:3000/api/users/me', {
          headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          const p = userData.candidateProfile;
          if (p) {
            const email = userData.email || currentUser.email;
            const existing = getCandidateProfile(email) || {};
            
            const merged = {
              ...existing,
              version: PROFILE_VERSION,
              email: email,
              fullName: userData.fullName || existing.fullName,
              location: p.location || existing.location,
              about: p.bio || existing.about,
              academicBackground: p.education || existing.academicBackground,
              workExperience: p.experience || existing.workExperience,
              technicalSkillsList: p.skills || existing.technicalSkillsList,
              languagesList: p.languages || existing.languagesList,
              cvDataUrl: p.cvUrl || existing.cvDataUrl,
              cvFileName: p.cvOriginalName || existing.cvFileName,
              photoUrl: p.photoUrl || existing.photoUrl,
            };

            merged.technicalSkills = stringifyTokenList(merged.technicalSkillsList);
            merged.languages = stringifyTokenList(merged.languagesList);

            saveCandidateProfile(email, merged);

            // Update UI
            setFieldValue('fullName', merged.fullName);
            setFieldValue('location', merged.location);
            setFieldValue('about', merged.about);
            setFieldValue('academicBackground', merged.academicBackground);
            setFieldValue('workExperience', merged.workExperience);
            
            hydrateTokenFieldsFromProfile(merged);
          }
        }
      } catch (error) {
        console.error('Error hydrating from backend:', error);
      }
    }

    void hydrateFromBackend();

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
      });
    }

    if (academicBackground) {
      academicBackground.addEventListener('blur', function () {
      });
    }

    if (workExperience) {
      workExperience.addEventListener('blur', function () {
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
      });
    }

    if (technicalSkillsCards) {
      technicalSkillsCards.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-token-remove="true"]');
        if (!btn) return;

        const value = String(btn.getAttribute('data-token-value') || '').trim();
        if (removeTokenFromKind('technicalSkills', value)) {
        }
      });
    }

    if (languagesCards) {
      languagesCards.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-token-remove="true"]');
        if (!btn) return;

        const value = String(btn.getAttribute('data-token-value') || '').trim();
        if (removeTokenFromKind('languages', value)) {
        }
      });
    }

    if (about) {
      about.addEventListener('blur', function () {
      });
    }

    function clearPhotoError() {
      if (photoError) photoError.textContent = '';
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
      photoCropSaveBtn.addEventListener('click', async function () {
        if (!pendingPhotoDataUrl) {
          closePhotoModal();
          return;
        }

        const savedPhotoDataUrl = pendingPhotoDataUrl;
        const profile = getCandidateProfile(userEmail) || {};
        const nowIso = new Date().toISOString();
        commitPendingTokenDrafts();
        const tokenFields = buildTokenProfileFields();

        // Aplicar al avatar visualmente de inmediato (optimistic UI).
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

        if (photoInput) photoInput.value = '';
        closePhotoModal();

        // Guardar localmente con el base64 como photoDataUrl (para uso offline/previo a la subida)
        const profileToSave = {
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
          updatedAt: nowIso,
          createdAt: profile.createdAt || nowIso,
        };

        saveCandidateProfile(userEmail, profileToSave);

        const next = { ...profile, photoDataUrl: savedPhotoDataUrl };
        syncPhotoUi(next);

        // Subir la foto a S3 via el endpoint dedicado (multipart)
        const currentUser = getCurrentUser();
        const token = currentUser?.token;
        if (token) {
          try {
            // Convertir el base64 dataUrl a un Blob
            const res = await fetch(savedPhotoDataUrl);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            const formData = new FormData();
            formData.append('photo', blob, `photo.${ext}`);

            const uploadRes = await fetch('http://localhost:3000/api/users/me/photo', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData,
            });

            if (uploadRes.ok) {
              const data = await uploadRes.json();
              // Actualizar el localStorage con la URL de S3 (no el base64)
              const updatedProfile = getCandidateProfile(userEmail) || {};
              updatedProfile.photoUrl = data.photoUrl;
              saveCandidateProfile(userEmail, updatedProfile);
              console.log('[Photo] Subida a S3 con éxito:', data.photoUrl);
            } else {
              const errBody = await uploadRes.json().catch(() => ({}));
              console.error('[Photo] Error al subir a S3:', errBody.message || uploadRes.status);
            }
          } catch (err) {
            console.error('[Photo] Error al subir la foto:', err);
          }
        }
      });
    }



    function validate() {
      let hasAnyError = false;

      const nameValue = String(fullName?.value || '').trim();
      hasAnyError =
        setFieldError(fullName, fullNameError, nameValue ? '' : 'Ingresá tu nombre.') || hasAnyError;

      return !hasAnyError;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.classList.add('is-loading');

      commitPendingTokenDrafts();
      if (!validate()) {
        if (submitBtn) submitBtn.classList.remove('is-loading');
        return;
      }

      const existing = getCandidateProfile(userEmail) || {};
      const photoPan = getPhotoPan(existing);
      const tokenFields = buildTokenProfileFields();
      const nextProfile = {
        ...existing,
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
        updatedAt: new Date().toISOString(),
        createdAt: existing.createdAt || new Date().toISOString(),
      };

      try {
        saveCandidateProfile(userEmail, nextProfile);
        
        // Wait for both the backend sync and a minimum of 600ms so the loader is visible
        await Promise.all([
          syncProfileWithBackend(nextProfile),
          new Promise(resolve => setTimeout(resolve, 600))
        ]);
      } catch (_) {
        // ignore
      } finally {
        if (submitBtn) submitBtn.classList.remove('is-loading');
      }

      setText('profileName', nextProfile.fullName || '—');
      if (avatarInitials) avatarInitials.textContent = initialsFromName(nextProfile.fullName);
      

      if (typeof updateNavbarActions === 'function') {
        updateNavbarActions();
      }

      if (typeof showToast === 'function') {
        showToast('¡Perfil guardado!', 'Tus cambios se actualizaron con éxito.', 'success');
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
