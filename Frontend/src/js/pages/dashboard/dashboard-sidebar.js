const SECCIONES = {
  resumen:        { titulo: 'Resumen',         render: renderResumen },
  ofertas:        { titulo: 'Mis ofertas',      render: renderOfertas },
  postulantes:    { titulo: 'Postulantes',      render: renderPostulantesView },
  'nueva-oferta': { titulo: 'Publicar oferta',  render: renderNuevaOferta },
  perfil:         { titulo: 'Perfil empresa',   render: renderPerfil },
};

let seccionActual = 'resumen';

const DASHBOARD_MOBILE_BREAKPOINT = 1024;

function isMobileDashboardViewport() {
  return window.matchMedia(`(max-width: ${DASHBOARD_MOBILE_BREAKPOINT}px)`).matches;
}

function syncResumenContentMode() {
  const content = document.getElementById('db-content');
  if (!content) return;

  if (seccionActual !== 'resumen' || isMobileDashboardViewport()) {
    content.classList.remove('dashboard-content-fixed');
    return;
  }

  content.classList.add('dashboard-content-fixed');
}

function navigateTo(seccion, subtitulo) {
  const def = SECCIONES[seccion];
  if (!def) return;

  seccionActual = seccion;

  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) {
    topbarTitle.textContent = subtitulo ? `${def.titulo} — ${subtitulo}` : def.titulo;
  }

  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.classList.toggle('active', !!link.getAttribute('onclick')?.includes(`'${seccion}'`));
  });

  const content = document.getElementById('db-content');
  if (content) {
    if (seccion !== 'resumen') {
      content.classList.remove('dashboard-content-fixed');
    }
    content.innerHTML = '';
    content.style.animation = 'none';
    requestAnimationFrame(() => {
      content.style.animation = 'fadeIn 0.25s ease forwards';
      def.render();
    });
  }

  closeMobileSidebar();
}

function renderResumen() {
  const content = document.getElementById('db-content');
  syncResumenContentMode();
  content.innerHTML = `
    <div class="dashboard-header-fixed">
      <div style="padding-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">Resumen General</h1>
          <p style="color: var(--color-text-muted); margin: 0;">Vista rápida y analíticas de la empresa.</p>
      </div>
      <div class="stats-grid" id="stats-container"></div>
    </div>
    
    <div class="dashboard-scrollable-content" style="margin-top:var(--space-8)">
      <div class="section-header">
        <div>
          <div class="section-header__title">Ofertas recientes</div>
          <div class="section-header__sub">Ultimas publicaciones de tu empresa</div>
        </div>
        <button class="btn btn--ghost btn--sm" onclick="navigateTo('ofertas')">Ver todas</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div id="ofertas-resumen-container"></div>
      </div>
    </div>
  `;
  renderStats('stats-container');
  // mostrar solo las 3 ultimas ofertas para que no desborde y obligue a scrolear
  renderOfertasTable('ofertas-resumen-container', OFERTAS.slice(0, 3));
}

