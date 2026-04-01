// ── DATOS SIMULADOS ──────────────────────────────────────────
const EMPRESA = {
  nombre: 'TechCorp Argentina',
  rubro: 'Tecnologia & Software',
  iniciales: 'TC',
};

const OFERTAS = [
  { id: 1, titulo: 'Frontend Developer',     area: 'Tecnologia', modalidad: 'Remoto',     estado: 'activa',   postulantes: 12, fecha: '28 Mar 2026' },
  { id: 2, titulo: 'UX/UI Designer',         area: 'Diseno',     modalidad: 'Hibrido',    estado: 'activa',   postulantes: 8,  fecha: '25 Mar 2026' },
  { id: 3, titulo: 'Backend Node.js',        area: 'Tecnologia', modalidad: 'Remoto',     estado: 'activa',   postulantes: 21, fecha: '20 Mar 2026' },
  { id: 4, titulo: 'Product Manager',        area: 'Producto',   modalidad: 'Presencial', estado: 'pausada',  postulantes: 5,  fecha: '15 Mar 2026' },
  { id: 5, titulo: 'Data Analyst',           area: 'Datos',      modalidad: 'Remoto',     estado: 'cerrada',  postulantes: 34, fecha: '01 Mar 2026' },
];

const POSTULANTES = [
  { id: 1, nombre: 'Lucas Fernandez',   rol: 'Frontend Developer', iniciales: 'LF', skills: ['React', 'TypeScript', 'CSS'],      match: 92, ofertaId: 1 },
  { id: 2, nombre: 'Valentina Cruz',    rol: 'Frontend Developer', iniciales: 'VC', skills: ['Vue', 'JavaScript', 'Tailwind'],   match: 85, ofertaId: 1 },
  { id: 3, nombre: 'Mateo Gonzalez',    rol: 'Frontend Developer', iniciales: 'MG', skills: ['React', 'Next.js', 'GraphQL'],     match: 78, ofertaId: 1 },
  { id: 4, nombre: 'Sofia Herrera',     rol: 'UX/UI Designer',     iniciales: 'SH', skills: ['Figma', 'Prototyping', 'CSS'],     match: 90, ofertaId: 2 },
  { id: 5, nombre: 'Agustin Molina',    rol: 'Backend Developer',  iniciales: 'AM', skills: ['Node.js', 'Express', 'MongoDB'],   match: 88, ofertaId: 3 },
  { id: 6, nombre: 'Camila Perez',      rol: 'Backend Developer',  iniciales: 'CP', skills: ['Node.js', 'PostgreSQL', 'Docker'], match: 81, ofertaId: 3 },
];

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

function renderOfertasTable(containerId, onVerPostulantes) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const rows = OFERTAS.map(o => `
    <tr data-id="${o.id}">
      <td>
        <div class="offer-title-cell">
          ${o.titulo}
          <span>${o.area}</span>
        </div>
      </td>
      <td>${getModalidadBadge(o.modalidad)}</td>
      <td>${getEstadoBadge(o.estado)}</td>
      <td><strong style="color:var(--color-text)">${o.postulantes}</strong></td>
      <td>${o.fecha}</td>
      <td>
        <div class="offers-table__actions">
          <button class="btn btn--ghost btn--sm" onclick="verPostulantes(${o.id})">Ver postulantes</button>
          <button class="btn btn--ghost btn--sm">Editar</button>
        </div>
      </td>
    </tr>
  `).join('');

  el.innerHTML = `
    <table class="offers-table">
      <thead>
        <tr>
          <th>Puesto</th>
          <th>Modalidad</th>
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

function renderPostulantes(containerId, ofertaId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const lista = ofertaId
    ? POSTULANTES.filter(p => p.ofertaId === ofertaId)
    : POSTULANTES;

  if (lista.length === 0) {
    el.innerHTML = `
      <div class="empty-box">
        <svg class="empty-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <div class="empty-box__title">Sin postulantes todavia</div>
        <p class="empty-box__text">Cuando alguien se postule a esta oferta aparecera aqui.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="applicants-grid">
      ${lista.map(p => `
        <div class="applicant-card">
          <div class="applicant-card__header">
            ${buildAvatarInitials(p.iniciales)}
            <div class="applicant-card__info">
              <div class="applicant-card__name">${p.nombre}</div>
              <div class="applicant-card__role">${p.rol}</div>
            </div>
          </div>
          <div class="applicant-card__skills">
            ${buildSkillChips(p.skills)}
          </div>
          <div class="applicant-card__footer">
            ${buildMatchBar(p.match)}
            <button class="btn btn--primary btn--sm">Ver CV</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
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
          <input class="form-input" type="text" placeholder="ej: Buenos Aires, Argentina" id="oferta-ubicacion">
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
}

let ofertaActivaId = null;

function verPostulantes(ofertaId) {
  ofertaActivaId = ofertaId;
  const oferta = OFERTAS.find(o => o.id === ofertaId);
  navigateTo('postulantes', oferta ? oferta.titulo : '');
}

function publicarOferta() {
  const titulo = document.getElementById('oferta-titulo')?.value.trim();
  const desc   = document.getElementById('oferta-desc')?.value.trim();

  if (!titulo || !desc) {
    alert('Completa al menos el nombre del puesto y la descripcion.');
    return;
  }

  OFERTAS.unshift({
    id: OFERTAS.length + 1,
    titulo,
    area:        document.getElementById('oferta-area')?.value || 'Otro',
    modalidad:   document.getElementById('oferta-modalidad')?.value || 'Remoto',
    estado:      'activa',
    postulantes: 0,
    fecha:       new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }),
  });

  navigateTo('ofertas');
}

function cancelarOferta() {
  navigateTo('ofertas');
}