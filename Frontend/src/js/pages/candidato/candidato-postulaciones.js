(function () {
  const STORAGE_KEYS = {
    currentUser: 'ApplyAI.currentUser',
    applications: 'ApplyAI.applications',
    offers: 'ApplyAI.offers',
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

  function getAllApplications() {
    const raw = localStorage.getItem(STORAGE_KEYS.applications);
    const parsed = raw ? safeJsonParse(raw, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function saveAllApplications(apps) {
    localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(apps));
  }

  
  async function fetchMyApplications(email) {
    try {
      const rawUser = localStorage.getItem('ApplyAI.currentUser');
      const token = rawUser ? JSON.parse(rawUser).token : '';
      if (!token) return [];
      const res = await axios.get('http://localhost:3000/api/applications', { headers: { Authorization: 'Bearer ' + token } });
      
      const apps = res.data.map(a => ({
        id: a.id,
        email: email,
        offerId: a.jobOfferId,
        offerTitle: a.jobOffer?.title || 'Oferta',
        company: a.jobOffer?.company?.user?.fullName || a.jobOffer?.company?.email || 'Empresa',
        location: a.jobOffer?.location || 'Remoto',
        status: a.status === 'PENDING' ? 'En revisión' : a.status === 'ACCEPTED' ? 'Aceptado' : a.status === 'VIEWED' ? 'Entrevista' : 'Rechazado',
        appliedAt: a.createdAt
      }));
      saveAllApplications(apps);
      return apps;
    } catch(e) { return []; }
  }

  function getApplicationsForEmail(email) {

    const normalized = String(email || '').trim().toLowerCase();
    return getAllApplications().filter((a) => String(a?.email || '').toLowerCase() === normalized);
  }

  function getApplication(email, offerId) {
    const normalized = String(email || '').trim().toLowerCase();
    const offerKey = String(offerId || '').trim();

    return (
      getAllApplications().find(
        (a) =>
          String(a?.email || '').toLowerCase() === normalized &&
          String(a?.offerId || '') === offerKey
      ) || null
    );
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

  function companyProfileUrl(companyId) {
    const id = String(companyId || '').trim();
    const base =
      typeof window.resolvePagePath === 'function'
        ? window.resolvePagePath('empresa/perfil-empresa-publico.html')
        : '../empresa/perfil-empresa-publico.html';
    return id ? `${base}?company=${encodeURIComponent(id)}` : base;
  }

  function canWithdrawApplication(app) {
    const status = normalizeText(app?.status);
    // Regla simple: permitir retirar solo si sigue en revisión (no avanzado).
    return status.includes('revision');
  }

  function hasApplied(email, offerId) {
    const normalized = String(email || '').trim().toLowerCase();
    const offerKey = String(offerId || '').trim();

    return getAllApplications().some(
      (a) =>
        String(a?.email || '').toLowerCase() === normalized &&
        String(a?.offerId || '') === offerKey
    );
  }

  async function createApplication(email, offer) {
    const apps = getAllApplications();
    if (hasApplied(email, offer.id)) return;
    const tempId = `temp_${Date.now()}`;
    const newApp = {
      id: tempId,
      email: String(email || '').trim().toLowerCase(),
      offerId: offer.id,
      offerTitle: offer.title,
      company: offer.company,
      location: offer.location,
      status: 'En revisión',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    apps.push(newApp);
    saveAllApplications(apps);
    renderApplications(email);
    try {
      const rawUser = localStorage.getItem('ApplyAI.currentUser');
      const token = rawUser ? JSON.parse(rawUser).token : '';
      const res = await axios.post('http://localhost:3000/api/applications', 
        { jobOfferId: offer.id },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      const currentApps = getAllApplications();
      const index = currentApps.findIndex(a => a.id === tempId);
      if (index !== -1) {
        currentApps[index].id = res.data.id;
        saveAllApplications(currentApps);
      }
      showToast('¡Postulación exitosa!', `Te has postulado a ${offer.title}`);
    } catch (e) {
      const rolledBack = getAllApplications().filter(a => a.id !== tempId);
      saveAllApplications(rolledBack);
      renderApplications(email);
      showToast('Error', 'No se pudo procesar la postulación.', 'error');
    }
  }

  /* Dummy replacement to delete old lines */
  function old_createApplication_lines() {


    if (hasApplied(email, offer.id)) return;

    const nowIso = new Date().toISOString();

    apps.push({
      id: `app_${offer.id}_${nowIso}`,
      email: String(email || '').trim().toLowerCase(),
      offerId: offer.id,
      offerTitle: offer.title,
      company: offer.company,
      location: offer.location,
      status: 'En revisión',
      appliedAt: nowIso,
      updatedAt: nowIso,
    });

    saveAllApplications(apps);
  }

  function removeApplication(email, offerId) {
    const normalized = String(email || '').trim().toLowerCase();
    const offerKey = String(offerId || '').trim();

    const nextApps = getAllApplications().filter(
      (a) =>
        !(
          String(a?.email || '').toLowerCase() === normalized &&
          String(a?.offerId || '') === offerKey
        )
    );

    saveAllApplications(nextApps);
  }

  function badgeClassForStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('acept')) return 'badge--success';
    if (s.includes('rechaz')) return 'badge--error';
    if (s.includes('revision') || s.includes('revisión')) return 'badge--info';
    return 'badge--neutral';
  }

  function emptyStateHtml(title, text) {
    return `
      <div class="empty-state empty-state--padded">
        <div class="empty-state__icon">✦</div>
        <div class="empty-state__title">${title}</div>
        <div class="empty-state__text">${text}</div>
      </div>
    `;
  }

  function renderOffers(email, isAllowed) {
    const listEl = document.getElementById('offersList');
    const countEl = document.getElementById('offersCount');
    if (!listEl) return;

    if (countEl) countEl.textContent = String(OFFERS.length);

    if (!OFFERS.length) {
      listEl.innerHTML = emptyStateHtml('No hay ofertas', 'Volvé más tarde para ver nuevas oportunidades.');
      return;
    }

    listEl.innerHTML = OFFERS.map((offer) => {
      const existingApp = email ? getApplication(email, offer.id) : null;
      const already = Boolean(existingApp);
      const companyId = slugify(offer.company);

      const statusBadge = already
        ? `<span class="badge ${badgeClassForStatus(existingApp.status)}">${existingApp.status || 'Postulado'}</span>`
        : '<span class="badge badge--neutral">Nueva</span>';

      // En "Ofertas disponibles" nunca mostramos "Despostularme".
      // Si ya está postulado, el botón queda apagado y dice "Postularme".
      const actionButtonHtml = !isAllowed
        ? `<button class="btn btn--primary btn--sm" type="button" disabled>Postularme</button>`
        : !already
          ? `
            <button class="btn btn--primary btn--sm" type="button" data-action="apply" data-offer-id="${offer.id}">
              Postularme
            </button>
          `
          : `
            <button class="btn btn--primary btn--sm" type="button" disabled>
              Postularme
            </button>
          `;

      return `
        <article class="card card--flat card--spaced-top">
          <header class="flex items-start justify-between header--gap-4">
            <div class="flex flex-col flex-col--gap-1">
              <div class="text-display text-display--md">${offer.title}</div>
              <div class="text-xs text-muted flex items-center gap-1">
                ${offer.company} • ${offer.location}
              </div>
            </div>
            ${statusBadge}
          </header>

          <footer class="card__footer card__footer--end">
            ${companyId ? `<button class="btn btn--secondary btn--sm" type="button" data-action="view-company" data-company-id="${companyId}">Ver empresa</button>` : ''}
            ${actionButtonHtml}
          </footer>
        </article>
      `;
    }).join('');

    listEl.querySelectorAll('button[data-company-id][data-action="view-company"]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const companyId = String(btn.getAttribute('data-company-id') || '').trim();
        if (!companyId) return;
        window.location.href = companyProfileUrl(companyId);
      });
    });

    listEl.querySelectorAll('button[data-offer-id][data-action="apply"]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const action = btn.getAttribute('data-action');
        const offerId = btn.getAttribute('data-offer-id');
        const offer = OFFERS.find((o) => o.id === offerId);
        if (!offer || !email) return;

        if (action === 'apply') {
          createApplication(email, offer);
          renderOffers(email, isAllowed);
          renderApplications(email);
          return;
        }

        renderOffers(email, isAllowed);
        renderApplications(email);
      });
    });
  }

  function renderApplications(email) {


    const listEl = document.getElementById('applicationsList');
    const countEl = document.getElementById('applicationsCount');
    if (!listEl) return;

    const apps = email ? getApplicationsForEmail(email) : [];
    const sorted = apps.slice().sort((a, b) => String(b?.appliedAt || '').localeCompare(String(a?.appliedAt || '')));

    if (countEl) countEl.textContent = String(sorted.length);

    if (!sorted.length) {
      listEl.innerHTML = emptyStateHtml('Aún no te postulaste', 'Elegí una oferta y presioná “Postularme”.');
      return;
    }

    listEl.innerHTML = `
      <div class="applications-list">
        ${sorted
          .map((app) => {
            const badgeClass = badgeClassForStatus(app.status);
            const canWithdraw = canWithdrawApplication(app);

            const companyName = String(app.company || '').trim();
            const companyId = slugify(companyName);
            const locationPart = app.location ? ` • ${app.location}` : '';

            const actions = [];

            if (companyId) {
              actions.push(
                `<button class="btn btn--secondary btn--sm applications-list__action-btn applications-list__action-btn--company" type="button" data-action="view-company" data-company-id="${companyId}">Ver empresa</button>`
              );
            }

            if (canWithdraw) {
              actions.push(
                `<button class="btn btn--danger btn--sm applications-list__action-btn applications-list__action-btn--withdraw" type="button" data-action="withdraw" data-offer-id="${app.offerId}">Despostularme</button>`
              );
            }

            const actionsHtml = actions.length
              ? `<div class="applications-list__actions">${actions.join('')}</div>`
              : '';

            return `
              <div class="applications-list__item" data-offer-id="${app.offerId}">
                <div class="applications-list__top">
                  <div class="applications-list__meta">
                    <div class="applications-list__title">${app.offerTitle || 'Oferta'}</div>
                    <div class="text-xs text-muted">${companyName}${locationPart}</div>
                  </div>
                  <span class="badge ${badgeClass}">${app.status || '—'}</span>
                </div>
                ${actionsHtml}
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    listEl.querySelectorAll('button[data-company-id][data-action="view-company"]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const companyId = String(btn.getAttribute('data-company-id') || '').trim();
        if (!companyId) return;
        window.location.href = companyProfileUrl(companyId);
      });
    });

    listEl.querySelectorAll('button[data-offer-id][data-action="withdraw"]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const offerId = btn.getAttribute('data-offer-id');
        if (!offerId || !email) return;
        const existingApp = getApplication(email, offerId);
        if (existingApp && canWithdrawApplication(existingApp)) {
          removeApplication(email, offerId);
          renderOffers(email, true);
          renderApplications(email);
        }
      });
    });
  }

  function renderApplications(email) {
    const listEl = document.getElementById('applicationsList');
    const countEl = document.getElementById('applicationsCount');
    if (!listEl) return;

    const apps = email ? getApplicationsForEmail(email) : [];
    const sorted = apps.slice().sort((a, b) => String(b?.appliedAt || '').localeCompare(String(a?.appliedAt || '')));

    if (countEl) countEl.textContent = String(sorted.length);

    if (!sorted.length) {
      listEl.innerHTML = emptyStateHtml('Aún no te postulaste', 'Elegí una oferta y presioná “Postularme”.');
      return;
    }

    listEl.innerHTML = `
      <div class="applications-list">
        ${sorted
          .map((app) => {
            const badgeClass = badgeClassForStatus(app.status);
            const canWithdraw = canWithdrawApplication(app);

            const companyName = String(app.company || '').trim();
            const companyId = slugify(companyName);
            const locationPart = app.location ? ` • ${app.location}` : '';

            const actions = [];

            if (companyId) {
              actions.push(
                `<button class="btn btn--secondary btn--sm applications-list__action-btn applications-list__action-btn--company" type="button" data-action="view-company" data-company-id="${companyId}">Ver empresa</button>`
              );
            }

            if (canWithdraw) {
              actions.push(
                `<button class="btn btn--danger btn--sm applications-list__action-btn applications-list__action-btn--withdraw" type="button" data-action="withdraw" data-offer-id="${app.offerId}">Despostularme</button>`
              );
            }

            const actionsHtml = actions.length
              ? `<div class="applications-list__actions">${actions.join('')}</div>`
              : '';

            return `
              <div class="applications-list__item" data-offer-id="${app.offerId}">
                <div class="applications-list__top">
                  <div class="applications-list__meta">
                    <div class="applications-list__title">${app.offerTitle || 'Oferta'}</div>
                    <div class="text-xs text-muted">${companyName}${locationPart}</div>
                  </div>
                  <span class="badge ${badgeClass}">${app.status || '—'}</span>
                </div>
                ${actionsHtml}
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    listEl.querySelectorAll('button[data-company-id][data-action="view-company"]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const companyId = String(btn.getAttribute('data-company-id') || '').trim();
        if (!companyId) return;
        window.location.href = companyProfileUrl(companyId);
      });
    });

    listEl.querySelectorAll('button[data-offer-id][data-action="withdraw"]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const offerId = btn.getAttribute('data-offer-id');
        if (!offerId || !email) return;

        const existingApp = getApplication(email, offerId);
        if (existingApp && canWithdrawApplication(existingApp)) {
          removeApplication(email, offerId);
          showToast('Postulación retirada', 'Te has despostulado correctamente.', 'info');
          renderOffers(email, true);
          renderApplications(email);
        }
      });
    });
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

  // --- INICIO DE EMERGENCIA: PRIORIDAD ALTA ---
  function immediateRender() {
    const currentUser = getCurrentUser();
    const email = currentUser?.email || '';
    const isAllowed = !!email;

    // 1. Mostrar ofertas de caché YA
    const cachedOffers = localStorage.getItem(STORAGE_KEYS.offers);
    if (cachedOffers) {
      OFFERS = safeJsonParse(cachedOffers, []);
      renderOffers(email, isAllowed);
    }

    // 2. Mostrar postulaciones de caché YA
    const cachedApps = localStorage.getItem(STORAGE_KEYS.applications);
    if (cachedApps && email) {
      renderApplications(email);
    }
  }

  async function init() {
    const alertEl = document.getElementById('candidateDashboardAlert');
    const currentUser = getCurrentUser();
    const isAllowed = Boolean(currentUser && currentUser.email && currentUser.role === 'candidato');
    const email = isAllowed ? currentUser.email : '';

    if (alertEl) alertEl.hidden = isAllowed;

    // Renderizado inmediato por si falla el setTimeout
    immediateRender();

    // Sincronización en ultra-segundo plano
    setTimeout(() => {
      // Sincronizar Ofertas
      axios.get('http://localhost:3000/api/jobs').then(res => {
        const fresh = res.data.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company?.user?.fullName || job.company?.email || 'Empresa',
          location: job.location || 'Remoto'
        }));
        OFFERS = fresh;
        localStorage.setItem(STORAGE_KEYS.offers, JSON.stringify(fresh));
        renderOffers(email, isAllowed);
      }).catch(() => {});

      // Sincronizar Postulaciones
      if (email && isAllowed) {
        fetchMyApplications(email).then(() => {
          renderApplications(email);
        });
      }
    }, 300);
  }

  // Ejecutar instantáneamente
  immediateRender();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
