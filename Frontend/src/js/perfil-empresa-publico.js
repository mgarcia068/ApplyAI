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
    const fallback = COMPANY_CATALOG.techcorp;

    const fromCatalog = requestedId && COMPANY_CATALOG[requestedId] ? COMPANY_CATALOG[requestedId] : null;
    if (fromCatalog) return fromCatalog;

    if (requested) {
      return {
        id: requestedId || slugify(requested) || 'empresa',
        name: requested,
        tagline: 'Perfil de empresa',
        industry: '—',
        location: '—',
        website: '#',
        offers: [],
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
    const raw = localStorage.getItem('ApplyAI.currentUser');
    if (!raw) {
      window.location.href = '../index.html';
      return;
    }

    try {
      const user = JSON.parse(raw);
      if (user.role === 'empresa') {
        const favoriteBtn = document.getElementById('favoriteCompanyBtn');
        if (favoriteBtn) {
          favoriteBtn.disabled = true;
          favoriteBtn.title = 'Inicia sesión como candidato para seguir a la empresa';
        }
      } else if (user.role === 'candidato') {
        // Al entrar, reflejar estado actual (según storage)
        const service = window.ApplyAI?.followedCompanies;
        const email = String(user.email || '').trim().toLowerCase();
        const isFollowing = Boolean(service && email && service.isFollowing(email, company?.id));
        applyFollowUiState(Boolean(isFollowing));
      }
    } catch(e) {
      window.location.href = '../index.html';
    }
  }

  function renderCompanyHeader(company) {
    if (!company) return;

    const nameEl = document.getElementById('companyName');
    const taglineEl = document.getElementById('companyTagline');
    const industryEl = document.getElementById('companyIndustry');
    const locationEl = document.getElementById('companyLocation');
    const websiteEl = document.getElementById('companyWebsite');
    const logoEl = document.getElementById('companyLogo');

    if (nameEl) nameEl.textContent = company.name || 'Empresa';
    if (taglineEl) taglineEl.textContent = company.tagline || '';
    if (industryEl) industryEl.textContent = company.industry || '—';
    if (locationEl) locationEl.textContent = company.location || '—';
    if (websiteEl) {
      websiteEl.textContent = company.website || '';
      websiteEl.href = company.website && company.website !== '#' ? `https://${company.website.replace(/^https?:\/\//, '')}` : '#';
    }

    if (logoEl) {
      const initials = String(company.name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase();
      logoEl.textContent = initials || '—';
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

  function applyFollowUiState(isFollowing) {
    const favoriteBtn = document.getElementById('favoriteCompanyBtn');
    setFavoriteIcon(Boolean(isFollowing));
    if (!favoriteBtn) return;
    favoriteBtn.title = isFollowing ? 'Siguiendo empresa (quitar de favoritas)' : 'Seguir empresa (añadir a favoritas)';
    favoriteBtn.setAttribute('aria-label', favoriteBtn.title);
  }

  function initFollowAndFavorite(company) {
    const favoriteBtn = document.getElementById('favoriteCompanyBtn');

    const raw = localStorage.getItem('ApplyAI.currentUser');
    const user = raw ? safeJsonParse(raw, null) : null;
    const email = String(user?.email || '').trim().toLowerCase();
    const role = String(user?.role || '').trim().toLowerCase();

    const service = window.ApplyAI?.followedCompanies;
    if (!service || !email || role !== 'candidato') return;

    const companyPayload = {
      id: String(company?.id || ''),
      name: String(company?.name || ''),
      industry: String(company?.industry || ''),
      location: String(company?.location || ''),
      website: String(company?.website || ''),
      tagline: String(company?.tagline || ''),
    };

    const refresh = () => {
      const following = service.isFollowing(email, companyPayload.id);
      applyFollowUiState(Boolean(following));
    };

    refresh();

    const toggle = () => {
      const nowFollowing = service.toggle(email, companyPayload);
      applyFollowUiState(Boolean(nowFollowing));

      if (nowFollowing) {
        showToast('¡Empresa añadida a favoritas!', 'success');
      } else {
        showToast('Empresa removida de favoritas.', 'info');
      }
    };

    if (favoriteBtn && !favoriteBtn.disabled) {
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