function renderOfertas() {
  document.getElementById('db-content').innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-header__title">Mis ofertas</div>
        <div class="section-header__sub">Gestiona todas tus publicaciones</div>
      </div>
      <button class="btn btn--primary btn--sm" onclick="navigateTo('nueva-oferta')">+ Nueva oferta</button>
    </div>

    <div class="filters-bar">
      <div class="form-group" style="flex: 1; margin-bottom: 0;">
        <input type="text" id="filter-search" class="form-input" placeholder="Buscar por puesto o área..." oninput="filtrarOfertas()">
      </div>
      <div class="form-group" style="width: 180px; margin-bottom: 0;">
        <select id="filter-estado" class="form-select" onchange="filtrarOfertas()">
          <option value="">Todos los estados</option>
          <option value="activa">Activas</option>
          <option value="pausada">Pausadas</option>
          <option value="cerrada">Cerradas</option>
        </select>
      </div>
      <div class="form-group" style="width: 180px; margin-bottom: 0;">
        <select id="filter-modalidad" class="form-select" onchange="filtrarOfertas()">
          <option value="">Todas las modalidades</option>
          <option value="Remoto">Remoto</option>
          <option value="Hibrido">Híbrido</option>
          <option value="Presencial">Presencial</option>
        </select>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div id="ofertas-container"></div>
    </div>
  `;
  renderOfertasTable('ofertas-container');
}

function renderPostulantesView() {
  const oferta = ofertaActivaId ? OFERTAS.find(o => o.id === ofertaActivaId) : null;
  document.getElementById('db-content').innerHTML = `
    <div class="section-header" style="margin-bottom: var(--space-4);">
      <div>
        <div class="section-header__title">
          ${oferta ? `Postulantes — ${oferta.titulo}` : 'Todos los postulantes'}
        </div>
        <div class="section-header__sub">Ordenados por compatibilidad segun IA</div>
      </div>
      <div style="display:flex; gap:var(--space-2)">
        ${ofertaActivaId ? `<button class="btn btn--ghost btn--sm" onclick="ofertaActivaId=null;navigateTo('postulantes')">Ver todos</button>` : ''}
      </div>
    </div>
    
    <div id="postulantes-filters" style="margin-bottom: var(--space-6);">
      <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label text-xs">Tecnologías (ej: React, Node)</label>
          <input type="text" class="form-input" id="filter-tech" placeholder="Buscar por skill..." onkeyup="applyPostulantesFilters()">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label text-xs">Años de experiencia</label>
          <select class="form-select" id="filter-exp" onchange="applyPostulantesFilters()">
            <option value="">Todas</option>
            <option value="Sin experiencia">Sin experiencia</option>
            <option value="1 año">1 año</option>
            <option value="2 años">2 años</option>
            <option value="3 años">3 años</option>
            <option value="5+ años">5+ años</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label text-xs">Estudios</label>
          <select class="form-select" id="filter-estudios" onchange="applyPostulantesFilters()">
            <option value="">Todos</option>
            <option value="Bootcamp">Bootcamp</option>
            <option value="Terciario">Terciario</option>
            <option value="Licenciatura">Licenciatura</option>
            <option value="Ingeniería">Ingeniería</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label text-xs">Estado</label>
          <select class="form-select" id="filter-estado" onchange="applyPostulantesFilters()">
            <option value="">Todos los estados</option>
            <option value="favorito">Solo Favoritos</option>
            <option value="Entrevista">Solamente Entrevistas</option>
            <option value="Revisión">En revisión</option>
            <option value="Aceptado">Aceptados</option>
            <option value="Rechazado">Rechazados</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end" style="margin-top: var(--space-3);">
         <button class="btn btn--ghost btn--sm cursor-pointer" onclick="limpiarPostulantesFilters()">Limpiar filtros</button>
      </div>
    </div>

    <div id="postulantes-container"></div>
  `;
  renderPostulantes('postulantes-container', ofertaActivaId);
}

function renderNuevaOferta() {
  document.getElementById('db-content').innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-header__title">Publicar nueva oferta</div>
        <div class="section-header__sub">Completa los datos del puesto que estas buscando</div>
      </div>
    </div>
    <div id="form-container"></div>
  `;
  renderFormOferta('form-container');
}

let currentUser = null;
try {
  const currentUserRaw = localStorage.getItem('ApplyAI.currentUser');
  if (currentUserRaw) currentUser = JSON.parse(currentUserRaw);
} catch (e) {}

const companyEmail = currentUser?.email || 'default@empresa.com';
const companyName = currentUser?.fullName || 'TechCorp Argentina';
const COMPANY_PHOTO_SCALE = 1.16;

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

function clearCompanyPhotoPan(imgEl) {
  if (!imgEl) return;
  imgEl.style.removeProperty('--photo-pan-x');
  imgEl.style.removeProperty('--photo-pan-y');
  imgEl.style.removeProperty('--photo-pan-scale');
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
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'TC';
}

