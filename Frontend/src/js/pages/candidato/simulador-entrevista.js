(function () {
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

  function showToast(title, message, type = 'info') {
    // Basic toast fallback if not available globally
    if (window.showToast) {
      window.showToast(title, message, type);
    } else {
      alert(`${title}: ${message}`);
    }
  }

  function renderInterviewData(data, container, list, advice, emptyState, generateBtn) {
    list.innerHTML = data.questions.map((q, i) => `
      <div class="card p-4 border border-base bg-base flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="badge badge--${q.type === 'Technical' ? 'primary' : 'secondary'}">${q.type === 'Technical' ? 'Técnica' : 'Conductual'}</span>
          <strong class="text-sm">Pregunta ${i + 1}</strong>
        </div>
        <p class="text-base font-medium mt-1">${q.question}</p>
        <p class="text-xs text-muted mt-2 border-t pt-2 border-base">💡 <strong>Tip:</strong> ${q.hint}</p>
      </div>
    `).join('');

    advice.innerHTML = `<strong>Consejo General:</strong> ${data.advice}`;
    
    emptyState.hidden = true;
    container.hidden = false;
    generateBtn.textContent = 'Generar nuevas preguntas';
  }

  function initInterviewSimulator() {
    const generateInterviewBtn = document.getElementById('generateInterviewBtn');
    const interviewQuestionsContainer = document.getElementById('interviewQuestionsContainer');
    const interviewQuestionsList = document.getElementById('interviewQuestionsList');
    const interviewAdvice = document.getElementById('interviewAdvice');
    const interviewEmptyState = document.getElementById('interviewEmptyState');
    const interviewLoader = document.getElementById('interviewLoader');

    if (!generateInterviewBtn) return;

    // Cargar datos previos si existen
    const savedInterviewStr = localStorage.getItem('ApplyAI.savedInterview');
    if (savedInterviewStr) {
      const savedData = safeJsonParse(savedInterviewStr, null);
      if (savedData && savedData.questions && savedData.questions.length > 0) {
        renderInterviewData(savedData, interviewQuestionsContainer, interviewQuestionsList, interviewAdvice, interviewEmptyState, generateInterviewBtn);
      }
    }

    generateInterviewBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) return;

      generateInterviewBtn.disabled = true;
      interviewEmptyState.hidden = true;
      interviewQuestionsContainer.hidden = true;
      interviewLoader.hidden = false;

      try {
        const res = await axios.post(`${window.APP_CONFIG.API_URL}/api/cv/simulate-interview`, {}, {
          headers: { Authorization: `Bearer ${user.token}` }
        });

        const data = res.data;
        if (!data || !data.questions) throw new Error('Respuesta inválida de IA');

        // Guardar localmente
        localStorage.setItem('ApplyAI.savedInterview', JSON.stringify({
          questions: data.questions,
          advice: data.advice
        }));

        renderInterviewData(data, interviewQuestionsContainer, interviewQuestionsList, interviewAdvice, interviewEmptyState, generateInterviewBtn);
        
        interviewLoader.hidden = true;
      } catch (err) {
        console.error('Error generando entrevista:', err);
        const errMsg = err.response?.data?.message || 'No se pudo generar la simulación. Asegúrate de tener tu CV subido y de contar con skills en tu perfil.';
        showToast('Error', errMsg, 'error');
        interviewEmptyState.hidden = false;
        interviewLoader.hidden = true;
      } finally {
        generateInterviewBtn.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInterviewSimulator);
  } else {
    initInterviewSimulator();
  }
})();
