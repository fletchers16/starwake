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

  // intent: 'battle' (open a room), 'solo' (race the aliens), 'join' (with code), or none (browse the hub).
  let intent = null;
  // Invite and dare links ask for a name first, so recaps, awards and credits don't show a random callsign.
  const nameInput = document.querySelector('#launch-name');
  try { if (nameInput) nameInput.value = localStorage.getItem('starwake-name') || ''; } catch {}
  function saveName() {
    const name = (nameInput?.value || '').trim().toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 18);
    if (!name) return;
    try { localStorage.setItem('starwake-name', name); } catch {}
    for (const id of ['#pilot-name', '#sw-callsign']) { const el = document.querySelector(id); if (el) { el.value = name; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }
  }
  function finishLaunch(skipped = false, next = null) {
    if (completed) return;
    saveName();
    intent = next;
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
      detail: { via, timestamp: Date.now(), intent: intent?.kind || null, code: intent?.code || '' },
    }));
    window.setTimeout(() => {
      intro.classList.remove('ready');
      intro.classList.remove('departing', 'leaving');
    }, 450);
  }

  launchButton.addEventListener('click', () => finishLaunch(false, { kind: 'battle' }));
  skipButton.addEventListener('click', () => finishLaunch(true));
  document.querySelector('#launch-solo')?.addEventListener('click', () => finishLaunch(true, { kind: 'solo' }));
  document.querySelector('#launch-quick')?.addEventListener('click', () => finishLaunch(true, { kind: 'quick' }));
  const join = document.querySelector('#launch-join'), code = document.querySelector('#launch-code');
  code?.addEventListener('input', () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); code.classList.remove('bad'); });
  join?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = (code?.value || '').trim();
    if (!/^[A-Z0-9]{5}$/.test(value)) { code?.classList.add('bad'); code?.focus(); return; }
    finishLaunch(true, { kind: 'join', code: value });
  });
  window.addEventListener('keydown', (event) => {
    if (!intro.classList.contains('ready') || completed) return;
    if (event.key === 'Enter' && (document.activeElement === document.body || document.activeElement === nameInput)) {
      event.preventDefault();
      finishLaunch(false, { kind: 'battle' });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishLaunch(true);
    }
  });
}
