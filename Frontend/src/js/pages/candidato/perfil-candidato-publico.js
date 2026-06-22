(function () {
  document.addEventListener('DOMContentLoaded', () => {
    loadCandidateData((candidate) => {
      const loader = document.getElementById('page-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
      }

      if (!candidate) {
        renderNotFound();
        return;
      }
      renderCandidateHeader(candidate);
      renderCandidateBody(candidate);
      initOwnProfileLink(candidate);
    });
  });

  // ─── Helpers ─────────────────────────────────────────

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function normalizeRole(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'candidato' || normalized === 'candidate') return 'candidato';
    if (normalized === 'empresa' || normalized === 'company') return 'empresa';
    return '';
  }

  function getQueryParam(name) {
    try {
      const url = new URL(window.location.href);
      const value = url.searchParams.get(name);
      return value ? String(value) : '';
    } catch (_) {
      return '';
    }
  }

  function getCurrentUser() {
    const raw = localStorage.getItem('ApplyAI.currentUser');
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

  function getCandidateInitials(name) {
    return (
      String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  }

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function applyPhotoPan(imgEl, viewportEl, pan, scale) {
    if (!imgEl || !viewportEl) return;
    const rect = viewportEl.getBoundingClientRect();
    const appliedScale = Number(scale) || 1;
    const maxX = (appliedScale - 1) * rect.width * 0.5;
    const maxY = (appliedScale - 1) * rect.height * 0.5;
    const xN = clampNumber(pan?.x, -1, 1);
    const yN = clampNumber(pan?.y, -1, 1);
    imgEl.style.setProperty('--photo-pan-x', `${maxX ? xN * maxX : 0}px`);
    imgEl.style.setProperty('--photo-pan-y', `${maxY ? yN * maxY : 0}px`);
    imgEl.style.setProperty('--photo-pan-scale', String(appliedScale));
  }

  // ─── Carga de datos ─────────────────────────────────

  function loadCandidateData(callback) {
    const requestedEmail = String(getQueryParam('candidate') || '').trim();
    const isOwnProfile = !requestedEmail;

    const currentUser = getCurrentUser();
    const cacheKey = isOwnProfile
      ? `ApplyAI.ownCandidateProfile_${currentUser?.email || ''}`
      : `ApplyAI.publicCandidateProfile_${requestedEmail}`;

    // Intentar desde caché primero
    let hasLoadedFromCache = false;
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (cached) {
          hasLoadedFromCache = true;
          callback(cached);
        }
      } catch (_) {}
    }

    const onFreshData = (candidate) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(candidate));
      } catch (err) {
        if (err.name === 'QuotaExceededError') {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ApplyAI.') && key !== 'ApplyAI.currentUser' && key !== cacheKey) {
              localStorage.removeItem(key);
            }
          }
          try {
            localStorage.setItem(cacheKey, JSON.stringify(candidate));
          } catch (_) {}
        }
      }
      if (!hasLoadedFromCache) callback(candidate);
    };

    const apiBase = window.APP_CONFIG?.API_URL || 'https://applyai-umuw.onrender.com';

    if (requestedEmail) {
      // Perfil público de otro candidato — sin auth
      axios
        .get(`${apiBase}/api/users/candidate/${encodeURIComponent(requestedEmail)}`)
        .then((res) => {
          onFreshData(mapApiToCandidate(res.data, false));
        })
        .catch((err) => {
          console.warn('No se encontró el candidato o error de red.', err);
          if (!hasLoadedFromCache) {
            callback(tryLocalStorageFallback(requestedEmail));
          }
        });
    } else {
      // Propio perfil — requiere token
      if (!currentUser?.token) {
        if (!hasLoadedFromCache) callback(null);
        return;
      }
      axios
        .get(`${apiBase}/api/users/me`, {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        })
        .then((res) => {
          const mapped = mapApiToCandidate(res.data, true);
          onFreshData(mapped);
        })
        .catch((err) => {
          console.warn('Error cargando perfil propio.', err);
          if (!hasLoadedFromCache) {
            callback(tryLocalStorageFallback(currentUser.email));
          }
        });
    }
  }

  function mapApiToCandidate(data, isOwnProfile) {
    const profile = data.candidateProfile || {};
    return {
      id: data.id || '',
      fullName: profile.name || data.fullName || 'Candidato',
      headline: profile.headline || '',
      location: profile.location || '',
      bio: profile.bio || '',
      education: profile.education || '',
      experience: profile.experience || '',
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      languages: Array.isArray(profile.languages) ? profile.languages : [],
      cvUrl: profile.cvUrl || '',
      cvOriginalName: profile.cvOriginalName || '',
      photoUrl: profile.photoUrl || '',
      isOwnProfile: Boolean(isOwnProfile),
    };
  }

  function tryLocalStorageFallback(email) {
    if (!email) return null;
    const key = `ApplyAI.candidateProfile:${String(email).trim().toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = safeJsonParse(raw, null);
    if (!saved) return null;
    return {
      id: '',
      fullName: saved.fullName || saved.name || 'Candidato',
      headline: saved.headline || '',
      location: saved.location || '',
      bio: saved.about || saved.bio || '',
      education: saved.academicBackground || saved.education || '',
      experience: saved.workExperience || saved.experience || '',
      skills: saved.technicalSkillsList || saved.skills || [],
      languages: saved.languagesList || saved.languages || [],
      cvUrl: saved.cvDataUrl || saved.cvUrl || '',
      cvOriginalName: saved.cvFileName || saved.cvOriginalName || '',
      photoUrl: saved.photoUrl || saved.photoDataUrl || '',
      isOwnProfile: false,
    };
  }

  // ─── Render ──────────────────────────────────────────

  function renderNotFound() {
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = `
      <div class="container" style="padding-top: var(--space-16); text-align: center;">
        <div style="font-size: 3rem; margin-bottom: var(--space-4);">👤</div>
        <h1 class="text-display text-2xl" style="margin-bottom: var(--space-2);">Perfil no encontrado</h1>
        <p class="text-muted">Este candidato no existe o no tiene un perfil público disponible.</p>
        <button class="btn btn--secondary btn--sm mt-6" onclick="window.history.back()">Volver</button>
      </div>`;
  }

  function renderCandidateHeader(candidate) {
    document.title = `ApplyAI \u2014 ${candidate.fullName || 'Candidato'}`;

    const avatarEl = document.getElementById('candidateAvatar');
    const avatarImgEl = document.getElementById('candidateAvatarImg');
    const avatarFallbackEl = document.getElementById('candidateAvatarFallback');
    const avatarInitialsEl = document.getElementById('candidateAvatarInitials');
    const nameEl = document.getElementById('candidateName');
    const headlineEl = document.getElementById('candidateHeadline');
    const locationRowEl = document.getElementById('candidateLocationRow');
    const locationEl = document.getElementById('candidateLocation');

    if (nameEl) nameEl.textContent = candidate.fullName || 'Candidato';
    if (headlineEl) {
      headlineEl.textContent = candidate.headline || '';
      headlineEl.hidden = !candidate.headline;
    }
    if (locationEl) locationEl.textContent = candidate.location || '';
    if (locationRowEl) locationRowEl.hidden = !candidate.location;

    // Avatar photo
    if (avatarEl) {
      const initials = getCandidateInitials(candidate.fullName);
      if (avatarInitialsEl) avatarInitialsEl.textContent = initials;

      if (avatarImgEl && candidate.photoUrl) {
        avatarImgEl.src = candidate.photoUrl;
        avatarImgEl.hidden = false;
        if (avatarFallbackEl) avatarFallbackEl.hidden = true;
        requestAnimationFrame(() => applyPhotoPan(avatarImgEl, avatarEl, { x: 0, y: 0 }, 1.16));
      } else if (avatarImgEl) {
        avatarImgEl.hidden = true;
        avatarImgEl.src = '';
        if (avatarFallbackEl) avatarFallbackEl.hidden = false;
      }
    }
  }

  function renderCandidateBody(candidate) {
    // Bio
    const bioEl = document.getElementById('candidateBio');
    const bioCard = document.getElementById('candidateBioCard');
    if (bioEl) bioEl.textContent = candidate.bio || '';
    if (bioCard) bioCard.hidden = !candidate.bio;

    // Experiencia
    const expEl = document.getElementById('candidateExperience');
    const expCard = document.getElementById('candidateExperienceCard');
    if (expEl) {
      const lines = (candidate.experience || '').split('\n').filter(Boolean);
      expEl.innerHTML = lines.length
        ? lines.map((l) => `<p style="margin:0 0 var(--space-2)">${escapeHtml(l)}</p>`).join('')
        : '';
    }
    if (expCard) expCard.hidden = !candidate.experience;

    // Educación
    const eduEl = document.getElementById('candidateEducation');
    const eduCard = document.getElementById('candidateEducationCard');
    if (eduEl) {
      const lines = (candidate.education || '').split('\n').filter(Boolean);
      eduEl.innerHTML = lines.length
        ? lines.map((l) => `<p style="margin:0 0 var(--space-2)">${escapeHtml(l)}</p>`).join('')
        : '';
    }
    if (eduCard) eduCard.hidden = !candidate.education;

    // Skills
    const skillsEl = document.getElementById('candidateSkills');
    if (skillsEl) {
      const skills = Array.isArray(candidate.skills) ? candidate.skills : [];
      skillsEl.innerHTML = skills.length
        ? skills.map((s) => `<span class="badge badge--neutral">${escapeHtml(s)}</span>`).join('')
        : '<span class="text-muted text-sm">No especificadas</span>';
    }

    // Idiomas
    const langsEl = document.getElementById('candidateLanguages');
    if (langsEl) {
      const langs = Array.isArray(candidate.languages) ? candidate.languages : [];
      langsEl.innerHTML = langs.length
        ? langs.map((l) => `<span class="badge badge--accent">${escapeHtml(l)}</span>`).join('')
        : '<span class="text-muted text-sm">No especificados</span>';
    }

    // CV download card
    const cvCard = document.getElementById('candidateCvCard');
    const cvLink = document.getElementById('candidateCvLink');
    const cvName = document.getElementById('candidateCvName');
    if (cvCard) {
      if (candidate.cvUrl) {
        cvCard.hidden = false;
        if (cvLink) {
          cvLink.href = candidate.cvUrl;
          cvLink.target = '_blank';
          cvLink.rel = 'noopener noreferrer';
        }
        if (cvName) cvName.textContent = candidate.cvOriginalName || 'Descargar CV';
      } else {
        cvCard.hidden = true;
      }
    }
  }

  function initOwnProfileLink(candidate) {
    const editBtn = document.getElementById('editProfileBtn');
    if (!editBtn) return;
    editBtn.hidden = !candidate.isOwnProfile;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
