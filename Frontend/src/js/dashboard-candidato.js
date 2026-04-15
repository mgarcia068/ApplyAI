(function () {
  const STORAGE_KEYS = {
    currentUser: 'ApplyAI.currentUser',
    applications: 'ApplyAI.applications',
  };

  const OFFERS = [
    {
      id: 'emp-offer-1',
      name: 'Programa Trainee 2026',
      role: 'Desarrollador Frontend Jr',
      company: 'NovaTech',
      location: 'Remoto (AR)',
      publishedAt: '2026-04-12T12:00:00.000Z',
      description:
        'Sumate a un equipo de producto para construir interfaces modernas, accesibles y performantes.',
      responsibilities: [
        'Implementar pantallas en HTML/CSS/JS siguiendo diseño',
        'Consumir APIs REST y manejar estados en el frontend',
        'Escribir componentes reutilizables',
      ],
      requirements: [
        'Conocimientos básicos de JavaScript',
        'Manejo de HTML y CSS',
        'Ganas de aprender y trabajar en equipo',
      ],
    },
    {
      id: 'emp-offer-2',
      name: 'Búsqueda Backend',
      role: 'Backend Node.js',
      company: 'ByteWorks',
      location: 'Córdoba, AR',
      publishedAt: '2026-04-05T09:30:00.000Z',
      description:
        'Desarrollá servicios y APIs en Node.js, con foco en calidad, mantenibilidad y buenas prácticas.',
      responsibilities: [
        'Construir endpoints REST',
        'Integrar base de datos y modelado de datos',
        'Escribir tests y documentación técnica',
      ],
      requirements: ['Node.js y Express', 'Git y flujo de PRs', 'SQL o NoSQL (deseable)'],
    },
    {
      id: 'emp-offer-3',
      name: 'Calidad de producto',
      role: 'QA Manual',
      company: 'QualityLab',
      location: 'Híbrido',
      publishedAt: '2026-03-28T15:10:00.000Z',
      description:
        'Participá del ciclo de desarrollo asegurando la calidad del producto y la experiencia del usuario.',
      responsibilities: [
        'Diseñar y ejecutar casos de prueba',
        'Reportar bugs con pasos reproducibles',
        'Colaborar con diseño y desarrollo',
      ],
      requirements: ['Atención al detalle', 'Comunicación clara', 'Experiencia en testing (deseable)'],
    },
  ];

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

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function getAllApplications() {
    const raw = localStorage.getItem(STORAGE_KEYS.applications);
    const parsed = raw ? safeJsonParse(raw, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function saveAllApplications(apps) {
    localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(apps));
  }

  function hasApplied(email, offerId) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const offerKey = String(offerId || '').trim();

    return getAllApplications().some(
      (a) =>
        String(a?.email || '').toLowerCase() === normalizedEmail &&
        String(a?.offerId || '') === offerKey
    );
  }

  function createApplication(email, offer) {
    if (!email || !offer) return;
    if (hasApplied(email, offer.id)) return;

    const apps = getAllApplications();
    const nowIso = new Date().toISOString();

    apps.push({
      id: `app_${offer.id}_${nowIso}`,
      email: String(email || '').trim().toLowerCase(),
      offerId: String(offer.id || ''),
      offerTitle: String(offer.role || offer.name || '').trim(),
      company: String(offer.company || '').trim(),
      location: String(offer.location || '').trim(),
      status: 'En revisión',
      appliedAt: nowIso,
      updatedAt: nowIso,
    });

    saveAllApplications(apps);
  }

  function formatPublishedSince(iso) {
    const date = iso ? new Date(String(iso)) : null;
    if (!date || Number.isNaN(date.getTime())) return '—';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays <= 0) return 'Hoy';
    if (diffDays === 1) return 'Hace 1 día';

    if (diffDays < 31) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null ? '' : String(value);
  }

  function setHidden(id, hidden) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = Boolean(hidden);
  }

  function setDisabled(id, disabled) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = Boolean(disabled);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function daysSince(iso) {
    const date = iso ? new Date(String(iso)) : null;
    if (!date || Number.isNaN(date.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    return Math.max(0, diffDays);
  }

  function getApplication(email, offerId) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const offerKey = String(offerId || '').trim();

    return (
      getAllApplications().find(
        (a) =>
          String(a?.email || '').toLowerCase() === normalizedEmail &&
          String(a?.offerId || '') === offerKey
      ) || null
    );
  }

  function badgeClassForStatus(status) {
    const s = normalizeText(status);
    if (s.includes('acept')) return 'badge--success';
    if (s.includes('rechaz')) return 'badge--error';
    if (s.includes('revision') || s.includes('revisión')) return 'badge--info';
    return 'badge--neutral';
  }

  function getFilterState() {
    const offerName = normalizeText(document.getElementById('filterOfferName')?.value);
    const role = normalizeText(document.getElementById('filterRole')?.value);
    const location = normalizeText(document.getElementById('filterLocation')?.value);

    const daysRaw = String(document.getElementById('filterPublishedDays')?.value || '').trim();
    const maxDays = daysRaw ? Number(daysRaw) : null;

    return {
      offerName,
      role,
      location,
      maxDays: Number.isFinite(maxDays) && maxDays > 0 ? maxDays : null,
    };
  }

  function getFilteredOffers() {
    const filters = getFilterState();

    return OFFERS.filter((offer) => {
      if (filters.offerName) {
        const hay = normalizeText(offer.name);
        if (!hay.includes(filters.offerName)) return false;
      }

      if (filters.role) {
        const hay = normalizeText(offer.role);
        if (!hay.includes(filters.role)) return false;
      }

      if (filters.location) {
        const hay = normalizeText(offer.location);
        if (!hay.includes(filters.location)) return false;
      }

      if (filters.maxDays != null) {
        const diff = daysSince(offer.publishedAt);
        if (diff == null) return false;
        if (diff > filters.maxDays) return false;
      }

      return true;
    });
  }

  let selectedOfferId = '';
  let currentUser = null;
  let isAllowed = false;

  function renderList(offers) {
    const listEl = document.getElementById('employeeOffersList');
    const countEl = document.getElementById('employeeOffersCount');
    if (!listEl) return;

    if (countEl) countEl.textContent = String(offers.length);

    if (!OFFERS.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding: var(--space-10) var(--space-6)">
          <div class="empty-state__icon">✦</div>
          <div class="empty-state__title">No hay ofertas</div>
          <div class="empty-state__text">Volvé más tarde para ver nuevas oportunidades.</div>
        </div>
      `;
      return;
    }

    if (!offers.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding: var(--space-10) var(--space-6)">
          <div class="empty-state__icon">✦</div>
          <div class="empty-state__title">No se encontraron ofertas</div>
          <div class="empty-state__text">Probá ajustando los filtros para ver más resultados.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = offers
      .map((o) => {
        const selected = o.id === selectedOfferId;
        const published = formatPublishedSince(o.publishedAt);

        return `
        <button
          type="button"
          class="offer-list__item"
          role="option"
          aria-selected="${selected ? 'true' : 'false'}"
          data-offer-id="${o.id}"
          ${isAllowed ? '' : 'disabled'}
        >
          <div class="offer-list__title">${escapeHtml(o.name)}</div>
          <div class="offer-list__meta">
            <div><strong>Puesto:</strong> ${escapeHtml(o.role)}</div>
            <div><strong>Ubicación:</strong> ${escapeHtml(o.location)}</div>
            <div><strong>Publicada:</strong> ${escapeHtml(published)}</div>
          </div>
        </button>
      `;
      })
      .join('');

    listEl.querySelectorAll('button[data-offer-id]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-offer-id') || '';
        if (!id) return;
        selectedOfferId = id;
        renderAll();
      });
    });
  }

  function renderDetail() {
    const offer = OFFERS.find((o) => o.id === selectedOfferId) || null;

    const statusBadgeEl = document.getElementById('offerDetailStatusBadge');
    const applyBtnEl = document.getElementById('applyOfferBtn');

    if (!offer) {
      setText('offerDetailTitle', 'Oferta');
      setHidden('offerDetailEmpty', false);
      setHidden('offerDetail', true);
      if (statusBadgeEl) statusBadgeEl.hidden = true;
      if (applyBtnEl) applyBtnEl.hidden = true;
      return;
    }

    setHidden('offerDetailEmpty', true);
    setHidden('offerDetail', false);

    setText('offerDetailTitle', offer.role || 'Oferta');
    setText('offerDetailCompany', offer.company ? `${offer.company} • ${offer.location}` : offer.location || '—');
    setText('offerDetailDescription', offer.description || '—');

    setText('offerDetailName', offer.name || '—');
    setText('offerDetailRole', offer.role || '—');
    setText('offerDetailLocation', offer.location || '—');

    const publishedSince = formatPublishedSince(offer.publishedAt);
    const date = offer.publishedAt ? new Date(String(offer.publishedAt)) : null;
    const absolute =
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

    setText('offerDetailPublished', absolute ? `${absolute} (${publishedSince})` : publishedSince);

    const respEl = document.getElementById('offerDetailResponsibilities');
    if (respEl) {
      respEl.innerHTML =
        (offer.responsibilities || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('') || '<li>—</li>';
    }

    const reqEl = document.getElementById('offerDetailRequirements');
    if (reqEl) {
      reqEl.innerHTML =
        (offer.requirements || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('') || '<li>—</li>';
    }

    const app = isAllowed && currentUser?.email ? getApplication(currentUser.email, offer.id) : null;

    if (statusBadgeEl) {
      if (app) {
        statusBadgeEl.textContent = String(app.status || 'Postulado');
        statusBadgeEl.className = `badge ${badgeClassForStatus(app.status)}`;
        statusBadgeEl.hidden = false;
      } else {
        statusBadgeEl.hidden = true;
      }
    }

    if (applyBtnEl) {
      if (!isAllowed || !currentUser?.email || app) {
        applyBtnEl.hidden = true;
        applyBtnEl.disabled = true;
      } else {
        applyBtnEl.hidden = false;
        applyBtnEl.disabled = false;
      }
    }
  }

  function renderAll() {
    const offers = getFilteredOffers();

    if (selectedOfferId && !offers.some((o) => o.id === selectedOfferId)) {
      selectedOfferId = '';
    }

    renderList(offers);
    renderDetail();
  }

  function init() {
    const alertEl = document.getElementById('employeeDashboardAlert');

    currentUser = getCurrentUser();
    isAllowed = Boolean(currentUser && currentUser.email && currentUser.role === 'candidato');

    if (alertEl) alertEl.hidden = isAllowed;

    setDisabled('filterOfferName', !isAllowed);
    setDisabled('filterRole', !isAllowed);
    setDisabled('filterLocation', !isAllowed);
    setDisabled('filterPublishedDays', !isAllowed);

    if (isAllowed && typeof geoService !== 'undefined' && typeof geoService.setupAutocomplete === 'function') {
      geoService.setupAutocomplete('#filterLocation');
    }

    const applyBtnEl = document.getElementById('applyOfferBtn');
    if (applyBtnEl) {
      applyBtnEl.addEventListener('click', function () {
        if (!isAllowed || !currentUser?.email) return;

        const offer = OFFERS.find((o) => o.id === selectedOfferId) || null;
        if (!offer) return;

        createApplication(currentUser.email, offer);
        renderAll();
      });
    }

    const filterOfferNameEl = document.getElementById('filterOfferName');
    const filterRoleEl = document.getElementById('filterRole');
    const filterLocationEl = document.getElementById('filterLocation');
    const filterPublishedDaysEl = document.getElementById('filterPublishedDays');

    if (filterOfferNameEl) filterOfferNameEl.addEventListener('input', renderAll);
    if (filterRoleEl) filterRoleEl.addEventListener('input', renderAll);
    if (filterLocationEl) filterLocationEl.addEventListener('input', renderAll);
    if (filterPublishedDaysEl) filterPublishedDaysEl.addEventListener('change', renderAll);

    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