let PERFIL_EMPRESA = {
  nombre:      companyName,
  rubro:       'Tecnologia & Software',
  descripcion: 'Empresa de desarrollo de software con foco en soluciones B2B para el mercado latinoamericano.',
  web:         'https://techcorp.com.ar',
  ubicacion:   'Buenos Aires, Argentina',
  empleados:   '50-100',
  fundacion:   '2018',
  photoDataUrl:'',
  photoPanX:   0,
  photoPanY:   0,
};

try {
  const savedPerfilRaw = localStorage.getItem(`ApplyAI.perfilEmpresa_${companyEmail}`);
  if (savedPerfilRaw) {
    const savedPerfil = JSON.parse(savedPerfilRaw);
    PERFIL_EMPRESA = { ...PERFIL_EMPRESA, ...savedPerfil };
  }
} catch (e) {}

let PERFIL_EMPRESA_EDIT_DRAFT = null;

function createPerfilEmpresaDraft() {
  const pan = getCompanyPhotoPan(PERFIL_EMPRESA);
  return {
    photoDataUrl: String(PERFIL_EMPRESA.photoDataUrl || ''),
    photoPanX: pan.x,
    photoPanY: pan.y,
  };
}

function resetPerfilEmpresaDraft() {
  PERFIL_EMPRESA_EDIT_DRAFT = createPerfilEmpresaDraft();
}

function getPerfilEmpresaDraft() {
  if (!PERFIL_EMPRESA_EDIT_DRAFT) {
    resetPerfilEmpresaDraft();
  }
  return PERFIL_EMPRESA_EDIT_DRAFT;
}

function syncPerfilEmpresaIdentityUi() {
  document.querySelectorAll('.sidebar__empresa-nombre, .user-dropdown__name').forEach(el => {
    el.textContent = PERFIL_EMPRESA.nombre;
  });

  document.querySelectorAll('.user-dropdown__email').forEach(el => {
    el.textContent = companyEmail;
  });

  const profilePan = getCompanyPhotoPan(PERFIL_EMPRESA);
  const source = {
    photoDataUrl: String(PERFIL_EMPRESA.photoDataUrl || ''),
    photoPanX: profilePan.x,
    photoPanY: profilePan.y,
  };

  syncCompanyAvatarSlot('topbar-user-btn', 'topbar-user-avatar-img', 'topbar-user-avatar-fallback', source);
  syncCompanyAvatarSlot('sidebar-company-avatar', 'sidebar-company-avatar-img', 'sidebar-company-avatar-fallback', source);
}

function syncPerfilEmpresaViewFields() {
  const nombreEl = document.getElementById('view-nombre');
  if (nombreEl) nombreEl.textContent = PERFIL_EMPRESA.nombre;

  const rubroEl = document.getElementById('view-rubro');
  if (rubroEl) rubroEl.textContent = PERFIL_EMPRESA.rubro;

  const descripcionEl = document.getElementById('view-descripcion');
  if (descripcionEl) descripcionEl.textContent = PERFIL_EMPRESA.descripcion;

  const ubicacionEl = document.getElementById('view-ubicacion');
  if (ubicacionEl) ubicacionEl.textContent = PERFIL_EMPRESA.ubicacion;

  const empleadosEl = document.getElementById('view-empleados');
  if (empleadosEl) empleadosEl.textContent = PERFIL_EMPRESA.empleados;

  const fundacionEl = document.getElementById('view-fundacion');
  if (fundacionEl) fundacionEl.textContent = PERFIL_EMPRESA.fundacion;

  const webEl = document.getElementById('view-web');
  if (webEl) webEl.href = PERFIL_EMPRESA.web;

  const webTextEl = document.getElementById('view-web-text');
  if (webTextEl) webTextEl.textContent = PERFIL_EMPRESA.web.replace('https://', '');
}

