(function () {
  const STORAGE_KEYS = {
    currentUser: 'ApplyAI.currentUser',
    applications: 'ApplyAI.applications',
  };

  let OFFERS = [];

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function normalizeRole(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'candidato' || normalized === 'cliente' || normalized === 'candidate') return 'candidato';
    if (normalized === 'empresa' || normalized === 'company') return 'empresa';
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

  function slugify(value) {
    const base = normalizeText(value);
    return base
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
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
  let canViewOffers = false;
  let canApplyToOffers = false;
  let currentPage = 1;
  let pageSize = 6;

  function getPageSize() {
    return pageSize;
  }

  function setPageSizeSelection(value) {
    const buttons = document.querySelectorAll('.page-size-tag');
    buttons.forEach((btn) => {
      const size = Number(btn.getAttribute('data-page-size') || 0);
      const isActive = size === value;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function hydratePageSizeFromDom() {
    const activeBtn = document.querySelector('.page-size-tag.is-active');
    const value = Number(activeBtn?.getAttribute('data-page-size') || pageSize);
    if (Number.isFinite(value) && value > 0) {
      pageSize = value;
      setPageSizeSelection(value);
    }
  }

  function setPaginationInfo(totalItems) {
    const pageInfoEl = document.getElementById('offersPageInfo');
    const prevBtn = document.getElementById('offersPrevBtn');
    const nextBtn = document.getElementById('offersNextBtn');

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    if (pageInfoEl) {
      pageInfoEl.textContent = `Pagina ${currentPage} de ${totalPages}`;
    }
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }

  function paginateOffers(offers) {
    pageSize = getPageSize();
    const totalPages = Math.max(1, Math.ceil(offers.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    return offers.slice(start, start + pageSize);
  }

  function renderList(offers, totalCount) {
    const listEl = document.getElementById('employeeOffersList');
    const countEl = document.getElementById('employeeOffersCount');
    if (!listEl) return;

    const total = typeof totalCount === 'number' ? totalCount : offers.length;
    if (countEl) countEl.textContent = String(total);

    if (!OFFERS.length) {
      listEl.innerHTML = `
        <div class="empty-state empty-state--padded">
          <div class="empty-state__icon">✦</div>
          <div class="empty-state__title">No hay ofertas</div>
          <div class="empty-state__text">Volvé más tarde para ver nuevas oportunidades.</div>
        </div>
      `;
      return;
    }

    if (!offers.length) {
      listEl.innerHTML = `
        <div class="empty-state empty-state--padded">
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
          ${canViewOffers ? '' : 'disabled'}
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
        if (!canViewOffers) return;
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
    const viewCompanyBtnEl = document.getElementById('viewCompanyBtn');

    if (!offer) {
      setText('offerDetailTitle', 'Oferta');
      setHidden('offerDetailEmpty', false);
      setHidden('offerDetail', true);
      if (statusBadgeEl) statusBadgeEl.hidden = true;
      if (applyBtnEl) applyBtnEl.hidden = true;
      if (viewCompanyBtnEl) {
        viewCompanyBtnEl.hidden = true;
        viewCompanyBtnEl.removeAttribute('data-company-id');
      }
      return;
    }

    setHidden('offerDetailEmpty', true);
    setHidden('offerDetail', false);

    setText('offerDetailTitle', offer.role || 'Oferta');
    setText('offerDetailCompany', offer.company ? `${offer.company} • ${offer.location}` : offer.location || '—');
    setText('offerDetailDescription', offer.description || '—');

    if (viewCompanyBtnEl) {
      const companyId = offer.company ? slugify(offer.company) : '';
      if (companyId) {
        viewCompanyBtnEl.hidden = false;
        viewCompanyBtnEl.setAttribute('data-company-id', companyId);
      } else {
        viewCompanyBtnEl.hidden = true;
        viewCompanyBtnEl.removeAttribute('data-company-id');
      }
    }

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

    const reqEl = document.getElementById('offerDetailRequirements');
    if (reqEl) {
      reqEl.innerHTML =
        (offer.requirements || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('') || '<li>—</li>';
    }

    const app = canApplyToOffers && currentUser?.email ? getApplication(currentUser.email, offer.id) : null;

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
      if (!canApplyToOffers || !currentUser?.email || app) {
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

    if (selectedOfferId) {
      const selectedIndex = offers.findIndex((o) => o.id === selectedOfferId);
      if (selectedIndex >= 0) {
        const targetPage = Math.floor(selectedIndex / pageSize) + 1;
        currentPage = targetPage;
      }
    }

    if (selectedOfferId && !offers.some((o) => o.id === selectedOfferId)) {
      selectedOfferId = '';
    }

    const pagedOffers = paginateOffers(offers);
    renderList(pagedOffers, offers.length);
    setPaginationInfo(offers.length);
    renderDetail();
  }

  
function showToast(title, subtitle = '', type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const typeColors = {
    success: { bg: '#10B981', color: 'white', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>' },
    info: { bg: '#3B82F6', color: 'white', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"></path></svg>' },
    error: { bg: '#EF4444', color: 'white', icon: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>' }
  };

  const styleDef = typeColors[type] || typeColors.success;

  toast.style.cssText = `
    background: ${styleDef.bg};
    color: ${styleDef.color};
    padding: 14px 20px;
    border-radius: 10px;
    box-shadow: 0 14px 20px -5px rgba(0, 0, 0, 0.15), 0 5px 7px -3px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: flex-start;
    gap: 14px;
    font-family: inherit;
    font-size: 14px;
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;
  
  toast.innerHTML = `
    <div style="flex-shrink: 0; padding-top: 1px;">
      ${styleDef.icon}
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <span style="font-weight: 600; line-height: 1.2;">${title}</span>
      ${subtitle ? `<span style="font-size: 13px; opacity: 0.85; line-height: 1.4;">${subtitle}</span>` : ''}
    </div>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => {
      if (toastContainer.contains(toast)) toastContainer.removeChild(toast);
    }, 350);
  }, 4000);
}

  async function init() {
    const alertEl = document.getElementById('employeeDashboardAlert');

    currentUser = getCurrentUser();
    const isLoggedIn = Boolean(currentUser && currentUser.email);
    canViewOffers = Boolean(
      isLoggedIn && (currentUser.role === 'candidato' || currentUser.role === 'empresa')
    );
    canApplyToOffers = Boolean(isLoggedIn && currentUser.role === 'candidato');

    if (alertEl) alertEl.hidden = canViewOffers;

    setDisabled('filterOfferName', !canViewOffers);
    setDisabled('filterRole', !canViewOffers);
    setDisabled('filterLocation', !canViewOffers);
    setDisabled('filterPublishedDays', !canViewOffers);
    setDisabled('offersPrevBtn', !canViewOffers);
    setDisabled('offersNextBtn', !canViewOffers);

    document.querySelectorAll('.page-size-tag').forEach((btn) => {
      btn.disabled = !canViewOffers;
    });

    if (
      canViewOffers &&
      typeof geoService !== 'undefined' &&
      typeof geoService.setupAutocomplete === 'function'
    ) {
      geoService.setupAutocomplete('#filterLocation');
    }

    try {
      const res = await axios.get(`${window.APP_CONFIG.API_URL}/api/jobs`);
      OFFERS = res.data.map(job => ({
        id: job.id,
        name: job.title,
        role: job.title,
        company: job.company?.user?.fullName || job.company?.email || 'Empresa',
        location: job.location || 'Remoto',
        publishedAt: job.createdAt,
        description: job.description,
        requirements: job.skillsRequired || []
      }));

      const rawUser = localStorage.getItem('ApplyAI.currentUser');
      if (rawUser) {
        const token = JSON.parse(rawUser).token;
        if (token) {
          const appsRes = await axios.get(`${window.APP_CONFIG.API_URL}/api/applications`, { headers: { Authorization: 'Bearer ' + token } });
          const mappedApps = appsRes.data.map(app => ({
            id: app.id,
            email: currentUser.email,
            offerId: app.jobOfferId,
            offerTitle: app.jobOffer?.title || 'Oferta',
            company: app.jobOffer?.company?.user?.fullName || app.jobOffer?.company?.email || 'Empresa',
            location: app.jobOffer?.location || 'Remoto',
            status: app.status === 'PENDING' ? 'En revisión' : app.status === 'VIEWED' ? 'En Entrevista' : app.status === 'ACCEPTED' ? 'Aceptado' : 'Rechazado',
            appliedAt: app.createdAt
          }));
          saveAllApplications(mappedApps);
        }
      }
    } catch (e) { console.error('Error fetching data', e); }

    const applyBtnEl = document.getElementById('applyOfferBtn');
    if (applyBtnEl) {
      applyBtnEl.addEventListener('click', async function () {
        if (!canApplyToOffers || !currentUser?.email) return;

        const offer = OFFERS.find((o) => o.id === selectedOfferId) || null;
        if (!offer) return;

        applyBtnEl.classList.add('is-loading');

        try {
          const rawUser = localStorage.getItem('ApplyAI.currentUser');
          const token = rawUser ? JSON.parse(rawUser).token : '';
          
          const [res] = await Promise.all([
            axios.post(`${window.APP_CONFIG.API_URL}/api/applications`, { jobOfferId: offer.id }, { headers: { Authorization: 'Bearer ' + token } }),
            new Promise(resolve => setTimeout(resolve, 600))
          ]);
          
          showToast('¡Postulación exitosa!', 'Tu postulación fue enviada correctamente.', 'success');
          
          // Guardar localmente y actualizar UI
          const apps = getAllApplications();
          apps.push({
            id: res.data.id || Math.random().toString(),
            email: currentUser.email,
            offerId: offer.id,
            offerTitle: offer.role,
            company: offer.company,
            location: offer.location,
            status: 'En revisión',
            appliedAt: new Date().toISOString()
          });
          saveAllApplications(apps);
          
          renderAll();
          renderDetail(); // Ocultar el botón inmediatamente
        } catch (e) {
          const errorMsg = e.response?.data?.message || 'Ya te postulaste a esta oferta o hubo un problema.';
          showToast('Error', errorMsg, 'error');
        } finally {
          applyBtnEl.classList.remove('is-loading');
        }
      });
    }

    const viewCompanyBtnEl = document.getElementById('viewCompanyBtn');
    if (viewCompanyBtnEl) {
      viewCompanyBtnEl.addEventListener('click', function () {
        const companyId = String(viewCompanyBtnEl.getAttribute('data-company-id') || '').trim();
        if (!companyId) return;

        const base =
          typeof window.resolvePagePath === 'function'
            ? window.resolvePagePath('empresa/perfil-empresa-publico.html')
            : '../empresa/perfil-empresa-publico.html';

        window.location.href = `${base}?company=${encodeURIComponent(companyId)}`;
      });
    }

    const filterOfferNameEl = document.getElementById('filterOfferName');
    const filterRoleEl = document.getElementById('filterRole');
    const filterLocationEl = document.getElementById('filterLocation');
    const filterPublishedDaysEl = document.getElementById('filterPublishedDays');
    const offersPageSizeTags = document.getElementById('offersPageSizeTags');
    const offersPrevBtn = document.getElementById('offersPrevBtn');
    const offersNextBtn = document.getElementById('offersNextBtn');

    if (filterOfferNameEl) {
      filterOfferNameEl.addEventListener('input', () => {
        currentPage = 1;
        renderAll();
      });
    }
    if (filterRoleEl) {
      filterRoleEl.addEventListener('input', () => {
        currentPage = 1;
        renderAll();
      });
    }
    if (filterLocationEl) {
      filterLocationEl.addEventListener('input', () => {
        currentPage = 1;
        renderAll();
      });
    }
    if (filterPublishedDaysEl) {
      filterPublishedDaysEl.addEventListener('change', () => {
        currentPage = 1;
        renderAll();
      });
    }
    if (offersPageSizeTags) {
      offersPageSizeTags.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const btn = target.closest('.page-size-tag');
        if (!btn) return;

        const size = Number(btn.getAttribute('data-page-size') || 0);
        if (!Number.isFinite(size) || size <= 0) return;

        pageSize = size;
        setPageSizeSelection(size);
        currentPage = 1;
        renderAll();
      });
    }

    hydratePageSizeFromDom();
    if (offersPrevBtn) {
      offersPrevBtn.addEventListener('click', () => {
        currentPage = Math.max(1, currentPage - 1);
        renderAll();
      });
    }
    if (offersNextBtn) {
      offersNextBtn.addEventListener('click', () => {
        currentPage += 1;
        renderAll();
      });
    }

    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
