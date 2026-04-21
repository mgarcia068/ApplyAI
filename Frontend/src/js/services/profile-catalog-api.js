(function () {
  const SKILLS = [
    'React',
    'Next.js',
    'Vue.js',
    'Angular',
    'JavaScript',
    'TypeScript',
    'HTML',
    'CSS',
    'Sass',
    'Tailwind CSS',
    'Bootstrap',
    'Node.js',
    'Express',
    'NestJS',
    'Python',
    'Django',
    'Flask',
    'Java',
    'Spring Boot',
    'C#',
    '.NET',
    'PHP',
    'Laravel',
    'Ruby on Rails',
    'SQL',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'GraphQL',
    'REST API',
    'Docker',
    'Kubernetes',
    'Git',
    'GitHub',
    'GitLab',
    'AWS',
    'Azure',
    'GCP',
    'Linux',
    'CI/CD',
    'Jest',
    'Cypress',
    'Playwright',
    'Testing',
    'Figma',
    'UI/UX',
    'Scrum',
    'Agile',
    'Power BI',
  ];

  const SKILL_ALIASES = {
    reactjs: 'React',
    react: 'React',
    next: 'Next.js',
    nextjs: 'Next.js',
    vue: 'Vue.js',
    vuejs: 'Vue.js',
    angularjs: 'Angular',
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    node: 'Node.js',
    nodejs: 'Node.js',
    expressjs: 'Express',
    nest: 'NestJS',
    csharp: 'C#',
    dotnet: '.NET',
    net: '.NET',
    postgresql: 'PostgreSQL',
    postgres: 'PostgreSQL',
    mongodb: 'MongoDB',
    k8s: 'Kubernetes',
    cicd: 'CI/CD',
    figma: 'Figma',
    ux: 'UI/UX',
    uiux: 'UI/UX',
  };

  const LANGUAGES = [
    'Español',
    'Inglés',
    'Portugués',
    'Francés',
    'Italiano',
    'Alemán',
    'Chino',
    'Japonés',
    'Coreano',
    'Ruso',
  ];

  const LANGUAGE_ALIASES = {
    espanol: 'Español',
    espanolnativo: 'Español',
    english: 'Inglés',
    ingles: 'Inglés',
    portugues: 'Portugués',
    portuguese: 'Portugués',
    frances: 'Francés',
    french: 'Francés',
    italiano: 'Italiano',
    italian: 'Italiano',
    aleman: 'Alemán',
    german: 'Alemán',
    chino: 'Chino',
    chinese: 'Chino',
    japones: 'Japonés',
    japanese: 'Japonés',
    coreano: 'Coreano',
    korean: 'Coreano',
    ruso: 'Ruso',
    russian: 'Ruso',
  };

  const LANGUAGE_LEVELS = {
    a1: 'A1',
    a2: 'A2',
    b1: 'B1',
    b2: 'B2',
    c1: 'C1',
    c2: 'C2',
    basico: 'Básico',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
    nativo: 'Nativo',
    nativa: 'Nativo',
    fluent: 'Fluido',
    fluido: 'Fluido',
  };

  function normalize(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function normalizeCompact(value) {
    return normalize(value).replace(/[^a-z0-9]/g, '');
  }

  const skillsIndex = new Map();
  SKILLS.forEach((skill) => {
    skillsIndex.set(normalizeCompact(skill), skill);
  });

  const languagesIndex = new Map();
  LANGUAGES.forEach((language) => {
    languagesIndex.set(normalizeCompact(language), language);
  });

  function resolveSkill(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const compact = normalizeCompact(raw);
    if (SKILL_ALIASES[compact]) return SKILL_ALIASES[compact];
    return skillsIndex.get(compact) || null;
  }

  function resolveLanguage(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const baseNormalized = normalize(raw);

    if (LANGUAGE_ALIASES[normalizeCompact(raw)]) {
      return LANGUAGE_ALIASES[normalizeCompact(raw)];
    }

    const parts = baseNormalized.split(' ').filter(Boolean);
    if (!parts.length) return null;

    const levelCandidate = parts[parts.length - 1];
    const maybeLevel = LANGUAGE_LEVELS[levelCandidate] || null;

    const languagePart = maybeLevel ? parts.slice(0, -1).join(' ') : parts.join(' ');
    const languageKey = normalizeCompact(languagePart);

    const baseLanguage = LANGUAGE_ALIASES[languageKey] || languagesIndex.get(languageKey) || null;
    if (!baseLanguage) return null;

    if (!maybeLevel) return baseLanguage;
    return `${baseLanguage} ${maybeLevel}`;
  }

  function listSkills() {
    return SKILLS.slice();
  }

  function listLanguages() {
    return LANGUAGES.slice();
  }

  window.ApplyAI = window.ApplyAI || {};
  window.ApplyAI.profileCatalogApi = {
    normalize,
    resolveSkill,
    resolveLanguage,
    listSkills,
    listLanguages,
  };
})();
