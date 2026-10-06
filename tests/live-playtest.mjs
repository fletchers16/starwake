/**
 * Live playtest: a laptop and a phone play a full three-heat season against a real deployment,
 * the way two people would. Both actually fly (steer for crates, rings and boost gates, pick a fork
 * lane), fire when they hold an item, and barrel-roll when LOCKED ON shows. The phone runs on a
 * throttled 4G link with a phone-speed CPU.
 *
 * Measures what a player feels: how far behind each screen shows the other (sync lag), any
 * teleports, frame rate on both, errors, and whether both screens agree on the final standings.
 * Saves screenshots from both devices through the season.
 *
 *   node tests/live-playtest.mjs [baseUrl]      (default https://starwakeracing.netlify.app)
 *   Env: OUT=<dir>  COURSE=<id>  BOTS=<n>  HEADED=1
 */
import { chromium, devices } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = (process.argv[2] || process.env.BASE_URL || 'https://starwakeracing.netlify.app').replace(/\/$/, '');
const OUT = process.env.OUT || new URL('./artifacts/live/', import.meta.url).pathname;
const COURSE = process.env.COURSE || 'neon-rift';
const BOTS = Number(process.env.BOTS ?? 2);
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { base: BASE, course: COURSE, heats: [], errors: { laptop: [], phone: [] }, notes: [] };
const note = (s) => { report.notes.push(s); console.log(s); };

