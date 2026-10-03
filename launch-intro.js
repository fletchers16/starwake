const intro = document.querySelector('#launch-intro');
const launchButton = document.querySelector('#launch-button');
const skipButton = document.querySelector('#launch-skip');
const count = document.querySelector('#launch-count');

if (intro && launchButton && skipButton) {
  intro.classList.add('ready');
  intro.setAttribute('aria-hidden', 'false');
  intro.removeAttribute('inert');

  let completed = false;
  let clock = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function finishLaunch(skipped = false) {
    if (completed) return;
    completed = true;
    window.clearInterval(clock);
    launchButton.disabled = true;
    skipButton.disabled = true;

    if (skipped || reducedMotion.matches) {
      revealHub(skipped ? 'skip' : 'reduced-motion');
      return;
    }

    intro.classList.add('departing');
    count.textContent = 'ENGINES · FULL THRUST';
    window.setTimeout(() => revealHub('launch'), 1450);
  }

  function revealHub(via) {
    intro.classList.add('leaving');
    intro.setAttribute('aria-hidden', 'true');
    intro.setAttribute('inert', '');
    window.dispatchEvent(new CustomEvent('starwake:launch-complete', {
      detail: { via, timestamp: Date.now() },
    }));
    window.setTimeout(() => {
      intro.classList.remove('ready');
      intro.classList.remove('departing', 'leaving');
    }, 450);
  }

  launchButton.addEventListener('click', () => finishLaunch(false));
  skipButton.addEventListener('click', () => finishLaunch(true));
  window.addEventListener('keydown', (event) => {
    if (!intro.classList.contains('ready') || completed) return;
    if (event.key === 'Enter' && document.activeElement !== skipButton) {
      event.preventDefault();
      finishLaunch(false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishLaunch(true);
    }
  });
}
