/**
 * Starwake Mode Hub
 *
 * Integration:
 *   import { mountModeHub } from './mode-hub.js';
 *   const hub = mountModeHub({ root, onAction });
 *
 * onAction receives one of:
 *   { action: 'pve'|'pvp-create'|'pvp-join', courseId, roomCode? }
 *   { action: 'freeplay', destination: 'freeflight', prototype: true }
 *   { action: 'designer', prompt, courseId, seed, course?, generation: 'ai'|'local-deterministic' }
 *     `course` is a full forged course definition when the AI forge succeeded.
 * The same payload is emitted as a bubbling `starwake:hub-action` DOM event.
 *
 * The caller owns screen transitions, lobby creation/invites, and applying the
 * selected course to the existing race flow. This module does not start a race.
 */

import './mode-hub.css';

const MAPS = [
  { id: 'neon-rift', name: 'NEON RIFT', place: 'KEPLER-62F · ORBITAL RELAY', note: 'Broken transit spines through electric blue.', kind: 'rift', tone: '#72f4df', number: '01' },
  { id: 'io-storm', name: 'IO STORM', place: 'IO · VOLCANIC CLOUD SEA', note: 'Charged ash lanes above a lava ocean.', kind: 'storm', tone: '#ffad70', number: '02' },
  { id: 'titan-veil', name: 'TITAN VEIL', place: 'TITAN · METHANE ICE CANALS', note: 'Amber fog, crystal walls, tight turns.', kind: 'ice', tone: '#f4c77e', number: '03' },
  { id: 'helix-deep', name: 'HELIX DEEP', place: 'HELIX-9 · NEBULA GRAVITY WELL', note: 'A violet dust cloud folds around the route.', kind: 'nebula', tone: '#d49cff', number: '04' },
  { id: 'earthfall-circuit', name: 'EARTHFALL CIRCUIT', place: 'EARTH · LOW ORBIT', note: 'Counter-steer against a constant pull toward the blue.', kind: 'earth', tone: '#63d7ff', number: '05' },
  { id: 'jovian-shear', name: 'JOVIAN SHEAR', place: 'JUPITER · RING PLANE', note: 'Cut clean through broken arcs and magnetic crosswinds.', kind: 'jupiter', tone: '#ffc184', number: '06' },
];

const esc = (value) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function seedFor(value) {
  let seed = 2166136261;
  for (const char of value) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return seed || 1;
}

function mapForPrompt(prompt) {
  const p = prompt.toLowerCase();
  if (/ice|frost|titan|frozen|glacier|methane|arctic|crystal/.test(p)) return MAPS[2];
  if (/jupiter|jovian|ring plane|gas giant|magnetic shear/.test(p)) return MAPS[5];
  if (/earth|blue planet|low orbit|downward pull|downward gravity|earth gravity|gravity pulls? down/.test(p)) return MAPS[4];
  if (/lava|volcan|magma|fire|ash|eruption|storm|lightning/.test(p)) return MAPS[1];
  if (/nebula|galaxy|cosmic|gravity|violet|spiral|deep space/.test(p)) return MAPS[3];
  return MAPS[0];
}

