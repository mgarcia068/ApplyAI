(function () {
  const STORAGE_KEYS = {
    currentUser: 'ApplyAI.currentUser',
    applications: 'ApplyAI.applications',
  };

  const OFFERS = [
    {
      id: 'offer-frontend-jr',
      title: 'Desarrollador Frontend Jr',
      company: 'NovaTech',
      location: 'Remoto / AR',
    },
    {
      id: 'offer-backend-node',
      title: 'Backend Node.js',
      company: 'ByteWorks',
      location: 'Córdoba, AR',
    },
    {
      id: 'offer-qa-manual',
      title: 'QA Manual',
      company: 'QualityLab',
      location: 'Híbrido',
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
    const raw =
      localStorage.getItem(STORAGE_KEYS.currentUser);
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

  function createApplication(email, offer) {
    const apps = getAllApplications();

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
      <div class="empty-state" style="padding: var(--space-10) var(--space-6)">
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
        <article class="card card--flat" style="margin-top: var(--space-4)">
          <header class="flex items-start justify-between" style="gap: var(--space-4)">
            <div class="flex flex-col" style="gap: var(--space-1)">
              <div class="text-display" style="font-size: var(--text-md)">${offer.title}</div>
              <div class="text-xs text-muted flex items-center gap-1">
                <a href="perfil-empresa-publico.html" class="text-primary" style="text-decoration: underline; color: var(--color-primary);">${offer.company}</a> • ${offer.location}
              </div>
            </div>
            ${statusBadge}
          </header>

          <footer class="card__footer" style="justify-content: flex-end">
            ${actionButtonHtml}
          </footer>
        </article>
      `;
    }).join('');

    listEl.querySelectorAll('button[data-offer-id][data-action="apply"]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const action = btn.getAttribute('data-action');
        const offerId = btn.getAttribute('data-offer-id');
        const offer = OFFERS.find((o) => o.id === offerId);
        if (!offer || !email) return;

        if (action === 'apply') {
          createApplication(email, offer);
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

            const companyLink = app.company 
              ? `<a href="perfil-empresa-publico.html" class="text-primary" style="text-decoration: underline; color: var(--color-primary);">${app.company}</a>`
              : '';
            const locationPart = app.location ? ` • ${app.location}` : '';

            const withdrawBtnHtml = canWithdraw
              ? `
                <div class="applications-list__actions">
                  <button class="btn btn--danger btn--sm" type="button" data-action="withdraw" data-offer-id="${app.offerId}">
                    Despostularme
                  </button>
                </div>
              `
              : '';

            return `
              <div class="applications-list__item" data-offer-id="${app.offerId}">
                <div class="applications-list__top">
                  <div class="applications-list__meta">
                    <div class="applications-list__title truncate">${app.offerTitle || 'Oferta'}</div>
                    <div class="text-xs text-muted truncate">${companyLink}${locationPart}</div>
                  </div>
                  <span class="badge ${badgeClass}">${app.status || '—'}</span>
                </div>
                ${withdrawBtnHtml}
              </div>
            `;
          })
          .join('')}
      </div>
    `;

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

  function init() {
    const alertEl = document.getElementById('candidateDashboardAlert');

    const currentUser = getCurrentUser();
    const isAllowed = Boolean(currentUser && currentUser.email && currentUser.role === 'candidato');

    if (alertEl) alertEl.hidden = isAllowed;

    const email = isAllowed ? currentUser.email : '';

    renderOffers(email, isAllowed);
    renderApplications(email);

    if (!isAllowed) {
      // Deshabilitar botones para evitar acciones sin login.
      const offersList = document.getElementById('offersList');
      if (offersList) {
        offersList.querySelectorAll('button').forEach((b) => (b.disabled = true));
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
