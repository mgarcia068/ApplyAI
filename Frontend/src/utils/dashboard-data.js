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