function syncCompanyAvatarSlot(viewportId, imageId, fallbackId, source) {
  const viewportEl = document.getElementById(viewportId);
  const imgEl = document.getElementById(imageId);
  const fallbackEl = document.getElementById(fallbackId);
  const initials = getCompanyInitials(PERFIL_EMPRESA.nombre);

  if (fallbackEl) fallbackEl.textContent = initials;
  if (!imgEl) return;

  const hasPhoto = Boolean(source?.photoDataUrl);
  if (!hasPhoto) {
    imgEl.hidden = true;
    imgEl.src = '';
    clearCompanyPhotoPan(imgEl);
    if (fallbackEl) fallbackEl.hidden = false;
    return;
  }

  imgEl.src = source.photoDataUrl;
  imgEl.hidden = false;
  if (fallbackEl) fallbackEl.hidden = true;
  if (viewportEl) {
    applyCompanyPhotoPan(
      imgEl,
      viewportEl,
      { x: source.photoPanX, y: source.photoPanY },
      COMPANY_PHOTO_SCALE,
    );
  }
}

function syncPerfilEmpresaAvatars() {
  const profilePan = getCompanyPhotoPan(PERFIL_EMPRESA);
  syncCompanyAvatarSlot('company-avatar-view', 'company-avatar-view-img', 'company-avatar-view-fallback', {
    photoDataUrl: String(PERFIL_EMPRESA.photoDataUrl || ''),
    photoPanX: profilePan.x,
    photoPanY: profilePan.y,
  });

  const draft = getPerfilEmpresaDraft();
  syncCompanyAvatarSlot('company-photo-edit-preview', 'company-photo-edit-img', 'company-photo-edit-fallback', draft);
}

function hydratePerfilEmpresaEditFields() {
  const nombreEl = document.getElementById('edit-nombre');
  if (nombreEl) nombreEl.value = PERFIL_EMPRESA.nombre;

  const rubroEl = document.getElementById('edit-rubro');
  if (rubroEl) rubroEl.value = PERFIL_EMPRESA.rubro;

  const descripcionEl = document.getElementById('edit-descripcion');
  if (descripcionEl) descripcionEl.value = PERFIL_EMPRESA.descripcion;

  const webEl = document.getElementById('edit-web');
  if (webEl) webEl.value = PERFIL_EMPRESA.web;

  const ubicacionEl = document.getElementById('edit-ubicacion');
  if (ubicacionEl) ubicacionEl.value = PERFIL_EMPRESA.ubicacion;

  const empleadosEl = document.getElementById('edit-empleados');
  if (empleadosEl) empleadosEl.value = PERFIL_EMPRESA.empleados;

  const fundacionEl = document.getElementById('edit-fundacion');
  if (fundacionEl) fundacionEl.value = PERFIL_EMPRESA.fundacion;
}

