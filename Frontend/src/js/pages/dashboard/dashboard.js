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

  // Cálculo de recibidos esta semana (7 días atrás)
  const ahora = new Date();
  const haceUnaSemana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 7);
  const recibidosEstaSemana = POSTULANTES.filter(p => {
    const fechaP = new Date(p.fecha);
    return fechaP >= haceUnaSemana;
  }).length;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Ofertas activas</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
      </div>
      <div class="stat-card__value">${ofertasActivas}</div>
      <div class="stat-card__delta text-success">De ${totalOfertas} totales</div>
    </div>

    <div class="stat-card">
      <div class="stat-card__top">
        <span class="stat-card__label">Postulantes</span>
        <div class="stat-card__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
      <div class="stat-card__value">${totalPostulantes}</div>
      <div class="stat-card__delta ${recibidosEstaSemana > 0 ? 'text-success' : ''}">${recibidosEstaSemana} recibidos esta semana</div>
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
      <div class="stat-card__delta ${enEntrevista > 0 ? 'text-success' : ''}">Candidatos avanzando</div>
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
      <div class="stat-card__delta ${aceptados > 0 ? 'text-success' : ''}">Nuevos talentos sumados</div>
    </div>
  `;
}

function renderOfertasTable(containerId, ofertasList = OFERTAS) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (ofertasList.length === 0) {
    el.innerHTML = `
      <div class="empty-box border-none radius-0">
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
      <td><strong class="text-default">${o.postulantes}</strong></td>
      <td>${o.fecha}</td>
      <td>
        <div class="offers-table__actions">
          <button class="btn btn--ghost btn--sm" onclick="verPostulantes('${o.id}')">Ver postulantes</button>
          <button class="btn btn--ghost btn--sm" onclick="abrirModalEditarOferta('${o.id}')">Editar</button>
          <button class="btn btn--ghost btn--sm text-error" onclick="eliminarOferta('${o.id}')">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');

  el.innerHTML = `
    <div class="offers-table-scroll" role="region" aria-label="Tabla de ofertas" tabindex="0">
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
    </div>
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
        <p class="empty-box__text">Aún no hay candidatos para esta oferta o ninguno coincide con tus filtros.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="applicants-grid grid-cards">
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
        <div class="applicant-card">
          <div class="card-top-right" style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px; align-items: center;">
            <button onclick="abrirModalExplicacionIA('${p.id}')" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: ${ratingBg}; border: 2px solid ${ratingColor}; font-size: 12px; font-weight: 700; color: ${ratingColor}; cursor: pointer; padding: 0;" title="Ver análisis de la IA">
              ${p.rating}
            </button>
            <button class="btn btn--ghost btn--sm cursor-pointer" 
               style="padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: ${p.favorito ? 'var(--color-primary)' : 'var(--color-text-muted)'}" 
               onclick="toggleCandidatoFavorito('${p.id}')" title="${p.favorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${p.favorito ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
          <div class="applicant-card__header flex gap-4 items-start mb-4">
            ${p.photoUrl ? `<img src="${p.photoUrl}" class="avatar avatar--lg" style="width: 56px; height: 56px; border-radius: 12px; object-fit: cover;" alt="Foto de ${p.nombre}">` : `<div class="avatar avatar--lg" style="width: 56px; height: 56px; border-radius: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center;">${p.iniciales}</div>`}
            <div class="applicant-card__info flex-1 min-w-0">
              <div class="font-semibold text-base color-text mb-1">${p.nombre}</div>
              <div class="text-xs text-muted mb-1">${p.rol}</div>
              <div class="flex flex-col text-xs text-muted" style="gap: 2px;">
                ${p.experiencia ? `<div class="flex items-center gap-1"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg><span>${p.experiencia}</span></div>` : ''}
                ${p.estudio ? `<div class="flex items-center gap-1"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.825-3.055 12.083 12.083 0 01.665-6.479L12 14z"></path></svg><span>${p.estudio}</span></div>` : ''}
              </div>
            </div>
          </div>
          <div class="applicant-card__skills flex flex-wrap gap-2 my-3">
            ${p.skills.map(s => `<span class="skill-chip">${s}</span>`).join('')}
          </div>
          <div class="applicant-card__footer card__footer flex justify-between items-center mt-auto pt-3">
            <div class="text-xs">
              <span class="text-muted">Postulado a:</span><br>
              <strong class="text-accent font-semibold">${puestoOferta}</strong>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn btn--secondary btn--sm cursor-pointer" onclick="visualizarCV('${p.nombre}', '${p.cvUrl}', '${p.cvRating || '0.0'}')">Ver CV</button>
              <select class="form-select cursor-pointer" 
                style="width: auto; padding: var(--space-1) var(--space-3); font-size: var(--text-xs);"
                onchange="cambiarEstadoCandidato('${p.id}', this.value, this)"
                ${p.estado === 'Aceptado' || p.estado === 'Rechazado' ? 'disabled' : ''}>
                <option value="Revisión" style="background: var(--color-bg, #111827); color: var(--color-text, #fff);" ${p.estado === 'Revisión' ? 'selected' : ''} ${p.estado === 'Entrevista' ? 'disabled' : ''}>En revisión</option>
                <option value="Entrevista" style="background: var(--color-bg, #111827); color: var(--color-text, #fff);" ${p.estado === 'Entrevista' ? 'selected' : ''}>Entrevista</option>
                <option value="Aceptado" style="background: var(--color-bg, #111827); color: var(--color-text, #fff);" ${p.estado === 'Aceptado' ? 'selected' : ''} ${p.estado === 'Revisión' ? 'disabled' : ''}>Aceptado</option>
                <option value="Rechazado" style="background: var(--color-bg, #111827); color: var(--color-text, #fff);" ${p.estado === 'Rechazado' ? 'selected' : ''}>Rechazado</option>
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

