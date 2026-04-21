(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const company = resolveCompanyContext();
    checkAccess(company);
    renderCompanyHeader(company);
    initFollowAndFavorite(company);
    renderCompanyOffers(company);
  });

  const COMPANY_CATALOG = {
    techcorp: {
      id: 'techcorp',
      name: 'TechCorp Argentina',
      tagline: 'Innovando el futuro del desarrollo de software.',
      industry: 'Desarrollo de Software',
      location: 'Córdoba, Argentina',
      website: 'www.techcorp.com.ar',
      offers: [
        { id: 'tcp-frontend', title: 'Frontend Developer Ssr', type: 'Remoto', date: 'Hace 2 días' },
        { id: 'tcp-backend', title: 'Backend Node.js Sr', type: 'Híbrido', date: 'Hace 5 días' },
        { id: 'tcp-pm', title: 'Product Manager', type: 'Presencial', date: 'Hace 1 semana' },
      ],
    },
    novatech: {
      id: 'novatech',
      name: 'NovaTech',
      tagline: 'Construyendo productos digitales para el futuro.',
      industry: 'Tecnología',
      location: 'Remoto (AR)',
      website: 'www.novatech.com',
      offers: [
        { id: 'nv-frontend', title: 'Frontend Jr', type: 'Remoto', date: 'Hace 3 días' },
        { id: 'nv-qa', title: 'QA Manual', type: 'Remoto', date: 'Hace 6 días' },
      ],
    },
    byteworks: {
      id: 'byteworks',
      name: 'ByteWorks',
      tagline: 'Ingeniería de software con foco en calidad.',
      industry: 'Software & Servicios',
      location: 'Córdoba, AR',
      website: 'www.byteworks.dev',
      offers: [
        { id: 'bw-backend', title: 'Backend Node.js', type: 'Híbrido', date: 'Hace 5 días' },
        { id: 'bw-devops', title: 'DevOps', type: 'Híbrido', date: 'Hace 1 semana' },
      ],
    },
    qualitylab: {
      id: 'qualitylab',
      name: 'QualityLab',
      tagline: 'Cuidamos la calidad de productos digitales.',
      industry: 'QA & Testing',
      location: 'Híbrido',
      website: 'www.qualitylab.test',
      offers: [
        { id: 'ql-qa', title: 'QA Manual', type: 'Híbrido', date: 'Hace 1 semana' },
      ],
    },
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

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function slugify(value) {
    const base = normalizeText(value);
    return base
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function clampCompanyNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function getCompanyPhotoPan(profile) {
    return {
      x: clampCompanyNumber(profile?.photoPanX, -1, 1),
      y: clampCompanyNumber(profile?.photoPanY, -1, 1),
    };
  }

  function applyCompanyPhotoPan(imgEl, viewportEl, pan, scale) {
    if (!imgEl || !viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    const appliedScale = Number(scale) || 1;
    const maxX = (appliedScale - 1) * rect.width * 0.5;
    const maxY = (appliedScale - 1) * rect.height * 0.5;
    const xN = clampCompanyNumber(pan?.x, -1, 1);
    const yN = clampCompanyNumber(pan?.y, -1, 1);

    const tx = maxX ? xN * maxX : 0;
    const ty = maxY ? yN * maxY : 0;

    imgEl.style.setProperty('--photo-pan-x', `${tx}px`);
    imgEl.style.setProperty('--photo-pan-y', `${ty}px`);
    imgEl.style.setProperty('--photo-pan-scale', String(appliedScale));
  }

  function getCompanyInitials(name) {
    return String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'TC';
  }

  function mapSavedProfileToPublic(saved, fallbackName, requestedId, isOwnProfile) {
    const name = String(saved?.nombre || fallbackName || 'Mi Empresa').trim() || 'Mi Empresa';
    const pan = getCompanyPhotoPan(saved);
    return {
      id: requestedId || slugify(name) || 'empresa',
      name,
      tagline: String(saved?.descripcion || 'Empresa de desarrollo de software con foco en soluciones B2B para el mercado latinoamericano.'),
      description: String(saved?.descripcion || 'Empresa de desarrollo de software con foco en soluciones B2B para el mercado latinoamericano.'),
      industry: String(saved?.rubro || 'Tecnologia & Software'),
      location: String(saved?.ubicacion || 'Buenos Aires, Argentina'),
      website: String(saved?.web || 'www.miempresa.com').replace(/^https?:\/\//i, ''),
      offers: [],
      isOwnProfile: Boolean(isOwnProfile),
      photoDataUrl: String(saved?.photoDataUrl || ''),
      photoPanX: pan.x,
      photoPanY: pan.y,
    };
  }

  function findSavedCompanyProfileById(companyId) {
    const requestedId = String(companyId || '').trim();
    if (!requestedId) return null;

    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('ApplyAI.perfilEmpresa_')) continue;

        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const saved = safeJsonParse(raw, null);
        if (!saved) continue;

        const savedName = String(saved?.nombre || '').trim();
        const savedId = slugify(savedName);
        if (savedId && savedId === requestedId) {
          return saved;
        }
      }
    } catch (_) {
      return null;
    }

    return null;
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

  function resolveCompanyContext() {
    const requested = String(getQueryParam('company') || '').trim();
    const requestedId = requested ? slugify(requested) : '';

    if (!requested) {
      try {
        const currentUserRaw = localStorage.getItem('ApplyAI.currentUser');
        if (currentUserRaw) {
          const currentUser = JSON.parse(currentUserRaw);
          if (normalizeRole(currentUser.role) === 'empresa') {
            const companyEmail = currentUser.email;
            let companyName = currentUser.fullName || 'Mi Empresa';

            let profile = mapSavedProfileToPublic(null, companyName, slugify(companyName), true);

            const savedRaw = localStorage.getItem(`ApplyAI.perfilEmpresa_${companyEmail}`);
            if (savedRaw) {
              const saved = safeJsonParse(savedRaw, null);
              if (saved) {
                profile = mapSavedProfileToPublic(saved, companyName, requestedId || slugify(companyName), true);
              }
            }
            return profile;
          }
        }
      } catch (e) {}
    }

    const fallback = {
      ...COMPANY_CATALOG.techcorp,
      description: 'En TechCorp Argentina nos especializamos en la creación de soluciones de software a medida...',
      photoDataUrl: '',
      photoPanX: 0,
      photoPanY: 0,
    };

    const savedFromStorage = requestedId ? findSavedCompanyProfileById(requestedId) : null;
    if (savedFromStorage) {
      return mapSavedProfileToPublic(savedFromStorage, requested, requestedId, false);
    }

    const fromCatalog = requestedId && COMPANY_CATALOG[requestedId] ? COMPANY_CATALOG[requestedId] : null;
    if (fromCatalog) {
      return {
        ...fromCatalog,
        description: fromCatalog.tagline,
        photoDataUrl: '',
        photoPanX: 0,
        photoPanY: 0,
      };
    }

    if (requested) {
      return {
        id: requestedId || slugify(requested) || 'empresa',
        name: requested,
        tagline: 'Perfil de empresa',
        description: 'Perfil público de ' + requested,
        industry: '—',
        location: '—',
        website: '#',
        offers: [],
        photoDataUrl: '',
        photoPanX: 0,
        photoPanY: 0,
      };
    }

    return fallback;
  }

  // Función para mostrar mensajes temporales "Toast"
  function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText =
        'position: fixed; bottom: var(--space-6); left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; flex-direction: column; gap: var(--space-2);';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `alert alert--${type === 'success' ? 'success' : 'info'}`;
    toast.style.cssText = 'box-shadow: var(--shadow-lg); animation: slideUp 0.3s ease-out forwards;';
    toast.innerHTML = `<span style="font-weight: 500">${String(message || '')}</span>`;

    toastContainer.appendChild(toast);

    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.innerHTML = `
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(10px); } }
        `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function checkAccess(company) {
    const favoriteBtn = document.getElementById('favoriteCompanyBtn');
    if (!favoriteBtn) return;

    const service = window.ApplyAI?.followedCompanies;
    const fromService = typeof service?.getCurrentUser === 'function' ? service.getCurrentUser() : null;
    const raw = localStorage.getItem('ApplyAI.currentUser');
    const fromStorage = raw ? safeJsonParse(raw, null) : null;
    const user = fromService || fromStorage;

    const role = normalizeRole(user?.role);
    const email = String(user?.email || '').trim().toLowerCase();

    // Perfil público: no redirigir. Solo habilitar seguir a candidatos logueados.
    if (!email) {
      applyFollowUiState(false, {
        disabled: true,
        label: 'Iniciar sesión',
        title: 'Inicia sesión como candidato para seguir a la empresa',
      });
      return;
    }

    if (role !== 'candidato') {
      applyFollowUiState(false, {
        disabled: true,
        label: 'No disponible',
        title: 'Solo cuentas candidato pueden seguir empresas',
      });
      return;
    }

    if (!service) {
      applyFollowUiState(false, {
        disabled: true,
        label: 'No disponible',
        title: 'La función de seguimiento no está disponible en este momento',
      });
      return;
    }

    const companyId = String(company?.id || slugify(company?.name || '')).trim();
    const isFollowing = Boolean(service && companyId && service.isFollowing(email, companyId));
    applyFollowUiState(Boolean(isFollowing), { disabled: false });
  }

  function renderCompanyHeader(company) {
    if (!company) return;

    const nameEl = document.getElementById('companyName');
    const taglineEl = document.getElementById('companyTagline');
    const industryEl = document.getElementById('companyIndustry');
    const locationEl = document.getElementById('companyLocation');
    const websiteEl = document.getElementById('companyWebsite');
    const logoEl = document.getElementById('companyLogo');
    const logoImgEl = document.getElementById('companyLogoImg');
    const logoFallbackEl = document.getElementById('companyLogoFallback');
    const descriptionEl = document.getElementById('companyDescription'); // added for description

    if (nameEl) nameEl.textContent = company.name || 'Empresa';
    if (taglineEl) taglineEl.textContent = company.tagline || '';
    if (industryEl) industryEl.textContent = company.industry || '—';
    if (locationEl) locationEl.textContent = company.location || '—';
    if (descriptionEl) descriptionEl.textContent = company.description || company.tagline || '';
    if (websiteEl) {
      const cleanWebsite = String(company.website || '').trim();
      websiteEl.textContent = cleanWebsite;
      websiteEl.href = cleanWebsite && cleanWebsite !== '#' ? `https://${cleanWebsite.replace(/^https?:\/\//, '')}` : '#';
    }

    if (logoEl) {
      const initials = getCompanyInitials(company.name);
      if (logoFallbackEl) logoFallbackEl.textContent = initials || '—';

      const hasPhoto = Boolean(company.photoDataUrl);
      if (logoImgEl && hasPhoto) {
        logoImgEl.src = company.photoDataUrl;
        logoImgEl.hidden = false;
        if (logoFallbackEl) logoFallbackEl.hidden = true;

        const pan = getCompanyPhotoPan(company);
        applyCompanyPhotoPan(logoImgEl, logoEl, pan, 1.16);
        requestAnimationFrame(() => {
          applyCompanyPhotoPan(logoImgEl, logoEl, pan, 1.16);
        });
      } else if (logoImgEl) {
        logoImgEl.hidden = true;
        logoImgEl.src = '';
        logoImgEl.style.removeProperty('--photo-pan-x');
        logoImgEl.style.removeProperty('--photo-pan-y');
        logoImgEl.style.removeProperty('--photo-pan-scale');
        if (logoFallbackEl) logoFallbackEl.hidden = false;
      }
    }
  }

  function setFavoriteIcon(isFavorite) {
    const favoriteBtn = document.getElementById('favoriteCompanyBtn');
    if (!favoriteBtn) return;
    const svg = favoriteBtn.querySelector('svg');
    if (!svg) return;

    if (isFavorite) {
      favoriteBtn.classList.add('is-favorite');
      svg.setAttribute('fill', 'var(--color-primary)');
      svg.setAttribute('stroke', 'var(--color-primary)');
    } else {
      favoriteBtn.classList.remove('is-favorite');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
    }
  }

  function applyFollowUiState(isFollowing, options) {
    const favoriteBtn = document.getElementById('favoriteCompanyBtn');
    if (!favoriteBtn) return;

    const cfg = options && typeof options === 'object' ? options : {};
    const disabled = Boolean(cfg.disabled);
    const labelEl = favoriteBtn.querySelector('[data-follow-label]');

    setFavoriteIcon(Boolean(isFollowing) && !disabled);

    favoriteBtn.disabled = disabled;
    favoriteBtn.classList.toggle('is-disabled', disabled);
    favoriteBtn.classList.toggle('is-following', Boolean(isFollowing) && !disabled);

    const label = String(
      cfg.label || (isFollowing ? 'Siguiendo' : 'Seguir')
    ).trim();
    if (labelEl) labelEl.textContent = label;

    favoriteBtn.title = String(
      cfg.title || (isFollowing ? 'Siguiendo empresa (quitar de favoritas)' : 'Seguir empresa (añadir a favoritas)')
    );
    favoriteBtn.setAttribute('aria-label', favoriteBtn.title);
    favoriteBtn.setAttribute('aria-pressed', String(Boolean(isFollowing) && !disabled));
  }

  function initFollowAndFavorite(company) {
    const favoriteBtn = document.getElementById('favoriteCompanyBtn');
    if (!favoriteBtn) return;

    const raw = localStorage.getItem('ApplyAI.currentUser');
    const user = raw ? safeJsonParse(raw, null) : null;
    const email = String(user?.email || '').trim().toLowerCase();
    const role = normalizeRole(user?.role);

    const service = window.ApplyAI?.followedCompanies;
    if (!service || !email || role !== 'candidato') return;

    const companyPayload = {
      id: String(company?.id || slugify(company?.name || '') || ''),
      name: String(company?.name || ''),
      industry: String(company?.industry || ''),
      location: String(company?.location || ''),
      website: String(company?.website || ''),
      tagline: String(company?.tagline || ''),
    };

    if (!companyPayload.id || !companyPayload.name) {
      applyFollowUiState(false, {
        disabled: true,
        label: 'No disponible',
        title: 'No se pudo identificar la empresa para seguirla',
      });
      return;
    }

    const refresh = () => {
      const following = service.isFollowing(email, companyPayload.id);
      applyFollowUiState(Boolean(following), { disabled: false });
    };

    refresh();

    const toggle = () => {
      const nowFollowing = service.toggle(email, companyPayload);
      applyFollowUiState(Boolean(nowFollowing), { disabled: false });

      if (nowFollowing) {
        showToast('¡Empresa añadida a favoritas!', 'success');
      } else {
        showToast('Empresa removida de favoritas.', 'info');
      }
    };

    if (!favoriteBtn.dataset.followBound && !favoriteBtn.disabled) {
      favoriteBtn.dataset.followBound = 'true';
      favoriteBtn.addEventListener('click', toggle);
    }
  }

  function renderCompanyOffers(company) {
    const listEl = document.getElementById('companyOffersList');
    const countEl = document.getElementById('companyOffersCount');
    if (!listEl) return;

    const offers = Array.isArray(company?.offers) ? company.offers : [];

    if (countEl) countEl.textContent = String(offers.length);

    if (offers.length === 0) {
      listEl.innerHTML = `<div class="text-center text-muted" style="padding: var(--space-4)">Actualmente no hay búsquedas abiertas.</div>`;
      return;
    }

    listEl.innerHTML = offers.map(offer => `
      <article class="card card--flat" style="margin-bottom: var(--space-4);">
        <header class="flex items-start justify-between">
          <div class="flex flex-col" style="gap: var(--space-1)">
            <h3 class="text-display" style="font-size: var(--text-md)">${offer.title}</h3>
            <div class="text-xs text-muted flex items-center gap-2">
              <span class="badge badge--neutral">${offer.type}</span>
              <span>${offer.date}</span>
            </div>
          </div>
          <button class="btn btn--secondary btn--sm" aria-label="Ver detalles de la oferta">Ver oferta</button>
        </header>
      </article>
    `).join('');
  }
})();