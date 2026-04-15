(function () {
  document.addEventListener('DOMContentLoaded', () => {
    checkAccess();
    renderCompanyOffers();
  });

  function checkAccess() {
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
          favoriteBtn.title = 'Inicia sesión como candidato para guardar en favoritos';
        }
        
        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
          followBtn.disabled = true;
          followBtn.title = 'Inicia sesión como candidato para seguir a la empresa';
        }
      }
    } catch(e) {
      window.location.href = '../index.html';
    }
  }

  const COMPANY_OFFERS = [
    {
      id: 'tcp-frontend',
      title: 'Frontend Developer Ssr',
      type: 'Remoto',
      date: 'Hace 2 días'
    },
    {
      id: 'tcp-backend',
      title: 'Backend Node.js Sr',
      type: 'Híbrido',
      date: 'Hace 5 días'
    },
    {
      id: 'tcp-pm',
      title: 'Product Manager',
      type: 'Presencial',
      date: 'Hace 1 semana'
    }
  ];

  function renderCompanyOffers() {
    const listEl = document.getElementById('companyOffersList');
    const countEl = document.getElementById('companyOffersCount');
    if (!listEl) return;

    if (countEl) countEl.textContent = String(COMPANY_OFFERS.length);

    if (COMPANY_OFFERS.length === 0) {
      listEl.innerHTML = `<div class="text-center text-muted" style="padding: var(--space-4)">Actualmente no hay búsquedas abiertas.</div>`;
      return;
    }

    listEl.innerHTML = COMPANY_OFFERS.map(offer => `
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

    // Función para mostrar mensajes temporales "Toast"
    function showToast(message, type = 'success') {
      let toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: var(--space-6); left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; flex-direction: column; gap: var(--space-2);';
        document.body.appendChild(toastContainer);
      }

      const toast = document.createElement('div');
      toast.className = `alert alert--${type === 'success' ? 'success' : 'info'}`;
      toast.style.cssText = 'box-shadow: var(--shadow-lg); animation: slideUp 0.3s ease-out forwards;';
      toast.innerHTML = `<span style="font-weight: 500">${message}</span>`;
      
      toastContainer.appendChild(toast);

      // Si no existe la animación
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

    // Toggle para el botón Seguir
    const followBtn = document.getElementById('followBtn');
    if (followBtn) {
      followBtn.addEventListener('click', () => {
        const currentUser = JSON.parse(localStorage.getItem('ApplyAI.currentUser') || '{}');
        if (!currentUser || currentUser.role !== 'candidato') return;

        const isFollowing = followBtn.classList.contains('btn--secondary');
        if (isFollowing) {
          followBtn.classList.remove('btn--secondary');
          followBtn.classList.add('btn--primary');
          followBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            Seguir
          `;
          showToast('Has dejado de seguir a la empresa.', 'info');
        } else {
          // Cambiar a "Siguiendo"
          followBtn.classList.remove('btn--primary');
          followBtn.classList.add('btn--secondary');
          followBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
            Siguiendo
          `;
          showToast('¡Ahora sigues a esta empresa!', 'success');
        }
      });
    }

    // Toggle para el botón Favorito (Corazón)
    const favoriteBtn = document.getElementById('favoriteCompanyBtn');
    if (favoriteBtn && !favoriteBtn.disabled) {
      favoriteBtn.addEventListener('click', () => {
        const currentUser = JSON.parse(localStorage.getItem('ApplyAI.currentUser') || '{}');
        if (!currentUser || currentUser.role !== 'candidato') return;

        const svg = favoriteBtn.querySelector('svg');
        const isFavorite = favoriteBtn.classList.contains('is-favorite');
        
        if (isFavorite) {
          favoriteBtn.classList.remove('is-favorite');
          svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'currentColor');
          showToast('Empresa removida de favoritos.', 'info');
        } else {
          favoriteBtn.classList.add('is-favorite');
          svg.setAttribute('fill', 'var(--color-primary)');
          svg.setAttribute('stroke', 'var(--color-primary)');
          showToast('¡Empresa añadida a favoritos!', 'success');
        }
      });
    }
  }
})();