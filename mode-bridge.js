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
