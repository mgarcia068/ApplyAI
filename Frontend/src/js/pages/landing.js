// ── NAVBAR ──────────────────────────────────────────────────
const navbar = document.getElementById('navbar');

if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}


function buildReviewCard(review) {
  const stars = Array(5).fill(
    `<svg class="review-card__star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>`
  ).join('');

  return `
    <article class="review-card">
      <div class="review-card__stars">${stars}</div>
      <p class="review-card__text">"${review.text}"</p>
      <div class="review-card__author">
        <div class="review-card__avatar">${review.initials}</div>
        <div>
          <div class="review-card__name">${review.name}</div>
          <div class="review-card__role">${review.role}</div>
        </div>
      </div>
    </article>
  `;
}

function initCarousel() {
  const track      = document.getElementById('reviews-track');
  const dotsWrap   = document.getElementById('reviews-dots');
  const btnPrev    = document.getElementById('reviews-prev');
  const btnNext    = document.getElementById('reviews-next');
  const wrapper    = track?.closest('.reviews__track-wrapper');

  if (!track) return;

  function getCardMetrics() {
    const firstCard = track.querySelector('.review-card');
    if (!firstCard) return { cardWidth: 0, gap: 0 };

    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return { cardWidth: firstCard.offsetWidth, gap };
  }

  function visibleCount() {
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;

    if (!wrapper) return 3;

    const { cardWidth, gap } = getCardMetrics();
    if (!cardWidth) return 3;

    const availableWidth = wrapper.parentElement?.clientWidth || wrapper.clientWidth;
    const fit = Math.floor((availableWidth + gap) / (cardWidth + gap));
    return fit >= 4 ? 4 : 3;
  }

  function syncVisibleLayout() {
    const visible = visibleCount();
    if (wrapper) {
      wrapper.style.setProperty('--reviews-visible', String(visible));
    }
    return visible;
  }

  const total   = REVIEWS.length;
  let current   = 0;
  let autoTimer = null;

  track.innerHTML = REVIEWS.map(buildReviewCard).join('');

  function getDotCount() {
    return Math.max(1, total - visibleCount() + 1);
  }

  function getStepSize() {
    const { cardWidth, gap } = getCardMetrics();
    if (!cardWidth) return 0;

    if (visibleCount() === 1 && wrapper) {
      return wrapper.clientWidth;
    }

    return cardWidth + gap;
  }

  function buildDots() {
    syncVisibleLayout();
    const dotCount = getDotCount();
    dotsWrap.innerHTML = Array.from({ length: dotCount }, (_, i) =>
      `<button class="reviews__dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Ir a reseña ${i + 1}"></button>`
    ).join('');

    dotsWrap.querySelectorAll('.reviews__dot').forEach(dot => {
      dot.addEventListener('click', () => goTo(Number(dot.dataset.index)));
    });
  }

  function goTo(index) {
    const visible = syncVisibleLayout();
    const maxIndex = Math.max(0, total - visible);
    current = Math.max(0, Math.min(index, maxIndex));

    const stepSize = getStepSize();
    track.style.transform = `translateX(-${current * stepSize}px)`;
    dotsWrap.querySelectorAll('.reviews__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
    });

    btnPrev.disabled = current === 0;
    btnNext.disabled = current >= total - visible;
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    autoTimer = setInterval(() => {
      const maxIndex = Math.max(0, total - syncVisibleLayout());
      goTo(current >= maxIndex ? 0 : current + 1);
    }, 7000);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  btnNext.addEventListener('click', () => { stopAuto(); next(); startAuto(); });
  btnPrev.addEventListener('click', () => { stopAuto(); prev(); startAuto(); });
  track.closest('.reviews__carousel').addEventListener('mouseenter', stopAuto);
  track.closest('.reviews__carousel').addEventListener('mouseleave', startAuto);

  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      stopAuto();
      diff > 0 ? next() : prev();
      startAuto();
    }
  });

  let resizeDebounce;
  window.addEventListener('resize', () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      buildDots();
      goTo(current);
    }, 120);
  });

  buildDots();
  goTo(0);
  startAuto();
}

document.addEventListener('DOMContentLoaded', initCarousel);