function abrirModalExplicacionIA(postulanteId) {
  const p = POSTULANTES.find(cand => cand.id === postulanteId);
  if (!p) return;

  const ratingNum = parseFloat(p.rating);
  let color = '#EF4444';
  let bg = 'rgba(239, 68, 68, 0.1)';
  
  if (ratingNum >= 8.5) {
    color = '#10B981';
    bg = 'rgba(16, 185, 129, 0.1)';
  } else if (ratingNum >= 7.0) {
    color = '#F59E0B';
    bg = 'rgba(245, 158, 11, 0.1)';
  }

  let explicacion = '';
  if (ratingNum >= 8.5) {
    explicacion = `<b>¡Excelente compatibilidad!</b> El perfil de ${p.nombre} se alinea en gran medida con los requerimientos de la vacante. Cuenta con un dominio sólido comprobado en las herramientas clave y su trayectoria previa sugiere un desempeño exitoso.`;
  } else if (ratingNum >= 7.0) {
    explicacion = `<b>Buen encaje con potencial.</b> ${p.nombre} cumple con la mayor parte de las competencias solicitadas. Sería valioso profundizar en la entrevista sobre algunos requisitos específicos, pero es un perfil viable.`;
  } else {
    explicacion = `<b>Perfil con oportunidades de desarrollo.</b> Actualmente, el perfil no parece cubrir los requisitos core que exige la postulación. Existe una brecha en las habilidades tecnológicas principales solicitadas.`;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.3s;';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'background: var(--color-bg, #fff); color: var(--color-text, #111827); padding: 32px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-width: 600px; width: 90%; transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative;';
  
  const prosHtml = (p.strengths || []).map(s => `<li style="margin-bottom: 8px; color: #10B981; display: flex; align-items: flex-start; gap: 6px;"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0; margin-top:2px;"><path d="M5 13l4 4L19 7"></path></svg><span>${s}</span></li>`).join('');
  const contrasHtml = (p.weaknesses || []).map(w => `<li style="margin-bottom: 8px; color: #EF4444; display: flex; align-items: flex-start; gap: 6px;"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0; margin-top:2px;"><path d="M6 18L18 6M6 6l12 12"></path></svg><span>${w}</span></li>`).join('');

  modal.innerHTML = `
    <button id="ia-close-btn" class="btn-close-top-right" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--color-text-muted); cursor: pointer; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='none'">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
    <div style="display: flex; align-items: center; gap: 16px; mb-24; margin-bottom: 24px;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: ${bg}; border: 3px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color}; font-size: 18px; font-weight: 800; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); flex-shrink: 0;">
        ${p.rating}
      </div>
      <div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--color-text, #111827);">Análisis del Match</h3>
          <span style="background: rgba(59, 130, 246, 0.1); color: #3B82F6; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">Powered by ApplyAI</span>
        </div>
        <p style="margin: 4px 0 0; color: var(--color-text-muted, #6B7280); font-size: 14px;">Evaluación detallada para ${p.nombre}</p>
      </div>
    </div>
    
    <div style="margin-bottom: 24px; font-size: 15px; line-height: 1.6; color: var(--color-text, #374151);">
      ${explicacion}
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
      <div>
        <h4 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #10B981; display: flex; align-items: center; gap: 6px;">
          Puntos Fuertes (CV)
        </h4>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px;">
          ${prosHtml || '<li style="color: var(--color-text-muted);">No se identificaron puntos fuertes específicos.</li>'}
        </ul>
      </div>
      <div>
        <h4 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #EF4444; display: flex; align-items: center; gap: 6px;">
          Áreas de Mejora (CV)
        </h4>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px;">
          ${contrasHtml || '<li style="color: var(--color-text-muted);">No se identificaron áreas de mejora críticas.</li>'}
        </ul>
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

function cambiarEstadoCandidato(id, nuevoEstado, selectElement) {
  const candidato = POSTULANTES.find(p => p.id === id);
  if (!candidato) return;

  // Si el estado es el mismo, o si ya es un estado terminal que no se debería cambiar
  if (candidato.estado === nuevoEstado) return;
  if (candidato.estado === 'Aceptado' || candidato.estado === 'Rechazado') {
    showToast('Acción no permitida', 'No puedes cambiar el estado de un candidato ya aceptado o rechazado', 'error');
    if (selectElement) selectElement.value = candidato.estado; // volver a la opción original
    return;
  }

  const performChange = async () => {
    if (selectElement) selectElement.disabled = true; // Deshabilitar mientras carga
    try {
      const user = JSON.parse(localStorage.getItem('ApplyAI.currentUser'));
      let backendStatus = 'PENDING';
      if (nuevoEstado === 'Entrevista') backendStatus = 'VIEWED';
      else if (nuevoEstado === 'Aceptado') backendStatus = 'ACCEPTED';
      else if (nuevoEstado === 'Rechazado') backendStatus = 'REJECTED';

      await axios.post(`http://localhost:3000/api/applications/${id}/status`, 
        { status: backendStatus },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      candidato.estado = nuevoEstado;
      if (nuevoEstado === 'Entrevista') {
        showToast('Candidato en Entrevista', `Se notificó por mail a ${candidato.nombre} los pasos a seguir.`, 'info');
      } else if (nuevoEstado === 'Aceptado') {
        showToast('¡Candidato Contratado!', `El candidato ${candidato.nombre} fue marcado como aceptado exitosamente.`, 'success');
      } else if (nuevoEstado === 'Rechazado') {
        showToast('Candidato Rechazado', `Se envió mail de agradecimiento a ${candidato.nombre}.`, 'error');
      }
      applyPostulantesFilters(); // recarga
    } catch (err) {
      console.error("Error al actualizar estado", err);
      showToast("Error", "No se pudo actualizar el estado del candidato", "error");
      if (selectElement) selectElement.disabled = false;
      applyPostulantesFilters(); // recarga original si falla
    }
  };

  if (nuevoEstado === 'Aceptado' || nuevoEstado === 'Rechazado') {
    const isAceptado = nuevoEstado === 'Aceptado';
    showConfirmDialog(
      `Confirmar ${isAceptado ? 'Aceptación' : 'Rechazo'}`,
      `¿Estás seguro de querer <strong>${isAceptado ? 'aceptar' : 'rechazar'} a ${candidato.nombre}</strong>? 
       Esta acción no se puede deshacer y deshabilitará el selector de estado permanentemente.`,
      () => performChange(), // Si confirma, ejecuta
      () => {
        if (selectElement) selectElement.value = candidato.estado; // Revertir visualmente
        applyPostulantesFilters();
      }
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

window.cambiarOfertaFiltro = function(ofertaId) {
  if (ofertaId) {
    verPostulantes(ofertaId);
  }
};

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
          <input class="form-input" type="text" id="oferta-skills-input" placeholder="ej: React, Node.js">
          <div class="flex flex-wrap gap-2 mt-2" id="skills-tags-container"></div>
          <input type="hidden" id="oferta-skills" value="">
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

  // Inicializar sistema de etiquetas
  setupTagsInput('skills-tags-container', 'oferta-skills-input', 'oferta-skills');
}

function setupTagsInput(containerId, inputId, hiddenId, initialTags = []) {
  const container = document.getElementById(containerId);
  const input = document.getElementById(inputId);
  const hiddenInput = document.getElementById(hiddenId);
  
  if (!container || !input) return;

  let tags = [...initialTags];

  function render() {
    container.innerHTML = tags.map(t => `
      <span class="skill-chip">
        ${t}
        <span class="tag-remove" data-tag="${t}">&times;</span>
      </span>
    `).join('');

    // Add click listeners to remove buttons
    container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tag = e.target.getAttribute('data-tag');
        tags = tags.filter(t => t !== tag);
        render();
      });
    });

    if (hiddenInput) {
      hiddenInput.value = tags.join(',');
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      if (val && !tags.includes(val)) {
        tags.push(val);
        render();
        input.value = '';
      }
    }
  });

  render();
}

