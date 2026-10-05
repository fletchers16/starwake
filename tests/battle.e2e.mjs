/**
 * Two-device battle test: a laptop and an emulated iPhone (touch) in isolated
 * browser contexts join one room through an invite link, race, zap each other
 * (keyboard F on the laptop, the touch FIRE button on the phone), finish the heat
 * and compare standings.
 *
 *   npm run dev            # in another terminal (or any running server)
 *   node tests/battle.e2e.mjs [baseUrl]
 *
 * Env: OUT=<dir> for screenshots (default tests/artifacts), HEADED=1 to watch.
 * Uses playwright-core with an installed Chromium (npx playwright install chromium).
 */
import { chromium, devices } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:5180';
const OUT = process.env.OUT || new URL('./artifacts/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(page, fn, arg, { timeout = 20000, every = 250 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await page.evaluate(fn, arg).catch(() => null);
    if (value) return value;
    await wait(every);
  }
  return null;
}

const browser = await chromium.launch({
  headless: !process.env.HEADED,
  // Default GPU path (Metal on macOS); forcing SwiftShader fails to create WebGL contexts.
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const laptopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const phoneCtx = await browser.newContext({ ...devices['iPhone 13'] });
const laptop = await laptopCtx.newPage();
const phone = await phoneCtx.newPage();
const errors = { laptop: [], phone: [] };
for (const [name, page] of [['laptop', laptop], ['phone', phone]]) {
  page.on('pageerror', (e) => errors[name].push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors[name].push(m.text()); });
}

async function setCallsign(page, name) {
  await page.evaluate((n) => {
    const input = document.querySelector('#sw-callsign');
    if (!input) return;
    input.value = n;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, name);
}

try {
  // ---- Laptop opens a battle room ----
  await laptop.goto(BASE);
  await laptop.waitForSelector('#launch-skip', { timeout: 20000 });
  await setCallsign(laptop, 'LAPTOP');
  await laptop.click('#launch-skip');
  await laptop.waitForSelector('.sw-hub-launch', { state: 'visible' });
  await setCallsign(laptop, 'LAPTOP');
  await laptop.click('[data-mode=pvp]');
  await laptop.click('[data-course=io-storm]');
  await laptop.click('.sw-hub-launch');
  const code = await until(laptop, () => document.querySelector('#lobby-screen.active') && window.__starwake?.state.code);
  check('laptop opens a battle room', code, code || 'no room code');
  await laptop.screenshot({ path: `${OUT}/1-laptop-lobby.png` });
  // Regression guard: page text must stay light on the dark UI (a CSS variable clash once made titles near-black).
  const textLum = await laptop.evaluate(() => { const [r, g, b] = getComputedStyle(document.querySelector('#lobby-title') || document.body).color.match(/\d+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; });
  check('lobby text is light on the dark UI', textLum > 0.6, `luminance ${textLum.toFixed(2)}`);

  // ---- Phone follows the invite link ----
  await phone.goto(`${BASE}/?room=${code}&from=LAPTOP`);
  await phone.waitForSelector('#launch-skip', { timeout: 20000 });
  const eyebrow = await phone.textContent('.launch-eyebrow');
  check('invite names the challenger', /LAPTOP CHALLENGES YOU/.test(eyebrow || ''), (eyebrow || '').trim());
  await phone.screenshot({ path: `${OUT}/2-phone-invite.png` });
  await setCallsign(phone, 'PHONE');
  await phone.tap('#launch-skip');
  const joined = await until(phone, (c) => document.querySelector('#lobby-screen.active') && window.__starwake?.state.code === c, code);
  check('phone joins through the invite link', joined);
  const crew = await until(laptop, () => { const rows = [...document.querySelectorAll('#crew-list .crew-row:not(.bot)')]; return rows.length >= 2 && rows.map((r) => r.textContent).join(' | '); });
  check('laptop lobby shows both humans', crew, crew || '');
  // Lobby quick chat: the phone says hi before the race; the laptop sees it.
  await until(phone, () => !document.querySelector('#lobby-emotes').hidden);
  await phone.tap('#lobby-emotes [data-emote="4"]');
  const lobbyEmote = await until(laptop, () => /CATCH ME!/.test(document.querySelector('#toast')?.innerText || document.body.innerText) && 'seen', null, { timeout: 8000 });
  check('lobby emote from the phone reaches the laptop', lobbyEmote);

  // ---- Race (sim pilots removed so auto-aim can only lock onto the other human) ----
  for (let i = 0; i < 8 && (await laptop.textContent('#bot-count')) !== '0'; i++) { await laptop.click('#bots-minus'); await wait(400); }
  check('sim pilots removed for a pure PvP heat', (await laptop.textContent('#bot-count')) === '0');
  await laptop.click('#start-button');
  for (const page of [laptop, phone]) await page.keyboard.press('Enter').catch(() => {});
  const startedL = await until(laptop, () => window.__starwake.state.race?.started, null, { timeout: 25000 });
  const startedP = await until(phone, () => window.__starwake.state.race?.started, null, { timeout: 25000 });
  check('both clients start the heat', startedL && startedP);
  await wait(2500);
  const seesP = await until(laptop, () => Object.values(window.__starwake.state.rivals || {}).find((r) => r.name === 'PHONE'));
  const seesL = await until(phone, () => Object.values(window.__starwake.state.rivals || {}).find((r) => r.name === 'LAPTOP'));
  check('each client sees the other live', seesP && seesL);
  await laptop.screenshot({ path: `${OUT}/3-laptop-race.png` });
  await phone.screenshot({ path: `${OUT}/4-phone-race.png` });

  // ---- Laptop snipes the phone (keyboard F) ----
  const shot = await laptop.evaluate(async () => {
    const S = window.__starwake, r = S.state.race, g = Object.values(S.state.rivals).find((x) => x.name === 'PHONE');
    r.distance = (g.shown ?? g.d) - 12; r.x = g.x; r.y = g.y; r.item = 'blaster'; r.ammo = 3; r.rolling = 0;
    await new Promise((res) => setTimeout(res, 120));
    const lock = S.combat.currentLock(r, Object.values(S.state.rivals));
    return { lock: lock?.name, zp: r.zapPoints };
  });
  await laptop.keyboard.down('f'); await wait(120); await laptop.keyboard.up('f');
  // Checked on game state, not toast text (a hazard hit can replace the toast a moment later).
  const landed = await until(laptop, () => window.__starwake.combat.outgoingZaps().some((z) => z.count >= 1) && window.__starwake.state.race.ammo === 2);
  check('laptop locks on and snipes PHONE with F', shot.lock === 'PHONE' && landed, `lock=${shot.lock}`);
  const phoneHit = await until(phone, () => window.__starwake.state.race.stunUntil > 0 && { zapPoints: window.__starwake.state.race.zapPoints }, null, { timeout: 8000 });
  check('phone receives the zap through the server', phoneHit, phoneHit ? `spun out, ${phoneHit.zapPoints} pts` : 'no zap');
  // The shooter is credited exactly what the victim's screen says it lost (no points from nothing).
  const credited = phoneHit && await until(laptop, (lost) => (window.__starwake.state.race.zapPoints === lost ? 'ok' : null), -phoneHit.zapPoints, { timeout: 8000 });
  check('laptop is credited exactly what the phone lost', credited === 'ok', `phone lost ${phoneHit ? -phoneHit.zapPoints : '?'}, laptop credited ${await laptop.evaluate(() => window.__starwake.state.race.zapPoints)}`);
  await phone.screenshot({ path: `${OUT}/5-phone-zapped.png` });

  // ---- Phone snipes back with the touch FIRE button ----
  await phone.evaluate(async () => {
    const S = window.__starwake, r = S.state.race, g = Object.values(S.state.rivals).find((x) => x.name === 'LAPTOP');
    r.stunUntil = -9; r.distance = (g.shown ?? g.d) - 12; r.x = g.x; r.y = g.y; r.item = 'blaster'; r.ammo = 3; r.rolling = 0;
    await new Promise((res) => setTimeout(res, 150));
  });
  const fireVisible = await phone.isVisible('#fire-button');
  check('phone shows the touch FIRE button', fireVisible);
  const box = await phone.locator('#fire-button').boundingBox();
  // A single quick tap must fire (the button fires on touch-down, not on the next race tick).
  if (box) await phone.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  const phoneShot = await until(phone, () => window.__starwake.combat.outgoingZaps().some((z) => z.count >= 1) && window.__starwake.state.race.ammo === 2);
  check('phone snipes LAPTOP with one tap on FIRE', phoneShot);
  const laptopHit = await until(laptop, () => window.__starwake.state.race.stunUntil > 0 && { zapPoints: window.__starwake.state.race.zapPoints }, null, { timeout: 8000 });
  check('laptop receives the zap back', laptopHit, laptopHit ? `spun out, ${laptopHit.zapPoints} pts` : 'no zap');
  await laptop.screenshot({ path: `${OUT}/6-laptop-zapped.png` });

  // ---- The phone reloads mid-heat (well into the lap): same distance, same zap balance, zaps still work ----
  // Damaged and holding an item: a reload must not repair the hull or drop the item.
  await phone.evaluate(() => { const r = window.__starwake.state.race; r.distance = Math.max(r.distance, 260); r.hull = 1; r.item = 'seeker'; r.ammo = 1; r.rolling = 0; });
  await wait(1200); // let telemetry carry the new distance
  const before = await phone.evaluate(() => ({ d: Math.round(window.__starwake.state.race.distance), zap: window.__starwake.state.race.zapPoints }));
  await phone.reload();
  // The very first frames after the resume must already be at the old distance (no restart at 0).
  const firstSeen = await until(phone, () => window.__starwake?.state.race?.started && document.querySelector('#race-screen.active') && Math.round(window.__starwake.state.race.distance), null, { timeout: 20000 });
  // Telemetry is up to ~450 ms old (about 8 m at race speed); the bug this guards against was a restart at 0.
  check('phone reloads mid-heat and resumes at its distance', firstSeen >= before.d - 20, `distance before ${before.d}, first frame after resume ${firstSeen}`);
  const kept = await phone.evaluate(() => ({ hull: window.__starwake.state.race.hull, item: window.__starwake.state.race.item }));
  check('reload keeps hull damage and the held item', kept.hull === 1 && kept.item === 'seeker', JSON.stringify(kept));
  await wait(2500); // a few sync rounds: any replayed hits or double credits would land now
  const after = await phone.evaluate(() => window.__starwake.state.race.zapPoints);
  check('reload replays no hits and no phantom credits', after === 0, `zap balance before ${before.zap}, after resume ${after} (restored into the score, ledger continues)`);
  await phone.evaluate(async () => {
    const S = window.__starwake, r = S.state.race, g = Object.values(S.state.rivals).find((x) => x.name === 'LAPTOP');
    r.stunUntil = -9; r.distance = (g.shown ?? g.d) - 12; r.x = g.x; r.y = g.y; r.item = 'blaster'; r.ammo = 3; r.rolling = 0;
    await new Promise((res) => setTimeout(res, 150));
  });
  const laptopStunBefore = await laptop.evaluate(() => window.__starwake.state.race.stunUntil);
  const fb = await phone.locator('#fire-button').boundingBox();
  if (fb) await phone.touchscreen.tap(fb.x + fb.width / 2, fb.y + fb.height / 2);
  const postReloadHit = await until(laptop, (s0) => window.__starwake.state.race.stunUntil > s0, laptopStunBefore, { timeout: 10000 });
  check("the reloaded phone's zaps still land", postReloadHit);

  // ---- Quick chat: an emote from the phone pops up on the laptop ----
  await phone.tap('#emote-bar [data-emote="0"]');
  const emote = await until(laptop, () => /GG!/.test(document.querySelector('#taunt')?.innerText || '') && document.querySelector('#taunt').innerText.replace(/\n/g, ' '), null, { timeout: 8000 });
  check('emote from the phone shows on the laptop', emote, emote || 'no bubble');

  // ---- Security: a player's public id must not let another device act for them ----
  const spoof = await phone.evaluate(async (code) => {
    const laptopId = Object.values(window.__starwake.state.rivals).find((x) => x.name === 'LAPTOP')?.id;
    const room = await fetch(`/.netlify/functions/game?code=${code}`).then((r) => r.json());
    const leaked = (room.room?.players || []).some((p) => 'token' in p);
    const res = await fetch('/.netlify/functions/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'leave', code, playerId: laptopId }) });
    return { status: res.status, leaked };
  }, code);
  const stillIn = await laptop.evaluate(() => fetch(`/.netlify/functions/game?code=${window.__starwake.state.code}`).then((r) => r.json()).then((d) => d.room.players.some((p) => p.id === window.__starwake.state.playerId)));
  check('room data never exposes pilot tokens', !spoof.leaked);
  check("phone can't kick the laptop with its public id", spoof.status >= 400 && stillIn, `status ${spoof.status}, laptop still in room: ${stillIn}`);

  // ---- Finish the heat early on both and compare standings ----
  for (const page of [laptop, phone]) await page.evaluate(() => { const S = window.__starwake; S.state.race.endsAt = Date.now() + (S.state.serverOffset || 0) + 1500; });
  const resL = await until(laptop, () => document.querySelector('#results-screen.active') && document.querySelector('#result-rows')?.innerText, null, { timeout: 30000 });
  const resP = await until(phone, () => document.querySelector('#results-screen.active') && document.querySelector('#result-rows')?.innerText, null, { timeout: 30000 });
  check('both reach the results screen', resL && resP);
  // Standings settle once both reports land; give polling a moment and compare.
  await wait(3000);
  // Each screen marks its own row "· YOU"; compare everything else.
  const rows = () => document.querySelector('#result-rows')?.innerText.replace(/ · YOU/g, '').replace(/\s+/g, ' ').trim();
  const rowsL = await laptop.evaluate(rows);
  const rowsP = await phone.evaluate(rows);
  check('both screens agree on the standings', rowsL && rowsL === rowsP, rowsL === rowsP ? rowsL : `laptop: ${rowsL}\n        phone: ${rowsP}`);
  await laptop.screenshot({ path: `${OUT}/7-laptop-results.png` });
  await phone.screenshot({ path: `${OUT}/8-phone-results.png` });
  check('REMATCH hidden mid-season', await laptop.evaluate(() => getComputedStyle(document.querySelector('#rematch-button')).display === 'none'));

  // ---- The phone reloads between heats: it keeps its seat and rejoins the season ----
  const phoneId = await phone.evaluate(() => window.__starwake.state.playerId);
  await phone.reload(); // a held seat skips the intro by itself
  const resumed = await until(phone, (id) => window.__starwake.state.code && window.__starwake.state.playerId === id, phoneId, { timeout: 15000 });
  const stillSeated = await laptop.evaluate((id) => fetch(`/.netlify/functions/game?code=${window.__starwake.state.code}`).then((r) => r.json()).then((d) => d.room.players.some((p) => p.id === id)), phoneId);
  check('phone keeps its seat after a reload', resumed && stillSeated);

  // ---- Finish the season (heats 2 and 3), then REMATCH with the same crew ----
  const finishHeat = async ({ hostLast = 0 } = {}) => {
    for (const page of [laptop, phone]) await until(page, () => window.__starwake.state.race?.started && !window.__starwake.state.race.done, null, { timeout: 25000 });
    const end = (page) => page.evaluate(() => { const S = window.__starwake; S.state.race.endsAt = Date.now() + (S.state.serverOffset || 0) + 1200; });
    if (hostLast) { await end(phone); await wait(hostLast); await end(laptop); } // the guest finishes first, the host keeps racing
    else for (const page of [laptop, phone]) await end(page);
    return until(laptop, () => document.querySelector('#results-screen.active') && ['results', 'complete'].includes(window.__starwake.state.room?.phase) && window.__starwake.state.room.phase, null, { timeout: 30000 });
  };
  for (const heat of [2, 3]) {
    await until(laptop, () => !document.querySelector('#continue-button').disabled, null, { timeout: 15000 });
    await laptop.click('#continue-button');
    // Heat 2: the host races on for longer than the 25 s host timeout after the guest finishes.
    const phase = await finishHeat({ hostLast: heat === 2 ? 28000 : 0 });
    if (heat === 2) {
      const hostKept = await laptop.evaluate(async () => { const S = window.__starwake; const d = await fetch(`/.netlify/functions/game?code=${S.state.code}`).then((r) => r.json()); return d.room.hostId === S.state.playerId && S.state.host; });
      check('host keeps the room while racing after the guest finishes', hostKept);
    }
    if (heat === 3) check('season completes after heat 3', phase === 'complete', String(phase));
  }
  const rematchShown = await until(laptop, () => getComputedStyle(document.querySelector('#rematch-button')).display !== 'none' && !document.querySelector('#rematch-button').disabled);
  check('host sees REMATCH when the season ends', rematchShown);
  await laptop.click('#rematch-button');
  const backL = await until(laptop, () => window.__starwake.state.race?.started && window.__starwake.state.heat === 1, null, { timeout: 25000 });
  const backP = await until(phone, () => window.__starwake.state.race?.started && window.__starwake.state.heat === 1 && document.querySelector('#race-screen.active'), null, { timeout: 25000 });
  check('rematch pulls both players into a fresh heat 1', backL && backP);
  await wait(2500);
  // Last season's zap/steal records must not leak into the rematch.
  const phantom = await laptop.evaluate(() => window.__starwake.state.race.zapPoints);
  check('no phantom steal credits after the rematch', phantom === 0, `laptop zapPoints ${phantom}`);
  await laptop.evaluate(async () => {
    const S = window.__starwake, r = S.state.race, g = Object.values(S.state.rivals).find((x) => x.name === 'PHONE');
    r.distance = (g.shown ?? g.d) - 12; r.x = g.x; r.y = g.y; r.item = 'blaster'; r.ammo = 3; r.rolling = 0;
    await new Promise((res) => setTimeout(res, 150));
  });
  await laptop.keyboard.down('f'); await wait(120); await laptop.keyboard.up('f');
  const rematchHit = await until(phone, () => window.__starwake.state.race.stunUntil > 0, null, { timeout: 8000 });
  check('zaps land in the rematch season', rematchHit);

  // ---- Barrel roll: the phone rolls, the laptop's shot bounces back and spins the laptop out ----
  await wait(1500);
  await phone.evaluate(() => { const r = window.__starwake.state.race; r.stunUntil = -9; r.rollUntil = r.time + 6; });
  await laptop.evaluate(async () => {
    const S = window.__starwake, r = S.state.race, g = Object.values(S.state.rivals).find((x) => x.name === 'PHONE');
    r.stunUntil = -9; r.distance = (g.shown ?? g.d) - 12; r.x = g.x; r.y = g.y; r.item = 'blaster'; r.ammo = 3; r.rolling = 0;
    await new Promise((res) => setTimeout(res, 150));
  });
  const laptopStun0 = await laptop.evaluate(() => window.__starwake.state.race.stunUntil);
  await laptop.keyboard.down('f'); await wait(120); await laptop.keyboard.up('f');
  const bounced = await until(laptop, (s0) => window.__starwake.state.race.stunUntil > s0 && window.__starwake.state.race.stunUntil > 0, laptopStun0, { timeout: 10000 });
  check('a zap on a rolling rival bounces back at the shooter', bounced);
} catch (error) {
  check('test ran to completion', false, error.message);
}

const gameErrors = (list) => list.filter((e) => !/favicon|Failed to load resource/.test(e));
check('no laptop console errors', !gameErrors(errors.laptop).length, gameErrors(errors.laptop).slice(0, 3).join(' | '));
check('no phone console errors', !gameErrors(errors.phone).length, gameErrors(errors.phone).slice(0, 3).join(' | '));
await browser.close();
const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed · screenshots in ${OUT}`);
process.exit(failed ? 1 : 0);