function initPerfilEmpresaPhotoEditor() {
  const photoInput = document.getElementById('edit-foto');
  const removePhotoBtn = document.getElementById('company-photo-remove-btn');
  const previewEl = document.getElementById('company-photo-edit-preview');
  const imgEl = document.getElementById('company-photo-edit-img');
  const errorEl = document.getElementById('company-photo-error');

  if (!photoInput || !removePhotoBtn || !previewEl || !imgEl) return;

  function showPhotoError(message) {
    if (errorEl) errorEl.textContent = String(message || '');
  }

  photoInput.addEventListener('change', async () => {
    showPhotoError('');
    const file = photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      showPhotoError('Selecciona una imagen valida.');
      photoInput.value = '';
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      showPhotoError('La imagen supera los 2MB.');
      photoInput.value = '';
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
      photoInput.value = '';
      return;
    }

    const draft = getPerfilEmpresaDraft();
    draft.photoDataUrl = dataUrl;
    draft.photoPanX = 0;
    draft.photoPanY = 0;
    syncPerfilEmpresaAvatars();
    photoInput.value = '';
  });

  removePhotoBtn.addEventListener('click', () => {
    showPhotoError('');
    const draft = getPerfilEmpresaDraft();
    draft.photoDataUrl = '';
    draft.photoPanX = 0;
    draft.photoPanY = 0;
    syncPerfilEmpresaAvatars();
    photoInput.value = '';
  });

  let dragging = false;
  let startClientX = 0;
  let startClientY = 0;
  let startPanX = 0;
  let startPanY = 0;

  function onGlobalPointerMove(e) {
    if (!dragging) return;

    const draft = getPerfilEmpresaDraft();
    if (!draft.photoDataUrl) return;

    e.preventDefault();

    const rect = previewEl.getBoundingClientRect();
    const maxX = (COMPANY_PHOTO_SCALE - 1) * rect.width * 0.5;
    const maxY = (COMPANY_PHOTO_SCALE - 1) * rect.height * 0.5;

    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;

    const startTx = maxX ? startPanX * maxX : 0;
    const startTy = maxY ? startPanY * maxY : 0;

    const nextTx = clampCompanyNumber(startTx + dx, -maxX, maxX);
    const nextTy = clampCompanyNumber(startTy + dy, -maxY, maxY);

    draft.photoPanX = maxX ? nextTx / maxX : 0;
    draft.photoPanY = maxY ? nextTy / maxY : 0;
    syncPerfilEmpresaAvatars();
  }

  function onGlobalPointerUp(e) {
    if (!dragging) return;
    e.preventDefault();
    dragging = false;
    window.removeEventListener('pointermove', onGlobalPointerMove);
    window.removeEventListener('pointerup', onGlobalPointerUp);
    window.removeEventListener('pointercancel', onGlobalPointerUp);
  }

  imgEl.addEventListener('dragstart', e => e.preventDefault());
  previewEl.addEventListener('dragstart', e => e.preventDefault());

  previewEl.addEventListener('pointerdown', e => {
    const draft = getPerfilEmpresaDraft();
    if (!draft.photoDataUrl) return;

    e.preventDefault();
    dragging = true;
    startClientX = e.clientX;
    startClientY = e.clientY;
    startPanX = clampCompanyNumber(draft.photoPanX, -1, 1);
    startPanY = clampCompanyNumber(draft.photoPanY, -1, 1);

    window.addEventListener('pointermove', onGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', onGlobalPointerUp, { passive: false });
    window.addEventListener('pointercancel', onGlobalPointerUp, { passive: false });
  });
}

