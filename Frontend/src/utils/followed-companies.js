(function () {
  const STORAGE_PREFIX = 'ApplyAI.followedCompanies:';
  const CURRENT_USER_KEY = 'ApplyAI.currentUser';

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function normalizeRole(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'candidato' || normalized === 'cliente') return 'candidato';
    if (normalized === 'empresa') return 'empresa';
    return '';
  }

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function slugify(value) {
    const base = normalizeText(value);
    return base
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;

    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object') return null;

    const email = String(parsed.email || '').trim().toLowerCase();
    const role = normalizeRole(parsed.role);
    const fullName = String(parsed.fullName || '').trim();

    if (!email || !role) return null;
    return { email, role, fullName };
  }

  function storageKeyForEmail(email) {
    return `${STORAGE_PREFIX}${String(email || '').trim().toLowerCase()}`;
  }

  function list(email) {
    const key = storageKeyForEmail(email);
    const raw = localStorage.getItem(key);
    const parsed = raw ? safeJsonParse(raw, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function save(email, companies) {
    const key = storageKeyForEmail(email);
    const safe = Array.isArray(companies) ? companies : [];
    localStorage.setItem(key, JSON.stringify(safe));
  }

  function normalizeCompany(company) {
    const name = String(company?.name || '').trim();
    const id = String(company?.id || slugify(name) || '').trim();

    return {
      id,
      name,
      industry: String(company?.industry || '').trim(),
      location: String(company?.location || '').trim(),
      website: String(company?.website || '').trim(),
      tagline: String(company?.tagline || '').trim(),
      followedAt: String(company?.followedAt || new Date().toISOString()),
    };
  }

  function isFollowing(email, companyId) {
    const id = String(companyId || '').trim();
    if (!email || !id) return false;
    return list(email).some((c) => String(c?.id || '') === id);
  }

  function follow(email, company) {
    const normalized = normalizeCompany(company);
    if (!email || !normalized.id || !normalized.name) return;

    const companies = list(email);
    const existingIndex = companies.findIndex((c) => String(c?.id || '') === normalized.id);

    if (existingIndex >= 0) {
      companies[existingIndex] = { ...companies[existingIndex], ...normalized };
    } else {
      companies.unshift(normalized);
    }

    save(email, companies);
  }

  function unfollow(email, companyId) {
    const id = String(companyId || '').trim();
    if (!email || !id) return;

    const companies = list(email).filter((c) => String(c?.id || '') !== id);
    save(email, companies);
  }

  function toggle(email, company) {
    const normalized = normalizeCompany(company);
    if (!email || !normalized.id) return false;

    if (isFollowing(email, normalized.id)) {
      unfollow(email, normalized.id);
      return false;
    }

    follow(email, normalized);
    return true;
  }

  window.ApplyAI = window.ApplyAI || {};
  window.ApplyAI.followedCompanies = {
    getCurrentUser,
    normalizeText,
    slugify,
    list,
    save,
    isFollowing,
    follow,
    unfollow,
    toggle,
  };
})();
