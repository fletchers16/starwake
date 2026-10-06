import { mountModeHub } from './mode-hub.js';
import './cartoon-skin.css';
import { COURSE_CATALOG } from './course-catalog.js';

const app = document.querySelector('#app');
if (!app) throw new Error('Starwake app root was not found');

const root = document.createElement('div');
root.id = 'mode-hub-root';
app.append(root);

let launched = false;
// A tab that reloads mid-battle skips the intro so its held seat is reclaimed right away.
try {
  const hasSeat = !!JSON.parse(sessionStorage.getItem('starwake-seat') || 'null')?.code;
  const plain = !new URLSearchParams(location.search).get('room') && !new URLSearchParams(location.search).get('challenge');
  if (hasSeat && plain) window.setTimeout(() => document.querySelector('#launch-skip')?.click(), 60);
} catch {}
// Invite links: tell the pilot which room they're about to join.
{
  const params = new URLSearchParams(location.search);
  const invitedRoom = String(params.get('room') || '').toUpperCase();
  const from = String(params.get('from') || '').replace(/[<>&"]/g, '').slice(0, 18).toUpperCase();
  const challenge = String(params.get('challenge') || '');
  const label = document.querySelector('#launch-button span:nth-child(2)');
  const eyebrow = document.querySelector('.launch-eyebrow');
  if (/^[A-Z0-9]{5}$/.test(invitedRoom) || /^[a-z0-9]{8}$/.test(challenge)) document.querySelector('#launch-intro')?.classList.add('invited');
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
      const hostName = from || safe(room.players?.find((p) => p.id === room.hostId)?.name || '');
      if (headline && hostName) { headline.classList.add('dare'); headline.innerHTML = `JOIN <em>${hostName}</em><br />ON ${safe(course)}.`; }
      if (eyebrow && !from && hostName) eyebrow.innerHTML = `<i></i> ⚔ ${hostName} CHALLENGES YOU TO A LIVE BATTLE`;
      const sub = document.querySelector('.launch-copy > p:not(.launch-eyebrow)');
      const n = room.players?.length || 0;
      if (sub) sub.textContent = room.phase === 'lobby' ? `${n} pilot${n === 1 ? ' is' : 's are'} in the lobby. Grab pods, zap rivals, steal their points. No install, no account.`
        : room.phase === 'results' ? `They're between heats. Join now and you'll fly from the next heat.`
        : room.phase === 'race' ? `A heat is in progress. You can join as soon as it ends (about a minute).`
        : `This season just ended. Ask your friend for a rematch invite.`;
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
        let mine = [];
        try { mine = JSON.parse(localStorage.getItem('starwake-sent-dares') || '[]'); } catch {}
        const answered = mine.find((d) => d.id === c.parent || d.id === c.root);
        eyebrow.innerHTML = answered ? `<i></i> ★ PAYBACK · ${safe(c.name)} BEAT YOUR ${Number(answered.score || 0).toLocaleString()}` : `<i></i> ★ ${safe(c.name)} DARES YOU`;
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

window.addEventListener('starwake:launch-complete', (event) => {
  launched = true;
  window.setTimeout(applyHubVisibility, 0);
  // Invite links (?room=CODE) drop the pilot straight into that lobby.
  const params = new URLSearchParams(location.search);
  const invited = String(params.get('room') || '').toUpperCase();
  const challengeId = String(params.get('challenge') || '');
  if (!/^[A-Z0-9]{5}$/.test(invited) && !/^[a-z0-9]{8}$/.test(challengeId)) {
    window.setTimeout(() => window.starwakeResumeSeat?.(), 50);
    // The landing's buttons: open a battle room, race the aliens, or join with a code, straight from the first screen.
    const { intent, code } = event.detail || {};
    if (intent) window.setTimeout(() => {
      if (intent === 'join') { const input = document.querySelector('#join-code'); if (input) input.value = code; window.starwakeJoinLobby?.(); return; }
      root.querySelector(`[data-mode=${intent === 'solo' ? 'pve' : 'pvp'}]`)?.click();
      root.querySelector('.sw-hub-launch')?.click();
    }, 160);
  }
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
    try { dares = JSON.parse(localStorage.getItem('starwake-sent-dares') || '[]').slice(0, 5); } catch {}
    document.querySelector('#mode-hub-root .sw-dares')?.remove();
    if (!dares.length) return;
    const results = await Promise.all(dares.map((d) => fetch('/.netlify/functions/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'challenge-get', id: d.id }) }).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    const safe = (t) => String(t ?? '').replace(/[<>&"]/g, '');
    const seenRoots = new Set();
    const rows = dares.map((d, i) => {
      if (!results[i]) return '';
      // One row per chain (your dare and its send-backs share a ladder).
      const root = results[i].challenge?.root || d.id;
      if (seenRoots.has(root) || seenRoots.size >= 3) return '';
      seenRoots.add(root);
      // The ladder covers the whole send-it-back chain and includes you, so count everyone else.
      const ladder = results[i].ladder || [], me = d.name || results[i].challenge?.name;
      let device = '';
      try { device = localStorage.getItem('starwake-device') || ''; } catch {}
      const hash = (t) => [...String(t)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(36);
      const isMe = (x) => (x.dh && device ? x.dh === hash(device) : x.name === me);
      const others = ladder.filter((x) => !isMe(x)), top = ladder[0];
      const rivals = others.slice(0, 2).map((x) => safe(x.name)).join(', ');
      const status = !others.length ? 'No one has tried yet' : top && isMe(top) ? `You lead · ${rivals}${others.length > 2 ? ` +${others.length - 2}` : ''} tried` : `${safe(top.name)} leads with ${Number(top.score).toLocaleString()} · ${others.length} tried`;
      const action = !others.length ? 'OPEN ↗' : top && isMe(top) ? 'DEFEND ↗' : 'TRY AGAIN ↗';
      // TRY AGAIN races the leader's own run when they left one; otherwise your dare link.
      const target = top && !isMe(top) && /^[a-z0-9]{8}$/.test(top.id || '') ? top.id : d.id;
      const age = Math.max(0, Math.round((Date.now() - (d.at || Date.now())) / 3600000));
      const when = age < 1 ? 'just now' : age < 24 ? `${age}h ago` : `${Math.round(age / 24)}d ago`;
      return `<a class="sw-dare-row" href="?challenge=${target}"><b>${safe(d.course)} <small>your ${Number(d.score || 0).toLocaleString()} · ${when}</small></b><span>${status}</span><em>${action}</em></a>`;
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

// A 14-second loop of the core moves (snipe, telegraphed shot, perfect reflect), so the hub shows how it plays.
{
  const clip = document.createElement('figure');
  clip.className = 'sw-clip';
  clip.innerHTML = '<video src="/media/starwake-loop.webm" autoplay muted loop playsinline preload="metadata" aria-label="Gameplay: sniping a rival, then barrel-rolling a shot back"></video><figcaption>GRAB · ZAP · ROLL IT BACK</figcaption>';
  const video = clip.querySelector('video');
  // VP8 WebM only: browsers that can't play it simply don't show the card.
  if (!video.canPlayType('video/webm; codecs="vp8"')) clip.remove();
  else {
    video.addEventListener('error', () => clip.remove());
    // On phones the clip goes under the launch button so OPEN A BATTLE ROOM stays above the fold.
    const narrow = matchMedia('(max-width: 760px)').matches;
    document.querySelector(narrow ? '#mode-hub-root .sw-hub-launch' : '#mode-hub-root .sw-hub-signal')?.after(clip);
  }
}