function mapArt(kind) {
  const paths = {
    rift: '<path d="M4 63 46 39l24 8 43-26 37 14 42-22"/><path d="m15 87 37-22 30 9 37-27 45 10 31-18"/><circle cx="157" cy="32" r="13"/>',
    storm: '<path d="M5 82 40 53l27 7 26-29 28 26 31-35 43 20"/><path d="m14 94 39-24 38 10 28-25 49 12 30-15"/><path d="m119 19 9 13-11 9 13 8"/>',
    ice: '<path d="m5 71 35-26 22 15 26-34 30 27 28-37 46 29"/><path d="m14 91 43-24 38 8 28-25 46 14 24-9"/><path d="m85 21 5 16-13 7 17 7"/>',
    nebula: '<path d="M5 77c28-38 48-36 67-4s40 36 59 2 37-37 68-5"/><path d="M8 95c30-25 47-20 68 5s42 23 61-3 38-25 61-9"/><circle cx="54" cy="30" r="2"/><circle cx="165" cy="33" r="2"/>',
    earth: '<path d="M5 80c35-20 44-16 68-2s42 12 59-8 38-28 83-10"/><path d="M12 94c23-15 48-20 68-7s38 13 61-8 40-23 72-9"/><circle cx="163" cy="34" r="17"/><path d="M148 31c10 0 12-10 22-9m-21 20c8-6 13-3 21 0"/>',
    jupiter: '<path d="M5 33c35-13 47 11 78 0s46-12 70 0 39 11 62-1"/><path d="M5 51c26-10 48 13 76 3s47-14 72-2 40 8 62-2"/><path d="M5 71c31-9 48 10 77 4s43-11 70-2 39 9 63 1"/><ellipse cx="164" cy="54" rx="17" ry="7"/>',
  };
  const routes={
    rift:'M12 72 42 70 57 28 86 39 101 82 133 91 156 52 184 43 208 69',
    storm:'M12 81 37 58 64 71 79 25 111 35 134 83 161 73 179 27 208 40',
    ice:'M12 68 40 39 69 41 89 69 115 78 143 43 169 33 190 60 208 72',
    nebula:'M12 75 36 40 64 25 88 49 72 82 106 94 139 74 151 38 181 25 208 47',
    earth:'M12 79 40 56 57 24 91 32 110 67 136 91 159 78 167 37 194 27 208 57',
    jupiter:'M12 60 38 82 63 78 78 39 104 25 129 42 151 75 178 83 189 45 208 31',
  };
  return `<svg viewBox="0 0 220 110" aria-hidden="true"><defs><linearGradient id="hub-grad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="currentColor" stop-opacity=".42"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="hub-map-fill" d="M0 88 47 47l27 10 48-39 41 26 57-27v93H0z"/>${paths[kind]}<path class="hub-map-route" d="${routes[kind]||routes.rift}"/><circle class="hub-map-ping" cx="12" cy="72" r="3"/><circle class="hub-map-ping" cx="208" cy="55" r="3"/></svg>`;
}