const browser = await chromium.launch({ headless: !process.env.HEADED });
const optIn = async (options) => { const ctx = await browser.newContext(options); await ctx.addInitScript(() => localStorage.setItem('starwake-playtest', '1')); return ctx; };
const laptop = await (await optIn({ viewport: { width: 1280, height: 800 } })).newPage();
const phone = await (await optIn({ ...devices['iPhone 13'] })).newPage();
for (const [name, page] of [['laptop', laptop], ['phone', phone]]) {
  page.on('pageerror', (e) => report.errors[name].push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') report.errors[name].push(m.text()); });
  // Log every rejected game-server call with the action that was sent and the server's reason.
  page.on('response', async (res) => {
    if (!res.url().includes('/.netlify/functions/game') || res.status() < 400) return;
    let action = '?'; try { action = JSON.parse(res.request().postData() || '{}').action; } catch {}
    const body = await res.text().catch(() => '');
    note(`  [${name}] ${res.status()} on "${action}" at heat-time ${await page.evaluate(() => window.__starwake?.state.race?.time?.toFixed(1)).catch(() => '?')}: ${body.slice(0, 140)}`);
  });
}
// The phone: ~4G latency and bandwidth, and a CPU about 4x slower than this machine.
const cdp = await phone.context().newCDPSession(phone);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 110, downloadThroughput: (6 * 1024 * 1024) / 8, uploadThroughput: (2 * 1024 * 1024) / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

async function until(page, fn, arg, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const v = await page.evaluate(fn, arg).catch(() => null); if (v) return v; await wait(250); }
  return null;
}
const setCallsign = (page, name) => page.evaluate((n) => { const i = document.querySelector('#sw-callsign'); if (!i) return; i.value = n; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, name);

/** In-page pilot: steers like a decent player (crates, rings, boost gates, a lane at forks, away from rocks and mines). */
const pilot = () => {
  if (window.__pilot) return;
  window.__pilot = setInterval(() => {
    const r = window.__starwake?.state.race;
    if (!r || !r.started || r.done) return;
    const near = r.obstacles.filter((o) => !o.resolved && !o.taken && o.distance > r.distance + 3 && o.distance < r.distance + 55).sort((a, b) => a.distance - b.distance);
    const fork = near.find((o) => o.type === 'pillar');
    const goal = near.find((o) => ['pod', 'ring', 'boost', 'star'].includes(o.type) && (!fork || Math.sign(o.x) === Math.sign(r.forkSide || (r.forkSide = Math.random() < 0.5 ? -1 : 1))));
    let tx = goal ? goal.x : fork ? (r.forkSide || 1) * 3.6 : r.x, ty = goal ? goal.y : r.y;
    const threat = near.find((o) => (o.type === 'hazard' || o.type === 'blocker') && o.distance < r.distance + 22 && Math.hypot(o.x - tx, o.y - ty) < 1.9);
    if (threat) { tx = threat.x + (tx >= threat.x ? 2.4 : -2.4); }
    if (!fork) r.forkSide = 0;
    r.touchSteer = Math.max(-1, Math.min(1, (tx - r.x) * 0.9));
    r.touchLift = Math.max(-1, Math.min(1, (ty - r.y) * 0.9));
  }, 90);
};

/** One sample from a page: its own position/score/fps and where it shows every rival. */
const sample = () => {
  const S = window.__starwake, r = S?.state.race;
  if (!r) return null;
  const f = (window.__fps ||= { n: 0, t: performance.now(), fps: 0, raf: (function loop() { window.__fps.n++; requestAnimationFrame(loop); }) });
  if (!f.started) { f.started = true; requestAnimationFrame(f.raf); }
  const now = performance.now();
  if (now - f.t > 1000) { f.fps = (f.n * 1000) / (now - f.t); f.n = 0; f.t = now; }
  return {
    heat: S.state.heat, t: r.time, d: r.distance, x: r.x, y: r.y, score: r.score, place: r.place, started: r.started, done: r.done,
    fps: Math.round(f.fps), hull: r.hull, item: r.item || '', lock: !document.querySelector('#lock-warn')?.hidden,
    rivals: Object.values(S.state.rivals || {}).map((g) => ({ name: g.name, shown: g.shown ?? g.d, d: g.d, x: g.x })),
  };
};

/** Fire and roll through the real input paths: keyboard on the laptop, on-screen buttons on the phone. */
async function act(page, s, touch) {
  if (!s || !s.started || s.done) return;
  if (s.lock && Math.random() < 0.7) {
    if (touch) await page.locator('#roll-chip').tap({ timeout: 800 }).catch(() => {});
    else await page.keyboard.press('q');
  } else if (s.item && Math.random() < 0.6) {
    if (touch) { const b = await page.locator('#fire-button').boundingBox().catch(() => null); if (b) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }
    else await page.keyboard.press('f');
  }
}

try {
  // ---- Lobby ----
  await laptop.goto(BASE);
  await laptop.waitForSelector('#launch-skip', { timeout: 30000 });
  await laptop.click('#launch-skip');
  await laptop.waitForSelector('.sw-hub-launch', { state: 'visible' });
  await setCallsign(laptop, 'LAPTOP');
  await laptop.click('[data-mode=pvp]');
  await laptop.click(`[data-course=${COURSE}]`);
  await laptop.click('.sw-hub-launch');
  const code = await until(laptop, () => document.querySelector('#lobby-screen.active') && window.__starwake?.state.code);
  if (!code) throw new Error('laptop could not open a room');
  note(`room ${code} on ${COURSE}`);
  const t0 = Date.now();
  await phone.goto(`${BASE}/?room=${code}&from=LAPTOP`);
  await phone.waitForSelector('#launch-skip', { timeout: 30000 });
  await setCallsign(phone, 'PHONE');
  await phone.tap('#launch-skip');
  const joined = await until(phone, (c) => document.querySelector('#lobby-screen.active') && window.__starwake?.state.code === c, code);
  note(`phone ${joined ? 'joined' : 'FAILED to join'} after ${((Date.now() - t0) / 1000).toFixed(1)} s (throttled 4G)`);
  if (!joined) throw new Error('phone could not join');
  await phone.screenshot({ path: `${OUT}/0-phone-lobby.png` });
  for (let i = 0; i < 8; i++) { const n = Number(await laptop.textContent('#bot-count')); if (n === BOTS) break; await laptop.click(n > BOTS ? '#bots-minus' : '#bots-plus'); await wait(350); }

  for (const heat of [1, 2, 3]) {
    if (heat === 1) await laptop.click('#start-button');
    else await laptop.click('#continue-button');
    for (const page of [laptop, phone]) await page.keyboard.press('Enter').catch(() => {});
    const startL = await until(laptop, (h) => window.__starwake.state.race?.started && window.__starwake.state.heat === h, heat, 40000);
    const startP = await until(phone, (h) => window.__starwake.state.race?.started && window.__starwake.state.heat === h, heat, 40000);
    if (!startL || !startP) { note(`heat ${heat}: did not start on ${!startL ? 'laptop' : 'phone'}`); break; }
    await laptop.evaluate(pilot); await phone.evaluate(pilot);
    const h = { heat, lagL: [], lagP: [], jumps: 0, fpsL: [], fpsP: [], shots: 0 };
    let lastShownByPhone = null, lastT = null;
    const shotsAt = new Set([8, 28, 48]);
    while (true) {
      const [a, b] = await Promise.all([laptop.evaluate(sample), phone.evaluate(sample)]);
      if (!a || !b || a.done || b.done) break;
      // Lag: how far behind each screen draws the other player, in metres and seconds at race speed.
      const pOnL = a.rivals.find((g) => g.name === 'PHONE'), lOnP = b.rivals.find((g) => g.name === 'LAPTOP');
      if (pOnL) h.lagL.push(b.d - pOnL.shown);
      if (lOnP) {
        h.lagP.push(a.d - lOnP.shown);
        if (lastShownByPhone !== null && lastT !== null) { const dt = b.t - lastT, step = lOnP.shown - lastShownByPhone; if (dt > 0 && Math.abs(step) > Math.max(25, dt * 60)) h.jumps++; }
        lastShownByPhone = lOnP.shown; lastT = b.t;
      }
      if (a.fps) h.fpsL.push(a.fps);
      if (b.fps) h.fpsP.push(b.fps);
      const sec = Math.floor(a.t);
      if (shotsAt.has(sec)) { shotsAt.delete(sec); await Promise.all([laptop.screenshot({ path: `${OUT}/h${heat}-${sec}s-laptop.jpg`, quality: 70, type: 'jpeg' }), phone.screenshot({ path: `${OUT}/h${heat}-${sec}s-phone.jpg`, quality: 70, type: 'jpeg' })]); }
      await Promise.all([act(laptop, a, false), act(phone, b, true)]);
      await wait(350);
    }
    const resL = await until(laptop, () => document.querySelector('#results-screen.active') && document.querySelector('#result-rows')?.innerText, null, 45000);
    const resP = await until(phone, () => document.querySelector('#results-screen.active') && document.querySelector('#result-rows')?.innerText, null, 45000);
    // Both screens should agree on the final standings once the server has everyone's score.
    await wait(4000);
    const standings = (page) => page.evaluate(() => [...document.querySelectorAll('#result-rows > *')].map((row) => row.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6));
    h.standingsL = await standings(laptop); h.standingsP = await standings(phone);
    h.recap = await laptop.evaluate(() => document.querySelector('#ai-recap')?.innerText?.trim() || '');
    await Promise.all([laptop.screenshot({ path: `${OUT}/h${heat}-results-laptop.png` }), phone.screenshot({ path: `${OUT}/h${heat}-results-phone.png` })]);
    const stat = (xs) => xs.length ? { avg: +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1), max: +Math.max(...xs).toFixed(1), min: +Math.min(...xs).toFixed(1) } : null;
    h.summary = { lagOnLaptop_m: stat(h.lagL), lagOnPhone_m: stat(h.lagP), jumps: h.jumps, fpsLaptop: stat(h.fpsL), fpsPhone: stat(h.fpsP), resultsBoth: !!(resL && resP) };
    delete h.lagL; delete h.lagP; delete h.fpsL; delete h.fpsP;
    report.heats.push(h);
    note(`heat ${heat}: ${JSON.stringify(h.summary)}`);
    note(`  laptop standings: ${h.standingsL.join(' | ')}`);
    note(`  phone  standings: ${h.standingsP.join(' | ')}`);
    if (h.recap) note(`  recap: ${h.recap.slice(0, 200)}`);
  }
} catch (error) {
  note(`STOPPED: ${error.message.split('\n')[0]}`);
}
note(`errors: laptop ${report.errors.laptop.length}, phone ${report.errors.phone.length}${report.errors.laptop.concat(report.errors.phone).slice(0, 3).map((e) => `\n  ${e.slice(0, 160)}`).join('')}`);
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
