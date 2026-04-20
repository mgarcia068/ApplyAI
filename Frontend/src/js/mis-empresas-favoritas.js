(function () {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function companyProfileUrl(companyId) {
    const id = String(companyId || '').trim();
    const base =
      typeof window.resolvePagePath === 'function'
        ? window.resolvePagePath('perfil-empresa-publico.html')
        : 'perfil-empresa-publico.html';

    return id ? `${base}?company=${encodeURIComponent(id)}` : base;
  }

  function renderFavorites(email) {
    const countEl = document.getElementById('favoritesCount');
    const emptyEl = document.getElementById('favoritesEmpty');
    const listEl = document.getElementById('favoritesList');
    if (!listEl) return;

    const service = window.ApplyAI?.followedCompanies;
    const companies = email && service && typeof service.list === 'function' ? service.list(email) : [];

    if (countEl) countEl.textContent = String(companies.length);

    if (!companies.length) {
      if (emptyEl) emptyEl.hidden = false;
      listEl.hidden = true;
      listEl.innerHTML = '';
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    listEl.hidden = false;

    listEl.innerHTML = companies
      .map((company) => {
        const id = String(company?.id || '').trim();
        const meta = [company?.industry, company?.location]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
          .join(' • ');

        return `
          <article class="card card--flat" style="padding: var(--space-4)">
            <div class="flex flex-col" style="gap: var(--space-3)">
              <div class="flex flex-col" style="gap: var(--space-1)">
                <div class="text-display" style="font-size: var(--text-base)">${escapeHtml(company?.name || 'Empresa')}</div>
                <div class="text-xs text-muted">${escapeHtml(meta || '—')}</div>
              </div>

              <div class="flex items-center justify-between" style="gap: var(--space-2)">
                <button class="btn btn--secondary btn--sm" type="button" data-action="view" data-company-id="${escapeHtml(id)}">
                  Ver empresa
                </button>
                <button class="btn btn--ghost btn--sm" type="button" data-action="unfollow" data-company-id="${escapeHtml(id)}">
                  Quitar
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    listEl.querySelectorAll('button[data-company-id]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const action = String(btn.getAttribute('data-action') || '').trim();
        const id = String(btn.getAttribute('data-company-id') || '').trim();
        if (!id) return;

        if (action === 'view') {
          window.location.href = companyProfileUrl(id);
          return;
        }

        if (action === 'unfollow') {
          const serviceRef = window.ApplyAI?.followedCompanies;
          if (!serviceRef || typeof serviceRef.unfollow !== 'function') return;
          serviceRef.unfollow(email, id);
          renderFavorites(email);
        }
      });
    });
  }

  function init() {
    const alertEl = document.getElementById('favoritesAlert');
    const countEl = document.getElementById('favoritesCount');
    const emptyEl = document.getElementById('favoritesEmpty');
    const listEl = document.getElementById('favoritesList');

    const service = window.ApplyAI?.followedCompanies;
    const user = service && typeof service.getCurrentUser === 'function' ? service.getCurrentUser() : null;
    const isAllowed = Boolean(user && user.email && user.role === 'candidato');

    if (alertEl) alertEl.hidden = isAllowed;

    if (!isAllowed) {
      if (countEl) countEl.textContent = '0';
      if (emptyEl) emptyEl.hidden = true;
      if (listEl) {
        listEl.hidden = true;
        listEl.innerHTML = '';
      }
      return;
    }

    renderFavorites(user.email);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
