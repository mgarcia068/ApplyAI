(function () {
  const PROFILE_VERSION = 1;
  const CV_AI_DAILY_LIMIT = 3;
  const BACKEND = 'https://applyai-umuw.onrender.com';

  // ── Utilidades de fecha ────────────────────────────────────────────────────
  function getLocalDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function getCvAiUsageKey(email) {
    return `ApplyAI.candidateCvAiDailyUsage:${String(email || '').trim().toLowerCase()}:${getLocalDateKey()}`;
  }

  function getCvAiDailyUsage(email) {
    const raw = localStorage.getItem(getCvAiUsageKey(email));
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  }

  function incrementCvAiDailyUsage(email) {
    const key = getCvAiUsageKey(email);
    const next = getCvAiDailyUsage(email) + 1;
    localStorage.setItem(key, String(next));
    return next;
  }

  function getCvAiRemaining(email) {
    return Math.max(0, CV_AI_DAILY_LIMIT - getCvAiDailyUsage(email));
  }

  function hasCvAiReachedLimit(email) {
    return getCvAiDailyUsage(email) >= CV_AI_DAILY_LIMIT;
  }

  // ── Helpers de usuario/perfil ──────────────────────────────────────────────
  function safeJsonParse(value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function normalizeRole(value) {
    const n = String(value || '').trim().toLowerCase();
    if (n === 'candidato' || n === 'cliente') return 'candidato';
    if (n === 'empresa') return 'empresa';
    return '';
  }

  function getCurrentUser() {
    const raw = localStorage.getItem('ApplyAI.currentUser');
    if (!raw) return null;
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      email: String(parsed.email || '').trim().toLowerCase(),
      role: normalizeRole(parsed.role),
      fullName: String(parsed.fullName || '').trim(),
      token: String(parsed.token || '').trim(),
    };
  }

  function getProfileKey(email) {
    return `ApplyAI.candidateProfile:${String(email || '').trim().toLowerCase()}`;
  }

  function getCandidateProfile(email) {
    const raw = localStorage.getItem(getProfileKey(email));
    return raw ? safeJsonParse(raw, null) : null;
  }

  function saveCandidateProfile(email, profile) {
    localStorage.setItem(getProfileKey(email), JSON.stringify(profile));
  }

  function hasCv(profile) {
    return Boolean(profile && String(profile.cvDataUrl || '').trim());
  }

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  // ── Visualizador de CV ─────────────────────────────────────────────────────
  async function visualizarCV(nombreCandidato, urlOriginal, rating = '0.0') {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    let docUrl = urlOriginal || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    // Si la URL es interna, el proxy del backend o una URL de S3, descargamos como Blob con el Token vía nuestro backend
    const isInternal = docUrl.startsWith('/') || docUrl.includes('/api/cv/');
    const isS3 = docUrl.includes('.amazonaws.com');

    if (isInternal || isS3) {
      try {
        const currentUser = getCurrentUser();
        // Forzamos el uso del proxy si es una URL de S3 para evitar Access Denied
        const targetUrl = isS3 ? `${BACKEND}/api/cv/my-cv` : (docUrl.startsWith('http') ? docUrl : `${BACKEND}${docUrl}`);
        
        const res = await fetch(targetUrl, {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        if (res.ok) {
          const blob = await res.blob();
          docUrl = URL.createObjectURL(blob);
        }
      } catch (e) {
        console.error('[Mi CV] Error al previsualizar como blob:', e);
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'cv-preview-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,.7);z-index:100500;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);padding:12px;';

    const ratingNum = parseFloat(rating);
    let ratingColor = '#3B82F6', ratingBg = 'rgba(59,130,246,.1)';
    if (ratingNum >= 8.5) { ratingColor = '#10B981'; ratingBg = 'rgba(16,185,129,.1)'; }
    else if (ratingNum >= 5.5) { ratingColor = '#F59E0B'; ratingBg = 'rgba(245,158,11,.1)'; }
    else { ratingColor = '#EF4444'; ratingBg = 'rgba(239,68,68,.1)'; }

    const modal = document.createElement('div');
    modal.style.cssText = `background:#fff;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);width:${isMobile ? '100%' : '90vw'};max-width:1000px;height:${isMobile ? 'calc(100vh - 24px)' : '90vh'};max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden;`;
    modal.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:14px;padding:20px 24px;border-bottom:1px solid #e5e7eb;background:#fff;">
        <div style="display:flex;align-items:center;gap:16px;min-width:0;flex:1;">
          <div style="width:44px;height:44px;border-radius:10px;background:rgba(59,130,246,.1);display:flex;align-items:center;justify-content:center;color:#3B82F6;flex-shrink:0;">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/></svg>
          </div>
          <div>
            <h3 style="margin:0;font-size:18px;font-weight:600;color:#111827;">CV de ${nombreCandidato}</h3>
            <p style="margin:0;font-size:14px;color:#6B7280;">Previsualización del documento PDF</p>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:${ratingBg};border:3px solid ${ratingColor};font-size:15px;font-weight:700;color:${ratingColor};margin-left:12px;flex-shrink:0;" title="Puntuación del CV">${rating}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;margin-left:auto;">
          <a href="${docUrl}" target="_blank" style="padding:8px 16px;background:#f3f4f6;color:#374151;font-weight:500;font-size:13px;border-radius:6px;text-decoration:none;display:flex;align-items:center;gap:6px;border:1px solid #d1d5db;">Abrir original</a>
          <button id="cv-close-btn" style="padding:8px;width:36px;height:36px;background:none;border:none;color:#6B7280;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:6px;">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div style="flex:1;background:#525659;display:flex;align-items:center;justify-content:center;">
        <object data="${docUrl}" type="application/pdf" width="100%" height="100%">
          <iframe src="${docUrl}" width="100%" height="100%" style="border:none;"><p>Tu navegador no soporta PDFs. <a href="${docUrl}">Descargá el PDF aquí</a>.</p></iframe>
        </object>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const close = () => {
      if (docUrl.startsWith('blob:')) URL.revokeObjectURL(docUrl);
      overlay.remove();
    };
    modal.querySelector('#cv-close-btn').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
  }

  // ── Evaluación IA ──────────────────────────────────────────────────────────
  function describeCvScore(score) {
    const s = clampNumber(score, 0, 100);
    if (s >= 85) return 'Excelente calidad';
    if (s >= 70) return 'CV profesional';
    if (s >= 55) return 'CV aceptable';
    return 'Mejorable';
  }

  function scoreBand(score) {
    const s = clampNumber(score, 0, 100);
    if (s >= 75) return 'high';
    if (s >= 55) return 'medium';
    return 'low';
  }

  function scoreRingPalette(score) {
    const band = scoreBand(score);
    if (band === 'high')   return { band, start: '#22c55e', end: '#14b8a6' };
    if (band === 'medium') return { band, start: '#f59e0b', end: '#f97316' };
    return { band, start: '#ef4444', end: '#ec4899' };
  }

  function setCvAiMetric(valueEl, fillEl, value) {
    const safe = Math.round(clampNumber(value, 0, 100));
    if (valueEl) valueEl.textContent = `${safe}/100`;
    if (fillEl) fillEl.style.width = `${safe}%`;
  }

  function renderCvAiEvaluation(evaluation, els) {
    if (!evaluation) return;
    const { scoreRing, overallScore, scoreLabel, clarityValue, clarityFill,
            skillsValue, skillsFill, experienceValue, experienceFill,
            feedback, strengths, weaknesses, status, insight, runBtn } = els;

    const overall = Math.round(clampNumber(evaluation.overall, 0, 100));
    const palette = scoreRingPalette(overall);

    if (scoreRing) {
      scoreRing.style.setProperty('--cv-ai-score', String(overall));
      scoreRing.style.setProperty('--cv-ai-score-color-start', palette.start);
      scoreRing.style.setProperty('--cv-ai-score-color-end', palette.end);
      scoreRing.setAttribute('data-band', palette.band);
    }
    if (overallScore) overallScore.textContent = String(overall);
    if (scoreLabel) scoreLabel.textContent = describeCvScore(overall);

    setCvAiMetric(clarityValue, clarityFill, evaluation.clarity);
    setCvAiMetric(skillsValue, skillsFill, evaluation.skills);
    setCvAiMetric(experienceValue, experienceFill, evaluation.experience);

    if (feedback && strengths && weaknesses) {
      if (evaluation.aiData) {
        const d = evaluation.aiData;
        strengths.innerHTML = (d.strengths || []).map(s => `<li style="list-style:none;">- ${s}</li>`).join('');
        weaknesses.innerHTML = (d.weaknesses || []).map(w => `<li style="list-style:none;">- ${w}</li>`).join('');
        feedback.hidden = false;
        if (insight) {
          insight.textContent = d.summary || '';
          insight.hidden = !d.summary;
        }
      } else {
        feedback.hidden = true;
      }
    }

    if (status) {
      const userEmail = getCurrentUser()?.email || '';
      const remaining = getCvAiRemaining(userEmail);
      if (remaining <= 0) {
        status.textContent = `Ya usaste tus ${CV_AI_DAILY_LIMIT} análisis de IA de hoy. Volvé mañana.`;
      } else {
        status.textContent = `${evaluation.status || 'Evaluación lista.'} Te quedan ${remaining} análisis de IA hoy.`;
      }
    }
  }

  // ── Mostrar/ocultar sección IA según si hay CV ─────────────────────────────
  function syncAiSection(hasCvUploaded) {
    const emptyState = document.getElementById('micvAiEmptyState');
    const evaluator  = document.getElementById('cvAiEvaluator');
    if (emptyState) emptyState.hidden = hasCvUploaded;
    if (evaluator)  evaluator.hidden  = !hasCvUploaded;
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const currentUser = getCurrentUser();
    const isAllowed   = Boolean(currentUser?.token && currentUser.role === 'candidato');
    const userEmail   = currentUser?.email || '';

    const authAlert   = document.getElementById('micvAuthAlert');
    if (authAlert) authAlert.hidden = isAllowed;

    // Elementos de CV
    const cvInput     = document.getElementById('cvFile');
    const cvError     = document.getElementById('cvFileError');
    const cvInfo      = document.getElementById('cvInfo');
    const cvFileName  = document.getElementById('cvFileName');
    const cvUpdatedAt = document.getElementById('cvUpdatedAt');
    const cvViewLink  = document.getElementById('cvViewLink');
    const removeCvBtn = document.getElementById('removeCvBtn');
    const cvUploadLabel = cvInput ? cvInput.closest('label') : null;
    const cvUploadHint  = document.getElementById('cvAiUploadHint');

    // Elementos IA
    const els = {
      scoreRing:       document.getElementById('cvAiScoreRing'),
      overallScore:    document.getElementById('cvAiOverallScore'),
      scoreLabel:      document.getElementById('cvAiScoreLabel'),
      clarityValue:    document.getElementById('cvAiClarityValue'),
      clarityFill:     document.getElementById('cvAiClarityFill'),
      skillsValue:     document.getElementById('cvAiSkillsValue'),
      skillsFill:      document.getElementById('cvAiSkillsFill'),
      experienceValue: document.getElementById('cvAiExperienceValue'),
      experienceFill:  document.getElementById('cvAiExperienceFill'),
      feedback:        document.getElementById('cvAiFeedback'),
      strengths:       document.getElementById('cvAiStrengths'),
      weaknesses:      document.getElementById('cvAiWeaknesses'),
      status:          document.getElementById('cvAiStatus'),
      insight:         document.getElementById('cvAiInsight'),
      runBtn:          document.getElementById('runCvAiEvalBtn'),
    };

    function showCvError(msg) { if (cvError) cvError.textContent = msg; }
    function clearCvError()   { if (cvError) cvError.textContent = ''; }

    // Sincronizar UI de CV
    function syncCvUi(profile) {
      const uploaded = hasCv(profile);

      if (cvUploadLabel) cvUploadLabel.style.display = uploaded ? 'none' : '';
      if (cvUploadHint)  cvUploadHint.hidden = uploaded;
      if (cvInput)       cvInput.disabled   = uploaded;
      if (cvInfo)        cvInfo.hidden      = !uploaded;

      if (uploaded) {
        if (cvFileName) cvFileName.textContent = profile.cvFileName || 'CV.pdf';
        if (cvUpdatedAt && profile.cvUpdatedAt) {
          cvUpdatedAt.textContent = `Actualizado: ${new Date(profile.cvUpdatedAt).toLocaleString()}`;
        }
        if (cvViewLink) {
          cvViewLink.hidden = false;
          cvViewLink.href   = '#';
          cvViewLink.onclick = (e) => {
            e.preventDefault();
            const rating = profile.cvAiEvaluation
              ? (profile.cvAiEvaluation.overall / 10).toFixed(1)
              : '0.0';
            visualizarCV(currentUser?.fullName || 'Candidato', '/api/cv/my-cv', rating);
          };
        }
      }

      syncAiSection(uploaded);

      // Si hay evaluación guardada y hay CV, mostrarla
      if (uploaded && profile.cvAiEvaluation) {
        renderCvAiEvaluation(profile.cvAiEvaluation, els);
      }
    }

    // Limit button UI
    function syncLimitUi() {
      if (!els.runBtn) return;
      const reached = hasCvAiReachedLimit(userEmail);
      els.runBtn.disabled  = reached;
      els.runBtn.textContent = reached ? 'Límite diario alcanzado' : 'Analizar CV con IA';
      if (reached && els.status) {
        els.status.textContent = `Ya usaste tus ${CV_AI_DAILY_LIMIT} análisis de IA de hoy. Volvé mañana.`;
      }
    }

    // Deshabilitar todo si no está autenticado
    if (!isAllowed) {
      syncAiSection(false);
      if (cvInput)   cvInput.disabled   = true;
      if (removeCvBtn) removeCvBtn.disabled = true;
      if (els.runBtn)  els.runBtn.disabled = true;
      if (els.status)  els.status.textContent = 'Iniciá sesión como candidato para usar esta sección.';
      return;
    }

    // Cargar perfil local
    const storedProfile = getCandidateProfile(userEmail);
    syncCvUi(storedProfile || {});
    syncLimitUi();

    // ── Subida de CV ─────────────────────────────────────────────────────────
    if (cvInput) {
      cvInput.addEventListener('change', async function () {
        const file = cvInput.files?.[0];
        if (!file) return;
        clearCvError();

        const existingProfile = getCandidateProfile(userEmail) || {};
        if (hasCv(existingProfile)) {
          showCvError('Ya tenés un CV subido. Primero quitá el actual para subir otro.');
          cvInput.value = '';
          return;
        }

        if (file.type !== 'application/pdf') {
          showCvError('Seleccioná un archivo PDF.');
          return;
        }

        if (file.size > 3 * 1024 * 1024) {
          showCvError('El PDF supera los 3MB. Probá con uno más liviano.');
          return;
        }

        if (cvInput) cvInput.disabled = true;
        if (removeCvBtn) removeCvBtn.disabled = true;
        showCvError('Subiendo CV, por favor esperá…');

        try {
          const formData = new FormData();
          formData.append('cv', file);

          const response = await fetch(`${BACKEND}/api/cv/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentUser.token}` },
            body: formData,
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.message || 'Error al subir el CV.');
          }

          const data = await response.json();
          const cvUrl        = data.cvUrl;
          const originalName = data.cvOriginalName || file.name || 'CV.pdf';

          const profileToSave = {
            ...existingProfile,
            version: PROFILE_VERSION,
            email: userEmail,
            cvDataUrl:   cvUrl,
            cvFileName:  originalName,
            cvSize:      file.size,
            cvUpdatedAt: data.updatedAt || new Date().toISOString(),
            updatedAt:   new Date().toISOString(),
            createdAt:   existingProfile.createdAt || new Date().toISOString(),
          };

          saveCandidateProfile(userEmail, profileToSave);
          syncCvUi(profileToSave);
          clearCvError();
          showCvError('¡CV subido con éxito!');
          setTimeout(() => clearCvError(), 3000);

        } catch (error) {
          showCvError(error.message || 'Ocurrió un error al subir el archivo.');
        } finally {
          if (cvInput) cvInput.disabled = false;
          if (removeCvBtn) removeCvBtn.disabled = false;
        }
      });
    }

    // ── Quitar CV ─────────────────────────────────────────────────────────────
    if (removeCvBtn) {
      removeCvBtn.addEventListener('click', async function () {
        clearCvError();
        const existing = getCandidateProfile(userEmail) || {};
        if (!hasCv(existing)) { syncCvUi(existing); return; }

        const confirmed = window.confirm('¿Estás seguro de que querés quitar el CV?');
        if (!confirmed) return;

        const updated = {
          ...existing,
          cvDataUrl:      '',
          cvFileName:     '',
          cvSize:         0,
          cvUpdatedAt:    '',
          cvAiEvaluation: undefined,
        };

        saveCandidateProfile(userEmail, updated);
        if (cvInput) cvInput.value = '';

        // Sincronizar con backend
        try {
          await fetch(`${BACKEND}/api/users/me`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentUser.token}`,
            },
            body: JSON.stringify({ cvUrl: '', cvOriginalName: '' }),
          });
        } catch (e) {
          console.warn('[Mi CV] No se pudo sincronizar la remoción del CV con el backend:', e);
        }

        syncCvUi(updated);
        syncAiSection(false);

        // Limpiar UI de IA
        if (els.scoreRing)    els.scoreRing.style.setProperty('--cv-ai-score', '0');
        if (els.overallScore) els.overallScore.textContent = '0';
        if (els.scoreLabel)   els.scoreLabel.textContent = 'Sin analizar';
        if (els.feedback)     els.feedback.hidden = true;
        setCvAiMetric(els.clarityValue, els.clarityFill, 0);
        setCvAiMetric(els.skillsValue, els.skillsFill, 0);
        setCvAiMetric(els.experienceValue, els.experienceFill, 0);
        if (els.status) els.status.textContent = 'Todavía no ejecutaste la evaluación visual del CV.';
        if (els.insight) { els.insight.textContent = 'Tu resumen profesional generado por IA aparecerá acá.'; els.insight.hidden = false; }
      });
    }

    // ── Analizar con IA ───────────────────────────────────────────────────────
    if (els.runBtn) {
      els.runBtn.addEventListener('click', async function () {
        if (hasCvAiReachedLimit(userEmail)) { syncLimitUi(); return; }

        const profile = getCandidateProfile(userEmail) || {};
        if (!hasCv(profile)) {
          if (els.status) els.status.textContent = 'Primero subí tu CV para poder analizarlo.';
          return;
        }

        els.runBtn.disabled = true;
        els.runBtn.textContent = 'Analizando…';
        if (els.status) els.status.textContent = 'Procesando CV con IA…';

        try {
          const res = await fetch(`${BACKEND}/api/cv/analyze/me`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentUser.token}` },
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const err = new Error(errBody.message || 'Error al analizar el CV con IA.');
            err.code = errBody.errorCode || errBody.code;
            throw err;
          }

          const data = await res.json();
          incrementCvAiDailyUsage(userEmail);

          const score = data.overallScore || 70;
          const evaluation = {
            clarity:    clampNumber(score + 5, 0, 100),
            skills:     clampNumber(score - 2, 0, 100),
            experience: clampNumber(score, 0, 100),
            overall:    score,
            status:     'Análisis generado por IA exitosamente.',
            aiData:     data,
          };

          renderCvAiEvaluation(evaluation, els);

          // Persistir
          const existing = getCandidateProfile(userEmail) || {};
          saveCandidateProfile(userEmail, { ...existing, cvAiEvaluation: evaluation });

        } catch (error) {
          console.error(error);
          if (error?.code === 'AI_TOKENS_EXHAUSTED') {
            if (els.status) els.status.textContent = error.message;
            if (els.insight) {
              els.insight.textContent = 'Tu resumen profesional generado por IA aparecerá acá.';
              els.insight.hidden = false;
            }
          } else if (els.status) {
            els.status.textContent = 'Error: ' + error.message;
          }
        } finally {
          syncLimitUi();
          if (!hasCvAiReachedLimit(userEmail)) {
            els.runBtn.disabled = false;
            els.runBtn.textContent = 'Volver a analizar';
          }
        }
      });
    }

    // ── Cargar datos del backend ──────────────────────────────────────────────
    async function hydrateFromBackend() {
      try {
        const res = await fetch(`${BACKEND}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${currentUser.token}` },
        });
        if (!res.ok) return;

        const userData = await res.json();
        const p = userData.candidateProfile;
        if (!p) return;

        const existing = getCandidateProfile(userEmail) || {};
        const merged = {
          ...existing,
          version:    PROFILE_VERSION,
          email:      userEmail,
          cvDataUrl:  p.cvUrl  || existing.cvDataUrl,
          cvFileName: p.cvOriginalName || existing.cvFileName,
          photoUrl:   p.photoUrl || existing.photoUrl,
        };

        if (p.cvAnalysis) {
          const score = p.cvAnalysis.overallScore || 70;
          merged.cvAiEvaluation = {
            clarity:    clampNumber(score + 5, 0, 100),
            skills:     clampNumber(score - 2, 0, 100),
            experience: clampNumber(score, 0, 100),
            overall:    score,
            status:     'Análisis recuperado del servidor.',
            aiData:     p.cvAnalysis,
          };
        }

        saveCandidateProfile(userEmail, merged);
        syncCvUi(merged);
        syncLimitUi();
      } catch (e) {
        console.warn('[Mi CV] Error al cargar del backend:', e);
      }
    }

    void hydrateFromBackend();
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
