const SECCIONES = {
  resumen:        { titulo: 'Resumen',         render: renderResumen },
  ofertas:        { titulo: 'Mis ofertas',      render: renderOfertas },
  postulantes:    { titulo: 'Postulantes',      render: renderPostulantesView },
  'nueva-oferta': { titulo: 'Publicar oferta',  render: renderNuevaOferta },
  perfil:         { titulo: 'Perfil empresa',   render: renderPerfil },
};

let seccionActual = 'resumen';

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
  document.getElementById('db-content').innerHTML = `
    <div class="stats-grid" id="stats-container"></div>
    <div style="margin-top:var(--space-8)">
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
  renderOfertasTable('ofertas-resumen-container');
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

const PERFIL_EMPRESA = {
  nombre:      'TechCorp Argentina',
  rubro:       'Tecnologia & Software',
  descripcion: 'Empresa de desarrollo de software con foco en soluciones B2B para el mercado latinoamericano.',
  web:         'https://techcorp.com.ar',
  ubicacion:   'Buenos Aires, Argentina',
  empleados:   '50-100',
  fundacion:   '2018',
};

function renderPerfil() {
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
          <div class="avatar avatar--xl" style="width:80px;height:80px;font-size:var(--text-2xl)">TC</div>
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
}

function togglePerfilEdit(editar) {
  const view = document.getElementById('perfil-view');
  const edit = document.getElementById('perfil-edit');
  const btn  = document.getElementById('btn-editar-perfil');
  if (!view || !edit) return;

  if (editar) {
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

  document.getElementById('view-nombre').textContent      = PERFIL_EMPRESA.nombre;
  document.getElementById('view-rubro').textContent       = PERFIL_EMPRESA.rubro;
  document.getElementById('view-descripcion').textContent = PERFIL_EMPRESA.descripcion;
  document.getElementById('view-ubicacion').textContent   = PERFIL_EMPRESA.ubicacion;
  document.getElementById('view-empleados').textContent   = PERFIL_EMPRESA.empleados;
  document.getElementById('view-fundacion').textContent   = PERFIL_EMPRESA.fundacion;
  const webEl = document.getElementById('view-web');
  if (webEl) {
    webEl.href = PERFIL_EMPRESA.web;
    document.getElementById('view-web-text').textContent = PERFIL_EMPRESA.web.replace('https://', '');
  }
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
  navigateTo('resumen');

  document.getElementById('sidebar-collapse')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
  });

  document.getElementById('sidebar-overlay')?.addEventListener('click', closeMobileSidebar);
});