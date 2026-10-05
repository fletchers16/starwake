import { mountModeHub } from './mode-hub.js';
import { COURSE_CATALOG } from './course-catalog.js';

const app = document.querySelector('#app');
if (!app) throw new Error('Starwake app root was not found');

const root = document.createElement('div');
root.id = 'mode-hub-root';
app.append(root);

let launched = false;
// Invite links: tell the pilot which room they're about to join.
{
  const params = new URLSearchParams(location.search);
  const invitedRoom = String(params.get('room') || '').toUpperCase();
  const from = String(params.get('from') || '').replace(/[<>&"]/g, '').slice(0, 18).toUpperCase();
  const challenge = String(params.get('challenge') || '');
  const label = document.querySelector('#launch-button span:nth-child(2)');
  const eyebrow = document.querySelector('.launch-eyebrow');
  if (/^[A-Z0-9]{5}$/.test(invitedRoom)) {
    if (label) label.textContent = `JOIN ROOM ${invitedRoom}`;
    if (eyebrow) eyebrow.innerHTML = from ? `<i></i> ⚔ ${from} CHALLENGES YOU TO A LIVE BATTLE` : `<i></i> YOU'VE BEEN INVITED TO A PRIVATE RACE`;
    // Headline the invite: who's waiting and on which course.
    const headline = document.querySelector('.launch-copy h1');
    if (headline && from) { headline.classList.add('dare'); headline.innerHTML = `JOIN <em>${from}</em><br />FOR A BATTLE.`; }
    fetch(`/.netlify/functions/game?code=${invitedRoom}`).then((r) => (r.ok ? r.json() : null)).then((data) => {
      const room = data?.room;
      if (!room) return;
      const course = room.course?.name || COURSE_CATALOG.find((x) => x.id === room.courseId)?.name || 'THEIR TRACK';
      const safe = (t) => String(t).replace(/[<>&"]/g, '').toUpperCase();
      if (headline && from) headline.innerHTML = `JOIN <em>${from}</em><br />ON ${safe(course)}.`;
      const sub = document.querySelector('.launch-copy > p:not(.launch-eyebrow)');
      const n = room.players?.length || 0;
      if (sub) sub.textContent = room.phase === 'lobby' ? `${n} pilot${n === 1 ? ' is' : 's are'} in the lobby. Grab pods, zap rivals, steal their points. No install, no account.` : 'This battle has already started. Ask your friend for a fresh invite after the heat.';
    }).catch(() => {});
  } else if (/^[a-z0-9]{8}$/.test(challenge)) {
    if (label) label.textContent = 'ACCEPT CHALLENGE';
    if (eyebrow) eyebrow.innerHTML = `<i></i> ★ A FRIEND DARES YOU`;
    // Placeholder dare until the details load, so the generic slogan never flashes.
    const placeholder = document.querySelector('.launch-copy h1');
    if (placeholder) { placeholder.classList.add('dare'); placeholder.innerHTML = 'BEAT <em>THEIR RUN.</em>'; }
    // Name the dare before the player commits: who, what score, which course.
    fetch('/.netlify/functions/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'challenge-get', id: challenge }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const c = data?.challenge;
        if (!c || !eyebrow) return;
        const course = c.course?.name || COURSE_CATALOG.find((x) => x.id === c.courseId)?.name || 'THEIR TRACK';
        const safe = (t) => String(t).replace(/[<>&"]/g, '').toUpperCase();
        eyebrow.innerHTML = `<i></i> ★ ${safe(c.name)} DARES YOU`;
        const headline = document.querySelector('.launch-copy h1');
        if (headline) { headline.classList.add('dare'); headline.innerHTML = `BEAT <em>${Number(c.score || 0).toLocaleString()}</em><br />ON ${safe(course)}.`; }
        const sub = document.querySelector('.launch-copy > p:not(.launch-eyebrow)');
        const ladder = Array.isArray(data.ladder) ? data.ladder : [];
        const tried = ladder.length > 1 ? ` ${ladder.length} pilots have tried; best ${Number(ladder[0].score).toLocaleString()} by ${safe(ladder[0].name)}.` : '';
        if (sub) sub.textContent = `${safe(c.name)} flew this exact track. Their ship replays the run beside you, and you can zap it. One heat.${tried}`;
      })
      .catch(() => {});
  }
}
let savedProfile = {};
try { savedProfile = JSON.parse(localStorage.getItem('starwake-profile') || '{}'); } catch {}
let selectedPrompt = String(savedProfile.coursePrompt || '');
let selectedSeed = Number(savedProfile.courseSeed) >>> 0;
let selectedCourseId = String(savedProfile.courseId || 'neon-rift');

const hub = mountModeHub({
  root,
  deferReveal: true,
  initialCourse: selectedCourseId,
  initialForged: savedProfile.forgedCourse || null,
  onAction: handleHubAction,
});

function courseSeedFor(courseId) {
  if (courseId === selectedCourseId && selectedSeed) return selectedSeed;
  let seed = 2166136261;
  for (const char of String(courseId || 'neon-rift')) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return seed || 1;
}

function selectCourse(courseId, prompt = '', seed = 0, course = null) {
  const nextCourseId = courseId || 'neon-rift';
  if (nextCourseId !== selectedCourseId && !prompt) {
    selectedPrompt = '';
    selectedSeed = 0;
  }
  selectedCourseId = nextCourseId;
  if (prompt) selectedPrompt = prompt;
  selectedSeed = Number(seed) >>> 0;
  window.dispatchEvent(new CustomEvent('starwake:select-course', {
    detail: {
      courseId: selectedCourseId,
      prompt: selectedPrompt,
      seed: selectedSeed || courseSeedFor(selectedCourseId),
      course,
    },
  }));
}

function handleHubAction(payload) {
  if (!payload) return;
  if (payload.action === 'designer') {
    selectedCourseId = payload.courseId || selectedCourseId;
    selectedPrompt = payload.prompt || '';
    selectedSeed = Number(payload.seed) >>> 0;
    selectCourse(selectedCourseId, selectedPrompt, selectedSeed, payload.course || null);
    return;
  }

  if (payload.action === 'pve' || payload.action === 'pvp-create') {
    const prompt = payload.courseId === selectedCourseId ? selectedPrompt : '';
    selectCourse(payload.courseId, prompt, prompt ? courseSeedFor(payload.courseId) : 0);
    window.starwakeCreateLobby?.(payload.action === 'pve');
    return;
  }

  if (payload.action === 'pvp-join') {
    const input = document.querySelector('#join-code');
    if (input) input.value = String(payload.roomCode || '').toUpperCase();
    window.starwakeJoinLobby?.();
    return;
  }

  if (payload.action === 'freeplay') {
    // Free Flight roams the course selected on the hub.
    const courseId = payload.courseId || selectedCourseId;
    selectCourse(courseId, courseId === selectedCourseId ? selectedPrompt : '', courseId === selectedCourseId ? selectedSeed : 0);
    const seed = courseSeedFor(courseId);
    window.dispatchEvent(new CustomEvent('starwake:start-freeflight', { detail: { seed } }));
  }
}

function applyHubVisibility() {
  if (!launched) return;
  const active = document.querySelector('.screen.active');
  if (active?.id === 'home-screen') {
    active.classList.remove('active');
    root.hidden = false;
    renderDares(); // refresh replies every time the pilot comes back to the hub
    return;
  }
  if (active) root.hidden = true;
}

window.addEventListener('starwake:launch-complete', () => {
  launched = true;
  window.setTimeout(applyHubVisibility, 0);
  // Invite links (?room=CODE) drop the pilot straight into that lobby.
  const params = new URLSearchParams(location.search);
  const invited = String(params.get('room') || '').toUpperCase();
  const challengeId = String(params.get('challenge') || '');
  if (/^[a-z0-9]{8}$/.test(challengeId)) {
    params.delete('challenge');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
    window.setTimeout(() => window.starwakeOpenChallenge?.(challengeId), 50);
    return;
  }
  if (/^[A-Z0-9]{5}$/.test(invited)) {
    params.delete('room');
    params.delete('from');
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
    const input = document.querySelector('#join-code');
    if (input) input.value = invited;
    window.setTimeout(() => window.starwakeJoinLobby?.(), 50);
  }
});

const screenObserver = new MutationObserver(applyHubVisibility);
for (const screen of document.querySelectorAll('.screen')) {
  screenObserver.observe(screen, { attributes: true, attributeFilter: ['class'] });
}

const garageLink = document.createElement('button');
garageLink.className = 'sw-hub-garage';
garageLink.type = 'button';
garageLink.textContent = '✧  SHIP GARAGE';
garageLink.setAttribute('aria-label', 'Open ship garage');
// Inline under the launch button so it never floats over the course cards.
(root.querySelector('.sw-hub-launch') || root).after(garageLink);
garageLink.addEventListener('click', () => document.querySelector('#garage-button')?.click());

const freeFlightExit = document.createElement('button');
freeFlightExit.className = 'sw-freeflight-exit';
freeFlightExit.type = 'button';
freeFlightExit.textContent = '← RETURN TO FLIGHT DECK';
freeFlightExit.hidden = true;
document.querySelector('#race-screen')?.append(freeFlightExit);
freeFlightExit.addEventListener('click', () => {
  freeFlightExit.hidden = true;
  app.classList.remove('free-flight');
  window.starwakeStopFreeFlight?.();
});
window.addEventListener('starwake:start-freeflight', () => {
  freeFlightExit.hidden = false;
  app.classList.add('free-flight');
});

window.addEventListener('starwake:freeflight-exit', () => {
  freeFlightExit.hidden = true;
  app.classList.remove('free-flight');
  window.starwakeStopFreeFlight?.();
});

// Keep the hub mounted for the full session; its event listeners are shared
// with the existing lobby and race screens.
window.starwakeModeHub = hub;

// Dares you've sent: show who took them on (from each link's ladder), with a one-tap race back.
// Rebuilt whenever the hub is shown, so a dare sent this session appears without a reload.
let daresBusy = false;
async function renderDares() {
  if (daresBusy) return;
  daresBusy = true;
  try {
    let dares = [];
    try { dares = JSON.parse(localStorage.getItem('starwake-sent-dares') || '[]').slice(0, 3); } catch {}
    document.querySelector('#mode-hub-root .sw-dares')?.remove();
    if (!dares.length) return;
    const results = await Promise.all(dares.map((d) => fetch('/.netlify/functions/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'challenge-get', id: d.id }) }).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    const safe = (t) => String(t ?? '').replace(/[<>&"]/g, '');
    const rows = dares.map((d, i) => {
      if (!results[i]) return '';
      // The ladder covers the whole send-it-back chain and includes you, so count everyone else.
      const ladder = results[i].ladder || [], me = d.name || results[i].challenge?.name;
      const others = ladder.filter((x) => x.name !== me), top = ladder[0];
      const status = !others.length ? 'No one has tried yet' : top?.name === me ? `${others.length} tried · you still hold the top spot` : `${others.length} tried · ${safe(top.name)} leads with ${Number(top.score).toLocaleString()}`;
      const action = !others.length ? 'OPEN ↗' : top?.name === me ? 'DEFEND ↗' : 'TRY AGAIN ↗';
      // TRY AGAIN races the leader's own run when they left one; otherwise your dare link.
      const target = top && top.name !== me && /^[a-z0-9]{8}$/.test(top.id || '') ? top.id : d.id;
      return `<a class="sw-dare-row" href="?challenge=${target}"><b>${safe(d.course)}</b><span>${status}</span><em>${action}</em></a>`;
    }).filter(Boolean);
    document.querySelector('#mode-hub-root .sw-dares')?.remove();
    if (!rows.length) return;
    const card = document.createElement('div');
    card.className = 'sw-dares';
    card.innerHTML = `<small>★ YOUR DARES</small>${rows.join('')}`;
    document.querySelector('#mode-hub-root .sw-hub-signal')?.after(card);
  } finally {
    daresBusy = false;
  }
}
renderDares();
