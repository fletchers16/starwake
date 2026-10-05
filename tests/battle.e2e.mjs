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
