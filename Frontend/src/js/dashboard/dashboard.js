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
  const enEntrevista     = POSTULANTES.filter(p => p.estado === 'Entrevista').length;
  const aceptados        = POSTULANTES.filter(p => p.estado === 'Aceptado').length;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Ofertas activas</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
      </div>
      <div class="stat-card__value">${ofertasActivas}</div>
      <div class="stat-card__delta" style="color: var(--color-success)">De ${totalOfertas} totales</div>
    </div>

    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Postulantes</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
      <div class="stat-card__value">${totalPostulantes}</div>
      <div class="stat-card__delta" style="color: var(--color-success)">Recibidos esta semana</div>
    </div>

    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">En Entrevista</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
      </div>
      <div class="stat-card__value">${enEntrevista}</div>
      <div class="stat-card__delta" style="color: var(--color-success)">Candidatos avanzando</div>
    </div>

    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Contratados</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
      </div>
      <div class="stat-card__value">${aceptados}</div>
      <div class="stat-card__delta" style="color: var(--color-success)">Nuevos talentos sumados</div>
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

  // Creamos una copia de la lista para poder ordenarla siempre
  let lista = [...(finalLista || baseLista)];
  lista.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

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
        // Obtenemos el nombre del puesto usando OFERTAS (dashboard-data.js)
        let puestoOferta = 'Puesto no especificado';
        if (typeof OFERTAS !== 'undefined') {
          const ofertaMatch = OFERTAS.find(o => o.id === p.ofertaId);
          if (ofertaMatch) puestoOferta = ofertaMatch.titulo;
        }

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
            <button onclick="abrirModalExplicacionIA('${p.nombre}', '${p.rating}', '${ratingColor}', '${ratingBg}', '${(p.skills || []).join(', ')}')" style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: ${ratingBg}; border: 2px solid ${ratingColor}; font-size: 11px; font-weight: 700; color: ${ratingColor}; cursor: pointer; padding: 0; outline: none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="Ver análisis de la IA">
              ${p.rating}
            </button>
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
          <div class="applicant-card__footer" style="margin-top: auto; border-top: 1px solid var(--color-surface); padding-top: var(--space-4); display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);">
            <div style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%;">
              <span style="color: var(--color-text-muted);">Postulado a:</span><br>
              <strong style="color: var(--color-primary); font-weight: 600;">${puestoOferta}</strong>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn btn--secondary cursor-pointer" style="height: 32px; font-size: var(--text-xs); padding: 0 var(--space-3);" onclick="visualizarCV('${p.nombre}', null, '${p.cvRating || ((p.id * 17 % 40) / 10 + 6.0).toFixed(1)}')">Ver CV</button>
              <select class="form-select cursor-pointer" style="padding: 4px 28px 4px 8px; font-size: var(--text-xs); height: 32px; min-width: 120px; background-color: var(--color-bg-3);" 
                onchange="cambiarEstadoCandidato(${p.id}, this.value)"
                ${p.estado === 'Aceptado' || p.estado === 'Rechazado' ? 'disabled' : ''}>
                <option value="Revisión" ${p.estado === 'Revisión' ? 'selected' : ''} ${p.estado === 'Entrevista' ? 'disabled' : ''}>En revisión</option>
                <option value="Entrevista" ${p.estado === 'Entrevista' ? 'selected' : ''}>Entrevista</option>
                <option value="Aceptado" ${p.estado === 'Aceptado' ? 'selected' : ''} ${p.estado === 'Revisión' ? 'disabled' : ''}>Aceptado</option>
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