export function mountModeHub({ root, onAction = () => {}, initialCourse = 'neon-rift', initialForged = null, initialMode = 'pve', deferReveal = false, forgeEndpoint = '/.netlify/functions/forge' } = {}) {
  if (!root) throw new Error('mountModeHub requires a root element');
  let forged = initialForged?.id === initialCourse ? initialForged : null;
  let selectedCourse = forged || MAPS.some(m => m.id === initialCourse) ? initialCourse : MAPS[0].id;
  let forging = false;
  const courseName = (id) => (forged?.id === id ? forged.name : MAPS.find(m => m.id === id)?.name) || MAPS[0].name;
  let selectedMode = initialMode === 'pvp' ? 'pvp' : 'pve';

  root.innerHTML = `
    <main class="sw-hub" aria-labelledby="sw-hub-title">
      <div class="sw-hub-grid" aria-hidden="true"></div>
      <header class="sw-hub-head">
        <div class="sw-hub-brand"><span class="sw-hub-mark">✳</span><span>STARWAKE</span></div>
        <span class="sw-hub-season"><i></i> FRONTIER FLIGHT LEAGUE · SEASON 01</span>
      </header>
      <div class="sw-hub-content">
        <section class="sw-hub-intro">
          <p class="sw-hub-kicker">FLIGHT DECK <span></span> 01 / 03</p>
          <h1 id="sw-hub-title">Choose your<br><em>frontier.</em></h1>
          <p>Race a mapped course, break off into the unknown, or forge a world from a thought.</p>
          <div class="sw-hub-signal"><span>◈</span><div><b>ONE SHARED COURSE</b><small>Lobby pilots receive the same map and seed.</small></div></div>
        </section>
        <section class="sw-hub-main" aria-label="Choose a flight mode">
          <div class="sw-hub-section-head"><div><small>01 — RACE HUB</small><h2>Pick your heat.</h2></div><div class="sw-hub-mode" role="group" aria-label="Race mode"><button type="button" data-mode="pve" aria-pressed="${selectedMode === 'pve'}">PvE <small>VS SIM PILOTS</small></button><button type="button" data-mode="pvp" aria-pressed="${selectedMode === 'pvp'}">PvP <small>WITH YOUR CREW</small></button></div></div>
          <div class="sw-hub-maps" role="list" aria-label="Race maps">${MAPS.map(m => `<button class="sw-hub-map ${m.id === selectedCourse ? 'is-selected' : ''}" type="button" role="listitem" data-course="${m.id}" aria-pressed="${m.id === selectedCourse}" style="--map-tone:${m.tone}"><span class="sw-map-art sw-map-${m.kind}">${mapArt(m.kind)}</span><span class="sw-map-num">${m.number}</span><span class="sw-map-copy"><small>${m.place}</small><b>${m.name}</b><span>${m.note}</span></span><span class="sw-map-check" aria-hidden="true">✓</span></button>`).join('')}</div>
          <label class="sw-callsign" for="sw-callsign"><span>CALLSIGN</span><input id="sw-callsign" maxlength="18" autocomplete="nickname" spellcheck="false" aria-label="Pilot callsign"><small>OTHER PILOTS SEE THIS</small></label><button class="sw-hub-launch" type="button" data-action="launch"><span><small id="sw-hub-launch-label">${selectedMode === 'pve' ? 'START SOLO HEAT' : 'CREATE PRIVATE RACE'}</small><b id="sw-hub-launch-course">${esc(courseName(selectedCourse))}</b></span><span class="sw-hub-arrow">↗</span></button>
          <div class="sw-pvp-join" id="sw-pvp-join" ${selectedMode === 'pvp' ? '' : 'hidden'}><label for="sw-room-code">HAVE A ROOM CODE?</label><div><input id="sw-room-code" maxlength="5" autocomplete="off" placeholder="ROOM CODE" aria-label="Room code"><button type="button" data-action="pvp-join">JOIN CREW ↗</button></div></div>
        </section>
        <section class="sw-hub-side" aria-label="Explore and create">
          <article class="sw-hub-destination sw-freeflight">
            <div class="sw-destination-visual" aria-hidden="true"><span class="sw-planet"></span><span class="sw-orbit sw-orbit-a"></span><span class="sw-orbit sw-orbit-b"></span><i class="sw-flight-path"></i><b>∞</b></div>
            <div class="sw-destination-copy"><small>02 — FREE FLIGHT</small><h2>Keep going.</h2><p>No clock, no rivals. Roam your selected world freely and chase glowing signal shards for a new best.</p><button type="button" data-action="freeflight">ENTER FREE FLIGHT <span>↗</span></button></div>
          </article>
          <article class="sw-hub-destination sw-designer">
            <div class="sw-designer-heading"><small>03 — WORLD FORGE</small><span>AI COURSE DESIGNER</span></div><h2>Describe a new world.</h2><p>OpenAI designs the track shape, palette, gravity, crosswinds, and hazards from your words. Your whole lobby races the forged course.</p>
            <form class="sw-forge-form"><label class="sw-sr-only" for="sw-forge-prompt">Describe your racing world</label><textarea id="sw-forge-prompt" maxlength="180" placeholder="Type the racing world of your dreams…" required></textarea><button type="submit" aria-label="Build course">✦</button></form>
            <button type="button" class="sw-forge-result" id="sw-forge-result" hidden></button>
            <div class="sw-forge-foot"><span id="sw-forge-status" role="status">TRY: “A CANYON RACE THROUGH A SHATTERED MOON”</span><button type="button" data-action="forge">FORGE WORLD <span>→</span></button></div>
          </article>
        </section>
      </div>
      <footer class="sw-hub-footer"><span>STARWAKE FLIGHT SYSTEMS</span><span>FLY CLEAN · FIND YOUR LINE · MAKE THE FRONTIER</span></footer>
    </main>`;

  const $ = (sel) => root.querySelector(sel);
  const emit = (detail) => {
    const normalized = { courseId: selectedCourse, prompt: '', ...detail };
    root.dispatchEvent(new CustomEvent('starwake:hub-action', { bubbles: true, detail: normalized }));
    try { onAction(normalized); } catch (error) { console.error('[Starwake mode hub] onAction failed', error); }
  };
  let offlineMatch = null;
  // Top-down sketch of a forged lap: progress runs left to right, lateral offset up and down.
  const trackSketch = (path = []) => {
    const pts = path.map(([t, x, y]) => `${(8 + t * 204).toFixed(1)},${(30 - x * 20).toFixed(1)}`).join(' ');
    const dots = path.slice(1, -1).map(([t, x, y]) => `<circle cx="${(8 + t * 204).toFixed(1)}" cy="${(30 - x * 20).toFixed(1)}" r="${(1.6 + (y + 1) * 1.1).toFixed(1)}"/>`).join('');
    return `<svg class="sw-forge-map" viewBox="0 0 220 60" aria-hidden="true"><polyline points="${pts}"/>${dots}</svg>`;
  };
  const level = (value, max) => (value <= max * 0.15 ? 'NONE' : value <= max * 0.5 ? 'LOW' : value <= max * 0.8 ? 'MED' : 'HIGH');
  const renderForged = () => {
    const card = $('#sw-forge-result');
    card.hidden = !forged && !offlineMatch;
    if (forged) {
      card.dataset.course = forged.id;
      card.style.setProperty('--map-tone', forged.accent);
      const gravity = level(-Number(forged.forces?.gravity || 0), 0.36), wind = level(Number(forged.forces?.lateralDrift || 0), 0.18);
      card.innerHTML = `<small>AI-FORGED · ${esc(forged.planet)} · ${esc(forged.world)}</small><b>${esc(forged.name)}</b><span>${esc(forged.summary)}</span>${trackSketch(forged.track?.path)}<em class="sw-forge-chips"><u>GRAVITY ${gravity}</u><u>CROSSWIND ${wind}</u><u>${forged.hazards?.length || 0} HAZARD ZONES</u></em><strong class="sw-forge-race" data-action="race-forged">RACE THIS WORLD ↗</strong>`;
    } else if (offlineMatch) {
      card.dataset.course = offlineMatch.id;
      card.style.setProperty('--map-tone', offlineMatch.tone);
      card.innerHTML = `<small class="sw-forge-offline">OFFLINE FORGE · AI NOT CONNECTED ON THIS SERVER</small><b>${esc(offlineMatch.name)}</b><span>The AI designer is unavailable, so your idea was matched to the closest hand-built world, with a variant seeded from your words.</span><strong class="sw-forge-race" data-action="race-forged">RACE THIS WORLD ↗</strong>`;
    }
  };
  const chooseCourse = (id) => {
    if (!MAPS.some(m => m.id === id) && forged?.id !== id) return;
    selectedCourse = id;
    root.querySelectorAll('[data-course]').forEach(button => {
      const active = button.dataset.course === id;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#sw-hub-launch-course').textContent = courseName(id);
  };
  const handleClick = (event) => {
    // Checked first: the forge card is itself a course button.
    if (event.target.closest('[data-action="race-forged"]')) {
      const id = forged?.id || offlineMatch?.id;
      if (!id) return;
      chooseCourse(id);
      emit({ action: selectedMode === 'pvp' ? 'pvp-create' : 'pve', mode: selectedMode });
      return;
    }
    const modeButton = event.target.closest('[data-mode]');
    if (modeButton && root.contains(modeButton)) {
      selectedMode = modeButton.dataset.mode;
      root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === modeButton)));
      $('#sw-hub-launch-label').textContent = selectedMode === 'pve' ? 'START SOLO HEAT' : 'CREATE PRIVATE RACE';
      $('#sw-pvp-join').hidden = selectedMode !== 'pvp';
      return;
    }
    const courseButton = event.target.closest('[data-course]');
    if (courseButton && root.contains(courseButton)) { chooseCourse(courseButton.dataset.course); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'launch') emit({ action: selectedMode === 'pve' ? 'pve' : 'pvp-create', mode: selectedMode });
    if (action === 'pvp-join') {
      const roomCode = $('#sw-room-code').value.trim().toUpperCase();
      if (!roomCode) { $('#sw-room-code').focus(); return; }
      emit({ action: 'pvp-join', mode: 'pvp', roomCode });
    }
    if (action === 'freeflight') emit({ action: 'freeplay', destination: 'freeflight', prototype: true });
    if (action === 'forge') buildFromPrompt();

  };

  async function requestForge(prompt) {
    const response = await fetch(forgeEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.course) throw Object.assign(new Error(data.error || 'World Forge is offline.'), { offline: response.status === 404 || data.code === 'unconfigured' });
    return data.course;
  }
  async function buildFromPrompt() {
    const prompt = $('#sw-forge-prompt').value.trim();
    if (forging) return;
    if (!prompt) { $('#sw-forge-prompt').focus(); return; }
    const status = $('#sw-forge-status');
    const seed = seedFor(prompt.toLowerCase());
    forging = true;
    root.querySelector('.sw-designer').classList.add('is-forging');
    status.textContent = 'FORGING YOUR WORLD…';
    try {
      forged = await requestForge(prompt);
      offlineMatch = null;
      renderForged();
      chooseCourse(forged.id);
      status.textContent = `FORGED · ${forged.name} · READY TO RACE`;
      emit({ action: 'designer', prompt, courseId: forged.id, seed, course: forged, generation: 'ai' });
    } catch (error) {
      // No AI available (local preview or missing key): fall back to the
      // closest authored course with a prompt-seeded variant.
      const map = mapForPrompt(prompt);
      forged = null;
      offlineMatch = map;
      renderForged();
      chooseCourse(map.id);
      status.textContent = error.offline
        ? `OFFLINE FORGE · ${map.name} VARIANT ${seed.toString(16).slice(-6).toUpperCase()}`
        : `${String(error.message).toUpperCase()} · USING ${map.name}`;
      emit({ action: 'designer', prompt, courseId: map.id, seed: seedFor(`${map.id}:${prompt.toLowerCase()}`), generation: 'local-deterministic' });
    } finally {
      forging = false;
      root.querySelector('.sw-designer').classList.remove('is-forging');
    }
  }
  const forgeForm = root.querySelector('.sw-forge-form');
  const handleSubmit = (event) => { event.preventDefault(); buildFromPrompt(); };
  root.addEventListener('click', handleClick);
  forgeForm.addEventListener('submit', handleSubmit);
  // Enter forges; Shift+Enter keeps a newline.
  $('#sw-forge-prompt').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); buildFromPrompt(); } });
  renderForged();
  if (forged) chooseCourse(forged.id);
  // Callsign mirrors the game's pilot-name field and persists between visits.
  const callsign = $('#sw-callsign');
  callsign.value = localStorage.getItem('starwake-name') || '';
  callsign.addEventListener('input', () => {
    const value = callsign.value.replace(/[<>]/g, '').toUpperCase();
    callsign.value = value;
    const legacy = document.querySelector('#pilot-name');
    if (legacy) legacy.value = value;
    if (value.trim()) localStorage.setItem('starwake-name', value.trim());
  });

  const revealAfterLaunch = () => {
    root.hidden = false;
    root.classList.add('sw-hub-revealed');
    document.querySelectorAll('.screen.active').forEach(screen => screen.classList.remove('active'));
  };
  if (deferReveal) {
    root.hidden = true;
    document.addEventListener('starwake:launch-complete', revealAfterLaunch);
  }
  return {
    getSelection: () => ({ mode: selectedMode, courseId: selectedCourse }),
    unmount: () => {
      document.removeEventListener('starwake:launch-complete', revealAfterLaunch);
      root.removeEventListener('click', handleClick);
      forgeForm.removeEventListener('submit', handleSubmit);
      root.replaceChildren();
    },
  };
}

export { MAPS as STARWAKE_HUB_MAPS };