const DASHBOARD_CACHE_KEYS = {
  offers: 'ApplyAI.dashboard.offers',
  summary_applicants: 'ApplyAI.dashboard.summary_applicants',
  applicants: 'ApplyAI.dashboard.applicants_prefix_', // Se usará con ofertaId
};

let ofertaActivaId = null;

// Inicialización instantánea desde caché
(function initCache() {
  const cachedOffers = localStorage.getItem(DASHBOARD_CACHE_KEYS.offers);
  if (cachedOffers) {
    try {
      OFERTAS = JSON.parse(cachedOffers);
    } catch(e) {}
  }

  const cachedSummaryApps = localStorage.getItem(DASHBOARD_CACHE_KEYS.summary_applicants);
  if (cachedSummaryApps) {
    try {
      POSTULANTES = JSON.parse(cachedSummaryApps);
    } catch(e) {}
  }
})();

async function loadDashboardData() {
  const rawUser = localStorage.getItem('ApplyAI.currentUser');
  if (!rawUser) return;
  const user = JSON.parse(rawUser);

  // 1. Dibujar lo que ya tenemos (Caché)
  if (seccionActual === 'resumen') renderResumen();
  if (seccionActual === 'ofertas') renderOfertas();

  // 2. Sincronizar con el Backend en segundo plano
  try {
    // Sincronizar Ofertas
    const resOffers = await axios.get('http://localhost:3000/api/jobs/me/offers', {
      headers: { Authorization: `Bearer ${user.token}` }
    });

    const freshOffers = resOffers.data.map(job => ({
      id: job.id,
      titulo: job.title,
      descripcion: job.description,
      area: 'Tecnología',
      modalidad: job.modality === 'HYBRID' ? 'Hibrido' : job.modality === 'ONSITE' ? 'Presencial' : 'Remoto',
      experiencia: job.minExperience > 0 ? `${job.minExperience} años` : 'Sin experiencia',
      ubicacion: job.location || 'No especificada',
      skills: job.skillsRequired || [],
      estado: job.isActive ? 'activa' : 'cerrada',
      postulantes: job._count?.applications || 0,
      fecha: new Date(job.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    }));

    OFERTAS = freshOffers;
    localStorage.setItem(DASHBOARD_CACHE_KEYS.offers, JSON.stringify(freshOffers));

    // Sincronizar Postulantes (para Resumen General)
    const resApps = await axios.get('http://localhost:3000/api/applications', {
      headers: { Authorization: `Bearer ${user.token}` }
    });

    const freshSummaryApplicants = resApps.data.map(app => ({
      id: app.id,
      estado: app.status === 'PENDING' ? 'Revisión' : app.status === 'ACCEPTED' ? 'Aceptado' : app.status === 'VIEWED' ? 'Entrevista' : 'Rechazado',
      fecha: app.createdAt
    }));

    POSTULANTES = freshSummaryApplicants;
    localStorage.setItem(DASHBOARD_CACHE_KEYS.summary_applicants, JSON.stringify(freshSummaryApplicants));

    // Redibujar con datos frescos si seguimos en la misma sección
    if (seccionActual === 'resumen') renderResumen();
    if (seccionActual === 'ofertas') renderOfertas();
  } catch (err) {
    console.error("Error sync dashboard data", err);
  }
}

async function verPostulantes(ofertaId) {
  ofertaActivaId = ofertaId;
  const oferta = OFERTAS.find(o => o.id === ofertaId);
  if (!oferta) return;

  // 1. Cargar desde Caché si existe para esta oferta específica
  const cacheKey = DASHBOARD_CACHE_KEYS.applicants + ofertaId;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      POSTULANTES = JSON.parse(cached);
    } catch(e) {}
  } else {
    POSTULANTES = []; // Opcional: podrías dejar los anteriores o vaciar
  }

  // Navegar inmediatamente con lo que tengamos
  navigateTo('postulantes', oferta.titulo);

  // 2. Sincronizar con el Backend
  try {
    const user = JSON.parse(localStorage.getItem('ApplyAI.currentUser'));
    const res = await axios.get(`http://localhost:3000/api/applications/offer/${ofertaId}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    });

    const freshApplicants = res.data.map(app => {
      const p = app.candidate;
      return {
        id: app.id,
        nombre: p.user?.fullName || p.name || 'Desconocido',
        rol: p.bio || 'Sin rol',
        iniciales: (p.user?.fullName || p.name || 'D').substring(0, 2).toUpperCase(),
        skills: p.skills || [],
        match: app.matchScore || 0,
        ofertaId: ofertaId,
        experiencia: p.experience || 'Sin experiencia',
        estudio: p.education || 'Sin educación',
        favorito: false,
        estado: app.status === 'PENDING' ? 'Revisión' : app.status === 'ACCEPTED' ? 'Aceptado' : app.status === 'VIEWED' ? 'Entrevista' : 'Rechazado',
        rating: app.matchScore ? (app.matchScore / 10).toFixed(1) : '0.0',
        cvRating: p.cvAnalysis?.overallScore ? (p.cvAnalysis.overallScore / 10).toFixed(1) : '0.0',
        cvUrl: p.cvUrl || '',
        photoUrl: p.photoUrl || '',
        strengths: app.matchPros || [],
        weaknesses: app.matchCons || [],
        applicationId: app.id
      };
    });

    POSTULANTES = freshApplicants;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(freshApplicants));
    } catch (storageErr) {
      if (storageErr.name === 'QuotaExceededError') {
        console.warn("Storage quota exceeded, clearing old dashboard caches...");
        // Limpiamos prefijos viejos para hacer espacio
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('ApplyAI.dashboard.')) {
            localStorage.removeItem(key);
          }
        });
        // Reintentamos una vez
        try {
          localStorage.setItem(cacheKey, JSON.stringify(freshApplicants));
        } catch(e) { /* Si falla de nuevo, simplemente no lo cacheamos */ }
      }
    }

    // Si el usuario sigue viendo esta oferta, refrescamos la vista
    if (seccionActual === 'postulantes' && ofertaActivaId === ofertaId) {
       renderPostulantes('postulantes-container', ofertaId);
    }
  } catch (err) {
    console.error("Error sync applicants", err);
  }
}

async function publicarOferta() {
  const saveBtn = document.querySelector('#form-container .btn--primary');
  if (saveBtn) saveBtn.classList.add('is-loading');

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
    showToast('Campos incompletos', 'Por favor, completa los campos obligatorios (Título y Descripción).', 'error');
    if (saveBtn) saveBtn.classList.remove('is-loading');
    return;
  }

  const skillsRaw = skillsEl?.value || '';
  const parsedSkills = skillsRaw.split(',').map(s => s.trim()).filter(s => s);
  
  const payload = {
    title: titulo,
    description: desc,
    modality: modEl?.value === 'Hibrido' ? 'HYBRID' : modEl?.value === 'Presencial' ? 'ONSITE' : 'REMOTE',
    minExperience: parseInt(expEl?.value) || 0,
    location: ubicEl?.value.trim() || 'No especificada',
    skillsRequired: parsedSkills
  };

  try {
    const user = JSON.parse(localStorage.getItem('ApplyAI.currentUser'));
    await axios.post('http://localhost:3000/api/jobs', payload, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    
    // Reload dashboard data and redirect
    await loadDashboardData();
    navigateTo('ofertas');
    showToast('¡Oferta publicada!', 'Tu oferta de empleo se creó con éxito y ya está visible para los candidatos.', 'success');
  } catch (error) {
    console.error("Error al publicar la oferta", error);
    showToast('Error al publicar', 'Hubo un problema al crear tu oferta. Intentalo de nuevo.', 'error');
  } finally {
    if (saveBtn) saveBtn.classList.remove('is-loading');
  }
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
        <div class="modal-panel__title text-error">Eliminar Oferta</div>
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
  
  modal.querySelector('#conf-eliminar').addEventListener('click', async () => {
    try {
      const user = JSON.parse(localStorage.getItem('ApplyAI.currentUser'));
      await axios.delete(`http://localhost:3000/api/jobs/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      await loadDashboardData();
    } catch (err) {
      console.error("Error al eliminar la oferta", err);
      alert("No se pudo eliminar la oferta.");
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
            <input class="form-input" type="text" id="edit-oferta-skills-input" placeholder="ej: React, Node.js">
            <div class="flex flex-wrap gap-2 mt-2" id="edit-skills-tags-container"></div>
            <input type="hidden" id="edit-oferta-skills" value="${(oferta.skills || []).join(',')}">
          </div>
          <div class="form-group form-grid--full">
            <label class="form-label">Descripcion del puesto *</label>
            <textarea class="form-textarea" rows="4" id="edit-oferta-desc" style="min-height:110px">${oferta.descripcion || ''}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-panel__footer">
        <button class="btn btn--ghost" onclick="cerrarModalEditarOferta()">Cancelar</button>
        <button class="btn btn--primary" onclick="guardarOferta('${ofertaId}')">Guardar cambios</button>
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

  // Inicializar sistema de etiquetas para edición
  setupTagsInput('edit-skills-tags-container', 'edit-oferta-skills-input', 'edit-oferta-skills', oferta.skills || []);
}

function cerrarModalEditarOferta() {
  const modal = document.getElementById('modal-editar-oferta');
  if (!modal) return;

  modal.querySelector('.modal-panel').classList.remove('modal-panel--visible');
  modal.querySelector('.modal-backdrop').classList.remove('modal-backdrop--visible');

  document.removeEventListener('keydown', modal._onKeyDown);

  setTimeout(() => modal.remove(), 250);
}

async function guardarOferta(ofertaId) {
  const saveBtn = document.querySelector('#modal-editar-oferta .btn--primary');
  if (saveBtn) saveBtn.classList.add('is-loading');

  const oferta = OFERTAS.find(o => o.id === ofertaId);
  if (!oferta) {
    if (saveBtn) saveBtn.classList.remove('is-loading');
    return;
  }

  const nuevoTitulo = document.getElementById('edit-oferta-titulo')?.value.trim();
  if (!nuevoTitulo) {
    document.getElementById('edit-oferta-titulo')?.focus();
    showToast('Campos incompletos', 'Por favor, completa el título de la oferta.', 'error');
    if (saveBtn) saveBtn.classList.remove('is-loading');
    return;
  }

  const areaEl       = document.getElementById('edit-oferta-area');
  const modEl        = document.getElementById('edit-oferta-modalidad');
  const expEl        = document.getElementById('edit-oferta-exp');
  const estadoEl     = document.getElementById('edit-oferta-estado');
  const ubicEl       = document.getElementById('edit-oferta-ubicacion');
  const descEl       = document.getElementById('edit-oferta-desc');
  const skillsRaw    = document.getElementById('edit-oferta-skills')?.value || '';

  const payload = {
    title: nuevoTitulo,
    description: descEl?.value.trim() || '',
    modality: modEl?.value === 'Hibrido' ? 'HYBRID' : modEl?.value === 'Presencial' ? 'ONSITE' : 'REMOTE',
    minExperience: parseInt(expEl?.value) || 0,
    location: ubicEl?.value.trim() || 'No especificada',
    skillsRequired: skillsRaw.split(',').map(s => s.trim()).filter(Boolean),
    isActive: estadoEl?.value === 'activa' || estadoEl?.value === 'Activa'
  };

  try {
    const user = JSON.parse(localStorage.getItem('ApplyAI.currentUser'));
    await axios.post(`http://localhost:3000/api/jobs/${ofertaId}`, payload, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    
    await loadDashboardData();
    cerrarModalEditarOferta();
  } catch (error) {
    console.error("Error al guardar cambios de oferta", error);
    showToast('Error', 'Ocurrió un error al guardar los cambios.', 'error');
  } finally {
    if (saveBtn) saveBtn.classList.remove('is-loading');
  }
}

// ── VISUALIZAR CV ─────────────────────────────────────────────

function visualizarCV(nombreCandidato, urlOriginal = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', rating = '0.0') {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const backendOrigin = 'http://localhost:3000';

  const overlay = document.createElement('div');
  overlay.id = 'cv-preview-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); z-index: 100500; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); padding: 12px;';
  
  const modal = document.createElement('div');
  modal.style.cssText = `background: #fff; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); width: ${isMobile ? '100%' : '90vw'}; max-width: 1000px; height: ${isMobile ? 'calc(100vh - 24px)' : '90vh'}; max-height: calc(100vh - 24px); display: flex; flex-direction: column; overflow: hidden;`;
  
  let docUrl = urlOriginal || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  
  // Si es una ruta local (empieza con /api o /cv), le anteponemos el origen del backend
  if (docUrl.startsWith('/')) {
    docUrl = `${backendOrigin}${docUrl}`;
  }

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
    <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: ${isMobile ? '10px' : '14px'}; padding: ${isMobile ? '12px 14px' : '20px 24px'}; border-bottom: 1px solid #e5e7eb; background: #fff;">
      <div style="display: flex; align-items: center; gap: ${isMobile ? '10px' : '16px'}; min-width: 0; flex: 1 1 ${isMobile ? '100%' : '320px'};">
        <div style="width: ${isMobile ? '38px' : '44px'}; height: ${isMobile ? '38px' : '44px'}; border-radius: 10px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center; color: #3B82F6; flex-shrink: 0;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"></path></svg>
        </div>
        <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
          <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '18px'}; font-weight: 600; color: #111827; line-height: 1.2; word-break: break-word;">CV de ${nombreCandidato}</h3>
          <p style="margin: 0; font-size: ${isMobile ? '13px' : '14px'}; color: #6B7280;">Previsualizacion del documento pdf</p>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; width: ${isMobile ? '38px' : '44px'}; height: ${isMobile ? '38px' : '44px'}; border-radius: 50%; background: ${ratingBg}; border: 3px solid ${ratingColor}; font-size: ${isMobile ? '13px' : '15px'}; font-weight: 700; color: ${ratingColor}; margin-left: ${isMobile ? '4px' : '12px'}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); flex-shrink: 0;" title="Calidad de CV evaluada por IA">
          ${rating}
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; margin-left: auto; ${isMobile ? 'width: 100%; justify-content: flex-end;' : ''}">
        <a href="${docUrl}" target="_blank" style="padding: ${isMobile ? '8px 12px' : '8px 16px'}; background: #f3f4f6; color: #374151; font-weight: 500; font-size: 13px; border-radius: 6px; text-decoration: none; display: flex; align-items: center; gap: 6px; border: 1px solid #d1d5db;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
          Abrir en pestaña
        </a>
        <button id="cv-close-btn" style="padding: 8px; width: 36px; height: 36px; background: none; border: none; color: #6B7280; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 6px; flex-shrink: 0;" onmouseover="this.style.background='#f3f4f6'; this.style.color='#ef4444';" onmouseout="this.style.background='none'; this.style.color='#6b7280';">
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

