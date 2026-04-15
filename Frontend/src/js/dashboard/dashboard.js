function getEstadoBadge(estado) {
  const map = {
    activa:  'badge--success',
    pausada: 'badge--warning',
    cerrada: 'badge--neutral',
  };
  return `<span class="badge ${map[estado] || 'badge--neutral'}">${estado}</span>`;
}

function getModalidadBadge(modalidad) {
  const map = {
    Remoto:     'badge--info',
    Hibrido:    'badge--accent',
    Presencial: 'badge--neutral',
  };
  return `<span class="badge ${map[modalidad] || 'badge--neutral'}">${modalidad}</span>`;
}

function buildSkillChips(skills) {
  return skills.map(s => `<span class="skill-chip">${s}</span>`).join('');
}

function buildMatchBar(match) {
  return `
    <div class="match-score">
      <div class="match-score__bar">
        <div class="match-score__fill" style="width: ${match}%"></div>
      </div>
      <span class="match-score__value">${match}%</span>
    </div>
  `;
}

function buildAvatarInitials(iniciales) {
  return `<div class="avatar avatar--md">${iniciales}</div>`;
}

function renderStats(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const totalPostulantes = POSTULANTES.length;
  const ofertasActivas   = OFERTAS.filter(o => o.estado === 'activa').length;
  const totalOfertas     = OFERTAS.length;
  const matchPromedio    = Math.round(POSTULANTES.reduce((a, p) => a + p.match, 0) / POSTULANTES.length);

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Ofertas activas</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
      </div>
      <div class="stat-card__value">${ofertasActivas}</div>
      <div class="stat-card__delta">&#x2191; de ${totalOfertas} totales</div>
    </div>

    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Postulantes</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
      <div class="stat-card__value">${totalPostulantes}</div>
      <div class="stat-card__delta">&#x2191; esta semana</div>
    </div>

    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Match promedio IA</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
      </div>
      <div class="stat-card__value">${matchPromedio}%</div>
      <div class="stat-card__delta">Calculado por IA</div>
    </div>

    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Total ofertas</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </div>
      </div>
      <div class="stat-card__value">${totalOfertas}</div>
      <div class="stat-card__delta">Historial completo</div>
    </div>
  `;
}

function renderOfertasTable(containerId, ofertasList = OFERTAS) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (ofertasList.length === 0) {
    el.innerHTML = `
      <div class="empty-box" style="border:none; border-radius:0;">
        <svg class="empty-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <div class="empty-box__title">No se encontraron ofertas</div>
        <p class="empty-box__text">Intenta con otra búsqueda o cambia los filtros.</p>
      </div>
    `;
    return;
  }

  const rows = ofertasList.map(o => `
    <tr data-id="${o.id}">
      <td>
        <div class="offer-title-cell">
          <span class="offer-title-cell__nombre">${o.titulo}</span>
          <span class="offer-title-cell__area">${o.area}</span>
          ${o.descripcion ? `<span class="offer-title-cell__desc">${o.descripcion}</span>` : ''}
        </div>
      </td>
      <td>
        <div class="offer-meta-cell">
          ${getModalidadBadge(o.modalidad)}
          <span class="offer-meta-cell__item">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${o.experiencia || '—'}
          </span>
          <span class="offer-meta-cell__item">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${o.ubicacion || '—'}
          </span>
          ${o.skills?.length ? `<div class="offer-meta-cell__skills">${o.skills.map(s => `<span class="skill-chip skill-chip--xs">${s}</span>`).join('')}</div>` : ''}
        </div>
      </td>
      <td>${getEstadoBadge(o.estado)}</td>
      <td><strong style="color:var(--color-text)">${o.postulantes}</strong></td>
      <td>${o.fecha}</td>
      <td>
        <div class="offers-table__actions">
          <button class="btn btn--ghost btn--sm" onclick="verPostulantes(${o.id})">Ver postulantes</button>
          <button class="btn btn--ghost btn--sm" onclick="abrirModalEditarOferta(${o.id})">Editar</button>
          <button class="btn btn--ghost btn--sm" onclick="eliminarOferta(${o.id})" style="color: var(--color-error)">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');

  el.innerHTML = `
    <table class="offers-table">
      <thead>
        <tr>
          <th>Puesto</th>
          <th>Detalles</th>
          <th>Estado</th>
          <th>Postulantes</th>
          <th>Publicada</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPostulantes(containerId, ofertaId, finalLista = null) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const baseLista = ofertaId
    ? POSTULANTES.filter(p => p.ofertaId === ofertaId)
    : POSTULANTES;

  const lista = finalLista || baseLista;

  if (lista.length === 0) {
    el.innerHTML = `
      <div class="empty-box">
        <svg class="empty-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <div class="empty-box__title">Sin postulantes todavia</div>
        <p class="empty-box__text">No hay candidatos o no coinciden con tus filtros.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="applicants-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4); align-items: stretch;">
      ${lista.map(p => {
        // Calcular color según rating
        const ratingNum = parseFloat(p.rating);
        let ratingColor = 'var(--color-primary)';
        let ratingBg = 'rgba(76, 175, 80, 0.1)';
        
        if (ratingNum >= 8.5) {
          ratingColor = '#10B981'; // Verde
          ratingBg = 'rgba(16, 185, 129, 0.1)';
        } else if (ratingNum >= 7.0) {
          ratingColor = '#F59E0B'; // Naranja/Amarillo
          ratingBg = 'rgba(245, 158, 11, 0.1)';
        } else {
          ratingColor = '#EF4444'; // Rojo
          ratingBg = 'rgba(239, 68, 68, 0.1)';
        }

        return `
        <div class="applicant-card" style="position: relative; display: flex; flex-direction: column; height: 100%;">
          <div style="position: absolute; top: var(--space-4); right: var(--space-4); z-index: 10; display: flex; align-items: center; gap: var(--space-2);">
            <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: ${ratingBg}; border: 2px solid ${ratingColor}; font-size: 11px; font-weight: 700; color: ${ratingColor};" title="Valoración de la IA para el puesto">
              ${p.rating}
            </div>
            <button class="btn btn--ghost btn--sm cursor-pointer" 
               style="padding: var(--space-1); width: 32px; height: 32px; color: ${p.favorito ? 'var(--color-primary)' : 'var(--color-text-muted)'}" 
               onclick="toggleCandidatoFavorito(${p.id})" title="${p.favorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="${p.favorito ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
          <div class="applicant-card__header">
            ${buildAvatarInitials(p.iniciales)}
            <div class="applicant-card__info" style="padding-right: var(--space-12);">
              <div class="applicant-card__name" style="font-weight: 600;">${p.nombre}</div>
              <div class="applicant-card__role text-xs text-muted mb-1">${p.rol}</div>
              <div class="flex items-center gap-2" style="font-size: var(--text-xs); color: var(--color-text-muted); flex-wrap: wrap;">
                ${p.experiencia ? `<span style="background:var(--color-bg-3); padding:2px 6px; border-radius:4px;">${p.experiencia}</span>` : ''}
                ${p.estudio ? `<span style="background:var(--color-bg-3); padding:2px 6px; border-radius:4px;">${p.estudio}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="applicant-card__skills" style="margin-top: var(--space-2); margin-bottom: var(--space-4);">
            ${buildSkillChips(p.skills)}
          </div>
          <div class="applicant-card__footer" style="margin-top: auto; border-top: 1px solid var(--color-surface); padding-top: var(--space-4); display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3);">
            <div class="flex items-center gap-2">
              <button class="btn btn--secondary cursor-pointer" style="height: 32px; font-size: var(--text-xs); padding: 0 var(--space-3);" onclick="alert('Descargando o Visualizando CV de ${p.nombre}...')">Ver CV</button>
              <select class="form-select cursor-pointer" style="padding: 4px 28px 4px 8px; font-size: var(--text-xs); height: 32px; min-width: 120px; background-color: var(--color-bg-3);" onchange="cambiarEstadoCandidato(${p.id}, this.value)">
                <option value="Revisión" ${p.estado === 'Revisión' ? 'selected' : ''}>En revisión</option>
                <option value="Entrevista" ${p.estado === 'Entrevista' ? 'selected' : ''}>Entrevista</option>
                <option value="Aceptado" ${p.estado === 'Aceptado' ? 'selected' : ''}>Aceptado</option>
                <option value="Rechazado" ${p.estado === 'Rechazado' ? 'selected' : ''}>Rechazado</option>
              </select>
            </div>
          </div>
        </div>
      `;
      }).join('')}
    </div>
  `;
}

function toggleCandidatoFavorito(id) {
  const candidato = POSTULANTES.find(p => p.id === id);
  if (candidato) candidato.favorito = !candidato.favorito;
  applyPostulantesFilters(); // recarga la grilla según el último filtro
}

function cambiarEstadoCandidato(id, nuevoEstado) {
  const candidato = POSTULANTES.find(p => p.id === id);
  if (candidato) candidato.estado = nuevoEstado;
  applyPostulantesFilters(); // recarga
}

function togglePostulantesFilters() {
  const f = document.getElementById('postulantes-filters');
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function limpiarPostulantesFilters() {
  ['filter-tech', 'filter-exp', 'filter-estudios', 'filter-estado'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  applyPostulantesFilters();
}

function applyPostulantesFilters() {
  const tech = document.getElementById('filter-tech')?.value.toLowerCase().trim() || '';
  const exp = document.getElementById('filter-exp')?.value || '';
  const estudios = document.getElementById('filter-estudios')?.value || '';
  const estado = document.getElementById('filter-estado')?.value || '';

  const baseLista = ofertaActivaId
    ? POSTULANTES.filter(p => p.ofertaId === ofertaActivaId)
    : POSTULANTES;

  const filtered = baseLista.filter(p => {
    // Skills / Tool search
    let matchesTech = true;
    if (tech) {
      matchesTech = p.skills.some(s => s.toLowerCase().includes(tech));
    }
    
    // Exact match para select de exp
    let matchesExp = true;
    if (exp) matchesExp = p.experiencia === exp;
    
    // Exact match para estudios
    let matchesEstudios = true;
    if (estudios) matchesEstudios = p.estudio === estudios;

    // Filtros de estado
    let matchesEstado = true;
    if (estado === 'favorito') matchesEstado = p.favorito === true;
    else if (estado) matchesEstado = p.estado === estado;

    return matchesTech && matchesExp && matchesEstudios && matchesEstado;
  });

  renderPostulantes('postulantes-container', ofertaActivaId, filtered);
}

function renderFormOferta(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="form-card">
      <div class="form-card__title">Informacion del puesto</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Nombre del puesto *</label>
          <input class="form-input" type="text" placeholder="ej: Frontend Developer Senior" id="oferta-titulo">
        </div>
        <div class="form-group">
          <label class="form-label">Area</label>
          <select class="form-select" id="oferta-area">
            <option value="">Seleccionar area</option>
            <option>Tecnologia</option>
            <option>Diseno</option>
            <option>Producto</option>
            <option>Datos</option>
            <option>Marketing</option>
            <option>Ventas</option>
            <option>Operaciones</option>
            <option>Otro</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Modalidad</label>
          <select class="form-select" id="oferta-modalidad">
            <option value="">Seleccionar modalidad</option>
            <option>Remoto</option>
            <option>Presencial</option>
            <option>Hibrido</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Experiencia minima</label>
          <select class="form-select" id="oferta-exp">
            <option value="">Seleccionar</option>
            <option>Sin experiencia</option>
            <option>1 año</option>
            <option>2 años</option>
            <option>3+ años</option>
            <option>5+ años</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ubicacion</label>
          <input class="form-input" type="text" placeholder="ej: Rosario, Cordoba, etc" id="oferta-ubicacion" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label">Habilidades requeridas</label>
          <input class="form-input" type="text" placeholder="ej: React, Node.js, SQL" id="oferta-skills">
        </div>
        <div class="form-group form-grid--full">
          <label class="form-label">Descripcion del puesto *</label>
          <textarea class="form-textarea" rows="5" placeholder="Describe las responsabilidades, el equipo y lo que buscas en el candidato ideal..." id="oferta-desc" style="min-height:130px"></textarea>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn--ghost" onclick="cancelarOferta()">Cancelar</button>
        <button class="btn btn--primary" onclick="publicarOferta()">Publicar oferta</button>
      </div>
    </div>
  `;

  if (typeof geoService !== 'undefined') {
    geoService.setupAutocomplete('#oferta-ubicacion');
  }
}

let ofertaActivaId = null;

function verPostulantes(ofertaId) {
  ofertaActivaId = ofertaId;
  const oferta = OFERTAS.find(o => o.id === ofertaId);
  navigateTo('postulantes', oferta ? oferta.titulo : '');
}

function publicarOferta() {
  const tituloEl = document.getElementById('oferta-titulo');
  const descEl   = document.getElementById('oferta-desc');
  const areaEl   = document.getElementById('oferta-area');
  const modEl    = document.getElementById('oferta-modalidad');
  const expEl    = document.getElementById('oferta-exp');
  const ubicEl   = document.getElementById('oferta-ubicacion');
  const skillsEl = document.getElementById('oferta-skills');

  const titulo = tituloEl?.value.trim();
  const desc   = descEl?.value.trim();

  if (tituloEl) tituloEl.classList.remove('form-input--error');
  if (descEl) descEl.classList.remove('form-input--error');

  if (!titulo || !desc) {
    if (!titulo && tituloEl) tituloEl.classList.add('form-input--error');
    if (!desc && descEl) descEl.classList.add('form-input--error');
    alert('Por favor, completa los campos obligatorios (Título y Descripción).');
    return;
  }

  // Parsear skills (separadas por coma)
  const skillsRaw = skillsEl?.value || '';
  const parsedSkills = skillsRaw.split(',').map(s => s.trim()).filter(s => s);

  OFERTAS.unshift({
    id: OFERTAS.length + 1,
    titulo,
    descripcion: desc,
    area:        areaEl?.value || 'Otro',
    modalidad:   modEl?.value || 'Remoto',
    experiencia: expEl?.value || 'Sin experiencia',
    ubicacion:   ubicEl?.value.trim() || 'No especificada',
    skills:      parsedSkills,
    estado:      'activa',
    postulantes: 0,
    fecha:       new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }),
  });

  navigateTo('ofertas');
}

function cancelarOferta() {
  navigateTo('ofertas');
}
function filtrarOfertas() {
  const searchTerm = document.getElementById('filter-search')?.value.toLowerCase() || '';
  const estado = document.getElementById('filter-estado')?.value || '';
  const modalidad = document.getElementById('filter-modalidad')?.value || '';

  const filtradas = OFERTAS.filter(o => {
    const matchSearch = o.titulo.toLowerCase().includes(searchTerm) || o.area.toLowerCase().includes(searchTerm);
    const matchEstado = estado === '' || o.estado === estado;
    const matchModalidad = modalidad === '' || o.modalidad === modalidad;
    return matchSearch && matchEstado && matchModalidad;
  });

  renderOfertasTable('ofertas-container', filtradas);
}

function eliminarOferta(id) {
  // Crear modal de confirmación personalizado en vez de confirm()
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop modal-backdrop--visible';
  modal.innerHTML = `
    <div class="modal-panel modal-panel--visible" style="width: 400px; max-width: calc(100vw - 32px);">
      <div class="modal-panel__header">
        <div class="modal-panel__title" style="color: var(--color-error)">Eliminar Oferta</div>
      </div>
      <div class="modal-panel__body">
        ¿Estás seguro de que deseás eliminar permanentemente esta oferta? Esta acción no se puede deshacer y borrará a los postulantes asociados.
      </div>
      <div class="modal-panel__footer">
        <button class="btn btn--ghost" id="conf-cancelar">Cancelar</button>
        <button class="btn btn--danger" id="conf-eliminar">Sí, eliminar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Funciones de limpiar
  const cleanup = () => modal.remove();

  modal.querySelector('#conf-cancelar').addEventListener('click', cleanup);
  
  modal.querySelector('#conf-eliminar').addEventListener('click', () => {
    const index = OFERTAS.findIndex(o => o.id === id);
    if (index > -1) {
      OFERTAS.splice(index, 1);
      filtrarOfertas();
    }
    cleanup();
  });
}

// ── MODAL EDITAR OFERTA ───────────────────────────────────────

function abrirModalEditarOferta(ofertaId) {
  const oferta = OFERTAS.find(o => o.id === ofertaId);
  if (!oferta) return;

  document.getElementById('modal-editar-oferta')?.remove();

  const areas        = ['Tecnologia', 'Diseno', 'Producto', 'Datos', 'Marketing', 'Ventas', 'Operaciones', 'Otro'];
  const modalidades  = ['Remoto', 'Presencial', 'Hibrido'];
  const estados      = ['activa', 'pausada', 'cerrada'];
  const experiencias = ['Sin experiencia', '1 año', '2 años', '3+ años', '5+ años'];

  const optAreas       = areas.map(a        => `<option ${oferta.area        === a ? 'selected' : ''}>${a}</option>`).join('');
  const optModalidades = modalidades.map(m   => `<option ${oferta.modalidad  === m ? 'selected' : ''}>${m}</option>`).join('');
  const optEstados     = estados.map(e       => `<option value="${e}" ${oferta.estado      === e ? 'selected' : ''}>${e.charAt(0).toUpperCase() + e.slice(1)}</option>`).join('');
  const optExp         = experiencias.map(x  => `<option ${oferta.experiencia === x ? 'selected' : ''}>${x}</option>`).join('');

  const modal = document.createElement('div');
  modal.id = 'modal-editar-oferta';
  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop-oferta" onclick="cerrarModalEditarOferta()"></div>
    <div class="modal-panel modal-panel--lg" id="modal-panel-oferta" role="dialog" aria-modal="true" aria-labelledby="modal-oferta-titulo">
      <div class="modal-panel__header">
        <div>
          <div class="modal-panel__title" id="modal-oferta-titulo">Editar oferta</div>
          <div class="modal-panel__sub">${oferta.titulo}</div>
        </div>
        <button class="modal-panel__close" onclick="cerrarModalEditarOferta()" aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-panel__body">
        <div class="form-grid">
          <div class="form-group form-grid--full">
            <label class="form-label">Nombre del puesto *</label>
            <input class="form-input" type="text" id="edit-oferta-titulo" value="${oferta.titulo}">
          </div>
          <div class="form-group">
            <label class="form-label">Area</label>
            <select class="form-select" id="edit-oferta-area">${optAreas}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Modalidad</label>
            <select class="form-select" id="edit-oferta-modalidad">${optModalidades}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Experiencia minima</label>
            <select class="form-select" id="edit-oferta-exp">${optExp}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-select" id="edit-oferta-estado">${optEstados}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Ubicacion</label>
            <input class="form-input" type="text" id="edit-oferta-ubicacion" placeholder="ej: Rosario, Cordoba, etc" autocomplete="off" value="${oferta.ubicacion || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Habilidades requeridas</label>
            <input class="form-input" type="text" id="edit-oferta-skills" placeholder="ej: React, Node.js, SQL" value="${(oferta.skills || []).join(', ')}">
          </div>
          <div class="form-group form-grid--full">
            <label class="form-label">Descripcion del puesto *</label>
            <textarea class="form-textarea" rows="4" id="edit-oferta-desc" style="min-height:110px">${oferta.descripcion || ''}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-panel__footer">
        <button class="btn btn--ghost" onclick="cerrarModalEditarOferta()">Cancelar</button>
        <button class="btn btn--primary" onclick="guardarOferta(${ofertaId})">Guardar cambios</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (typeof geoService !== 'undefined') {
    geoService.setupAutocomplete('#edit-oferta-ubicacion');
  }

  requestAnimationFrame(() => {
    modal.querySelector('.modal-backdrop').classList.add('modal-backdrop--visible');
    modal.querySelector('.modal-panel').classList.add('modal-panel--visible');
  });

  modal._onKeyDown = (e) => { if (e.key === 'Escape') cerrarModalEditarOferta(); };
  document.addEventListener('keydown', modal._onKeyDown);
}

function cerrarModalEditarOferta() {
  const modal = document.getElementById('modal-editar-oferta');
  if (!modal) return;

  modal.querySelector('.modal-panel').classList.remove('modal-panel--visible');
  modal.querySelector('.modal-backdrop').classList.remove('modal-backdrop--visible');

  document.removeEventListener('keydown', modal._onKeyDown);

  setTimeout(() => modal.remove(), 250);
}

function guardarOferta(ofertaId) {
  const oferta = OFERTAS.find(o => o.id === ofertaId);
  if (!oferta) return;

  const nuevoTitulo = document.getElementById('edit-oferta-titulo')?.value.trim();
  if (!nuevoTitulo) {
    document.getElementById('edit-oferta-titulo')?.focus();
    return;
  }

  const skillsRaw = document.getElementById('edit-oferta-skills')?.value || '';

  oferta.titulo      = nuevoTitulo;
  oferta.area        = document.getElementById('edit-oferta-area')?.value            || oferta.area;
  oferta.modalidad   = document.getElementById('edit-oferta-modalidad')?.value       || oferta.modalidad;
  oferta.experiencia = document.getElementById('edit-oferta-exp')?.value             || oferta.experiencia;
  oferta.estado      = document.getElementById('edit-oferta-estado')?.value          || oferta.estado;
  oferta.ubicacion   = document.getElementById('edit-oferta-ubicacion')?.value.trim() || oferta.ubicacion;
  oferta.descripcion = document.getElementById('edit-oferta-desc')?.value.trim()      || oferta.descripcion;
  oferta.skills      = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);

  cerrarModalEditarOferta();

  if (seccionActual === 'resumen') {
    renderOfertasTable('ofertas-resumen-container');
  } else if (seccionActual === 'ofertas') {
    filtrarOfertas();
  }
}

// User Dropdown toggle
document.addEventListener("DOMContentLoaded", () => {
    const userBtn = document.getElementById("topbar-user-btn");
    const userDropdown = document.getElementById("topbar-user-dropdown");

    if (userBtn && userDropdown) {
        userBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle("show");
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!userDropdown.contains(e.target)) {
                userDropdown.classList.remove("show");
            }
        });
    }
});