function abrirModalExplicacionIA(nombre, rating, color, bg, skillsStr) {
  const ratingNum = parseFloat(rating);
  let explicacion = '';
  
  if (ratingNum >= 8.5) {
    explicacion = `<b>¡Excelente compatibilidad!</b> El perfil de ${nombre} se alinea en gran medida con los requerimientos de la vacante. Cuenta con dominio sólido comprobado en herramientas clave (${skillsStr || 'requeridas'}) y su trayectoria previa sugiere que podrá asumir el rol rápidamente minimizando la curva de aprendizaje.`;
  } else if (ratingNum >= 7.0) {
    explicacion = `<b>Buen encaje con potencial.</b> ${nombre} cumple con la mayor parte de las competencias solicitadas, mostrando experiencia en ${skillsStr || 'el área'}. Sería valioso profundizar en la entrevista sobre algunos de los requisitos faltantes, pero en general es un perfil viable para la posición.`;
  } else {
    explicacion = `<b>Perfil con oportunidades de desarrollo.</b> Actualmente, el perfil no parece cubrir los requisitos core que exige la postulación. Existe una escasez de las habilidades tecnológicas principales solicitadas y una divergencia en la experiencia requerida según nuestras ponderaciones predictivas.`;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.3s;';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background: var(--color-bg, #fff); color: var(--color-text, #111827); padding: 28px; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-width: 480px; width: 90%; transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative;';
  
  modal.innerHTML = `
    <button id="ia-close-btn" style="position: absolute; top: 16px; right: 16px; background: none; border: none; cursor: pointer; color: var(--color-text-muted, #6B7280); padding: 4px; border-radius: 4px;" onmouseover="this.style.background='var(--color-bg-3, #f3f4f6)'" onmouseout="this.style.background='none'">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: ${bg}; border: 3px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color}; font-size: 18px; font-weight: 800; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        ${rating}
      </div>
      <div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--color-text, #111827);">Análisis del Match</h3>
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color: #8B5CF6;"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: var(--color-text-muted, #6B7280);">Justificación de IA para <strong style="color: var(--color-text, #111827);">${nombre}</strong></p>
      </div>
    </div>
    <div style="background: var(--color-bg-3, rgba(243, 244, 246, 0.8)); padding: 20px; border-radius: 8px; border-left: 4px solid ${color}; font-size: 14px; line-height: 1.6; color: var(--color-text, #374151);">
      <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
        <span style="font-weight: 600; color: ${color}; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Resumen del Modelo Inteligente</span>
      </div>
      <div style="margin-top: 8px;">
        ${explicacion}
      </div>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });
  
  const close = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.95)';
    setTimeout(() => overlay.remove(), 300);
  };
  
  modal.querySelector('#ia-close-btn').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
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

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Animate out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 400);
  }, 4000); // 4 seconds duration to read subtitle
}

function showConfirmDialog(title, message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.3s;';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background: var(--color-bg, #fff); color: var(--color-text, #111827); padding: 28px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); max-width: 420px; width: 90%; transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
  
  modal.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center; color: #d97706;">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--color-text, #111827);">${title}</h3>
    </div>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: var(--color-text-muted, #4B5563); line-height: 1.6;">${message}</p>
    <div style="display: flex; justify-content: flex-end; gap: 12px;">
      <button id="btn-cancel" class="btn btn--ghost cursor-pointer" style="padding: 10px 16px;">Cancelar</button>
      <button id="btn-confirm" class="btn btn--primary cursor-pointer" style="padding: 10px 20px; border: none;">Confirmar</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });
  
  const close = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.95)';
    setTimeout(() => overlay.remove(), 300);
  };
  
  modal.querySelector('#btn-cancel').onclick = () => {
    close();
    if (onCancel) onCancel();
  };
  
  modal.querySelector('#btn-confirm').onclick = () => {
    close();
    if (onConfirm) onConfirm();
  };
}

function cambiarEstadoCandidato(id, nuevoEstado) {
  const candidato = POSTULANTES.find(p => p.id === id);
  if (!candidato) return;

  const performChange = () => {
    candidato.estado = nuevoEstado;
    if (nuevoEstado === 'Entrevista') {
      showToast('Candidato en Entrevista', `Se notificó por mail a ${candidato.nombre} los pasos a seguir.`, 'info');
    } else if (nuevoEstado === 'Aceptado') {
      showToast('¡Candidato Aceptado!', `Se envió propuesta formal a ${candidato.nombre} a su correo.`, 'success');
    } else if (nuevoEstado === 'Rechazado') {
      showToast('Candidato Rechazado', `Se envió mail de agradecimiento a ${candidato.nombre}.`, 'error');
    }
    applyPostulantesFilters(); // recarga
  };

  if (nuevoEstado === 'Aceptado' || nuevoEstado === 'Rechazado') {
    const isAceptado = nuevoEstado === 'Aceptado';
    showConfirmDialog(
      `Confirmar ${isAceptado ? 'Aceptación' : 'Rechazo'}`,
      `¿Estás seguro de querer <strong>${isAceptado ? 'aceptar' : 'rechazar'} a ${candidato.nombre}</strong>? 
       Esta acción no se puede deshacer y deshabilitará el selector de estado permanentemente.`,
      () => performChange(), // Si confirma, ejecuta
      () => applyPostulantesFilters() // Si cancela, re-renderiza con el estado original
    );
  } else {
    // Si es entrevista, no pregunta, solo cambia
    performChange();
  }
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

// ── VISUALIZAR CV ─────────────────────────────────────────────

function visualizarCV(nombreCandidato, urlOriginal = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', rating = '0.0') {
  const overlay = document.createElement('div');
  overlay.id = 'cv-preview-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 100500; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px);';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background: #fff; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); width: 90vw; max-width: 1000px; height: 90vh; display: flex; flex-direction: column; overflow: hidden;';
  
  const docUrl = urlOriginal || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  // Calcular color según rating IA (Idéntica lógica a la tarjeta)
  const ratingNum = parseFloat(rating);
  let ratingColor = '#3B82F6'; // Default azul
  let ratingBg = 'rgba(59, 130, 246, 0.1)';
  
  if (ratingNum >= 8.5) {
    ratingColor = '#10B981'; // Verde
    ratingBg = 'rgba(16, 185, 129, 0.1)';
  } else if (ratingNum >= 7.0) {
    ratingColor = '#F59E0B'; // Naranja/Amarillo
    ratingBg = 'rgba(245, 158, 11, 0.1)';
  } else {
    ratingColor = '#EF4444'; // Rojo // Fallback para low rating
    ratingBg = 'rgba(239, 68, 68, 0.1)';
  }

  modal.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; background: #fff;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center; color: #3B82F6;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"></path></svg>
        </div>
        <div style="display: flex; flex-direction: column;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">CV de ${nombreCandidato}</h3>
          <p style="margin: 0; font-size: 14px; color: #6B7280;">Previsualización del documento pdf</p>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: ${ratingBg}; border: 3px solid ${ratingColor}; font-size: 15px; font-weight: 700; color: ${ratingColor}; margin-left: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" title="Calidad del CV evaluada por IA separada del match">
          ${rating}
        </div>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <a href="${docUrl}" target="_blank" style="padding: 8px 16px; background: #f3f4f6; color: #374151; font-weight: 500; font-size: 13px; border-radius: 6px; text-decoration: none; display: flex; align-items: center; gap: 6px; border: 1px solid #d1d5db;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
          Abrir en pestaña
        </a>
        <button id="cv-close-btn" style="padding: 8px; width: 36px; height: 36px; background: none; border: none; color: #6B7280; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 6px;" onmouseover="this.style.background='#f3f4f6'; this.style.color='#ef4444';" onmouseout="this.style.background='none'; this.style.color='#6b7280';">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
    <div style="flex: 1; background: #525659; display: flex; align-items: center; justify-content: center;">
      <object data="${docUrl}" type="application/pdf" width="100%" height="100%">
        <iframe src="${docUrl}" width="100%" height="100%" style="border: none;">
          <p>Tu navegador no soporta PDFs embebidos. <a href="${docUrl}">Descarga el PDF aquí</a>.</p>
        </iframe>
      </object>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  const close = () => {
    overlay.remove();
  };
  
  modal.querySelector('#cv-close-btn').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
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