function renderPerfil() {
  resetPerfilEmpresaDraft();

  document.getElementById('db-content').innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-header__title">Perfil de empresa</div>
        <div class="section-header__sub">Asi te ven los candidatos en la plataforma</div>
      </div>
      <button class="btn btn--ghost btn--sm" id="btn-editar-perfil" onclick="togglePerfilEdit(true)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Editar perfil
      </button>
    </div>

    <div id="perfil-view" class="perfil-panel">
      <div class="perfil-cover">
        <div class="perfil-cover__bg"></div>
        <div class="perfil-cover__avatar">
          <div class="avatar avatar--xl perfil-avatar-company" id="company-avatar-view" style="width:80px;height:80px;font-size:var(--text-2xl)">
            <img
              id="company-avatar-view-img"
              class="perfil-avatar-company__img"
              alt="Foto de la empresa"
              src=""
              draggable="false"
              hidden
            />
            <span id="company-avatar-view-fallback">TC</span>
          </div>
        </div>
      </div>
      <div class="perfil-body">
        <div class="perfil-info">
          <h2 class="perfil-info__nombre" id="view-nombre">${PERFIL_EMPRESA.nombre}</h2>
          <p class="perfil-info__rubro" id="view-rubro">${PERFIL_EMPRESA.rubro}</p>
          <div class="perfil-info__meta">
            <span class="perfil-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span id="view-ubicacion">${PERFIL_EMPRESA.ubicacion}</span>
            </span>
            <span class="perfil-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Desde <span id="view-fundacion">${PERFIL_EMPRESA.fundacion}</span>
            </span>
            <span class="perfil-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span id="view-empleados">${PERFIL_EMPRESA.empleados}</span> empleados
            </span>
            <a class="perfil-meta-item perfil-meta-item--link" id="view-web" href="${PERFIL_EMPRESA.web}" target="_blank">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span id="view-web-text">${PERFIL_EMPRESA.web.replace('https://', '')}</span>
            </a>
          </div>
        </div>
        <div class="perfil-desc">
          <div class="perfil-desc__label">Sobre la empresa</div>
          <p class="perfil-desc__text" id="view-descripcion">${PERFIL_EMPRESA.descripcion}</p>
        </div>
        <div class="perfil-ofertas-activas">
          <div class="perfil-desc__label">Ofertas activas</div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-3)">
            ${OFERTAS.filter(o => o.estado === 'activa').map(o => `
              <span class="badge badge--accent" style="cursor:pointer" onclick="verPostulantes(${o.id})">${o.titulo}</span>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <div id="perfil-edit" class="perfil-panel" style="display:none">
      <div class="form-card">
        <div class="form-card__title">Editar informacion de la empresa</div>
        <div class="form-grid">
          <div class="form-group form-grid--full">
            <label class="form-label">Foto de la empresa</label>
            <div class="perfil-photo-editor">
              <div
                id="company-photo-edit-preview"
                class="perfil-photo-editor__preview"
                role="img"
                aria-label="Foto de la empresa"
              >
                <img
                  id="company-photo-edit-img"
                  class="perfil-photo-editor__img"
                  alt="Previsualizacion de foto de empresa"
                  src=""
                  draggable="false"
                  hidden
                />
                <span id="company-photo-edit-fallback">TC</span>
              </div>
              <div class="perfil-photo-editor__actions">
                <label class="form-file" for="edit-foto">
                  <div class="text-sm">Subir foto</div>
                  <div class="text-xs text-muted">JPG/PNG/WebP (max. 2MB)</div>
                  <input id="edit-foto" type="file" accept="image/*" />
                </label>
                <button class="btn btn--ghost btn--sm" type="button" id="company-photo-remove-btn">Quitar foto</button>
                <div class="form-hint">Arrastra la imagen para centrarla dentro del circulo.</div>
                <div class="form-error" id="company-photo-error"></div>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre de la empresa</label>
            <input class="form-input" id="edit-nombre" value="${PERFIL_EMPRESA.nombre}">
          </div>
          <div class="form-group">
            <label class="form-label">Rubro</label>
            <input class="form-input" id="edit-rubro" value="${PERFIL_EMPRESA.rubro}">
          </div>
          <div class="form-group form-grid--full">
            <label class="form-label">Descripcion</label>
            <textarea class="form-textarea" id="edit-descripcion" rows="3">${PERFIL_EMPRESA.descripcion}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Sitio web</label>
            <input class="form-input" id="edit-web" value="${PERFIL_EMPRESA.web}">
          </div>
          <div class="form-group">
            <label class="form-label">Ubicacion</label>
            <input class="form-input" id="edit-ubicacion" value="${PERFIL_EMPRESA.ubicacion}">
          </div>
          <div class="form-group">
            <label class="form-label">Cantidad de empleados</label>
            <select class="form-select" id="edit-empleados">
              <option ${PERFIL_EMPRESA.empleados==='1-10'    ?'selected':''}>1-10</option>
              <option ${PERFIL_EMPRESA.empleados==='10-50'   ?'selected':''}>10-50</option>
              <option ${PERFIL_EMPRESA.empleados==='50-100'  ?'selected':''}>50-100</option>
              <option ${PERFIL_EMPRESA.empleados==='100-500' ?'selected':''}>100-500</option>
              <option ${PERFIL_EMPRESA.empleados==='500+'    ?'selected':''}>500+</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ano de fundacion</label>
            <input class="form-input" id="edit-fundacion" type="number" min="1900" max="2026" value="${PERFIL_EMPRESA.fundacion}">
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn--ghost" onclick="togglePerfilEdit(false)">Cancelar</button>
          <button class="btn btn--primary" onclick="guardarPerfil()">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;

  syncPerfilEmpresaViewFields();
  syncPerfilEmpresaAvatars();
  initPerfilEmpresaPhotoEditor();
}

function togglePerfilEdit(editar) {
  const view = document.getElementById('perfil-view');
  const edit = document.getElementById('perfil-edit');
  const btn  = document.getElementById('btn-editar-perfil');
  if (!view || !edit) return;

  if (editar) {
    resetPerfilEmpresaDraft();
    hydratePerfilEmpresaEditFields();
    syncPerfilEmpresaAvatars();

    view.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    view.style.opacity = '0';
    view.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      view.style.display = 'none';
      edit.style.display = 'block';
      edit.style.opacity = '0';
      edit.style.transform = 'translateY(8px)';
      edit.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      requestAnimationFrame(() => {
        edit.style.opacity = '1';
        edit.style.transform = 'translateY(0)';
      });
    }, 200);
    if (btn) btn.style.display = 'none';
  } else {
    edit.style.opacity = '0';
    edit.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      edit.style.display = 'none';
      view.style.display = 'block';
      view.style.opacity = '0';
      view.style.transform = 'translateY(8px)';
      requestAnimationFrame(() => {
        view.style.opacity = '1';
        view.style.transform = 'translateY(0)';
      });
    }, 200);
    if (btn) btn.style.display = '';
  }
}

function guardarPerfil() {
  PERFIL_EMPRESA.nombre      = document.getElementById('edit-nombre')?.value.trim()      || PERFIL_EMPRESA.nombre;
  PERFIL_EMPRESA.rubro       = document.getElementById('edit-rubro')?.value.trim()       || PERFIL_EMPRESA.rubro;
  PERFIL_EMPRESA.descripcion = document.getElementById('edit-descripcion')?.value.trim() || PERFIL_EMPRESA.descripcion;
  PERFIL_EMPRESA.web         = document.getElementById('edit-web')?.value.trim()         || PERFIL_EMPRESA.web;
  PERFIL_EMPRESA.ubicacion   = document.getElementById('edit-ubicacion')?.value.trim()   || PERFIL_EMPRESA.ubicacion;
  PERFIL_EMPRESA.empleados   = document.getElementById('edit-empleados')?.value          || PERFIL_EMPRESA.empleados;
  PERFIL_EMPRESA.fundacion   = document.getElementById('edit-fundacion')?.value          || PERFIL_EMPRESA.fundacion;

  const photoDraft = getPerfilEmpresaDraft();
  PERFIL_EMPRESA.photoDataUrl = String(photoDraft.photoDataUrl || '');
  PERFIL_EMPRESA.photoPanX = clampCompanyNumber(photoDraft.photoPanX, -1, 1);
  PERFIL_EMPRESA.photoPanY = clampCompanyNumber(photoDraft.photoPanY, -1, 1);

  if (PERFIL_EMPRESA.web && !/^https?:\/\//i.test(PERFIL_EMPRESA.web)) {
    PERFIL_EMPRESA.web = `https://${PERFIL_EMPRESA.web}`;
  }

  try {
    localStorage.setItem(`ApplyAI.perfilEmpresa_${companyEmail}`, JSON.stringify(PERFIL_EMPRESA));
    syncPerfilEmpresaIdentityUi();
  } catch (e) {
    console.error('Error saving company profile:', e);
  }

  syncPerfilEmpresaViewFields();
  syncPerfilEmpresaAvatars();
  togglePerfilEdit(false);
}

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('visible');
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
}

document.addEventListener('DOMContentLoaded', () => {
  syncPerfilEmpresaIdentityUi();

  navigateTo('resumen');

  document.getElementById('sidebar-collapse')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
  });

  document.getElementById('sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

  let resizeDebounce;
  window.addEventListener('resize', () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(syncResumenContentMode, 120);
  });
});