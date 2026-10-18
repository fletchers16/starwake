/**
 * First-flight coach: a brand-new player's first solo race walks through pod → zap → telegraphed
 * shot → barrel roll, then the coach remembers it's done.
 *   npm run dev   (in another terminal)
 *   node tests/coach.e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';
// Opt in to the playtest hook, so the suite also runs against a deployed site.
const optIn = async (browser, options) => { const ctx = await browser.newContext(options); await ctx.addInitScript(() => localStorage.setItem('starwake-playtest', '1')); return ctx; };

const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:5180';
const checks = [];
const check = (name, ok, detail = '') => { checks.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await optIn(browser, { viewport: { width: 1280, height: 800 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, t = 15000) => { const e = Date.now() + t; while (Date.now() < e) { const v = await page.evaluate(fn).catch(() => null); if (v) return v; await wait(80); } return null; };
const coach = () => page.evaluate(() => (document.querySelector('#coach').hidden ? '(hidden)' : document.querySelector('#coach b').innerText));
try {
  const launch = async () => {
    await page.goto(BASE);
    await page.click('#launch-skip');
    await page.waitForSelector('.sw-hub-launch', { state: 'visible' });
    await page.click('[data-mode=pve]');
    await page.click('[data-course=neon-rift]');
    await page.click('.sw-hub-launch');
    await wait(1200);
    await page.keyboard.press('Enter');
    await until(() => window.__starwake.state.race?.started);
    await wait(300);
  };
  // Quitting mid-lesson must not carry the coach into the next race, and the lesson isn't spent.
  await launch();
  await page.evaluate(() => { document.querySelector('#race-menu-button').click(); document.querySelector('#race-menu-quit').click(); });
  await wait(500);
  const leak = await page.evaluate(() => ({ coaching: document.body.classList.contains('coaching'), hidden: document.querySelector('#coach').hidden, done: localStorage.getItem('starwake-coached') }));
  check('quitting mid-lesson clears the coach without marking it done', !leak.coaching && leak.hidden && leak.done !== '1', JSON.stringify(leak));
  await launch();
  check('coach opens with the crate lesson', /crate/i.test(await coach()), await coach());
  await page.evaluate(() => { const r = window.__starwake.state.race; r.item = 'blaster'; r.ammo = 3; }); // as if a pod was flown through
  // The crate card stays up ~2.5 s so it can be read, then the zap lesson starts.
  await page.waitForFunction(() => /zap/i.test(document.querySelector('#coach b')?.innerText || ''), null, { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => { window.__coachLog = []; let last = ''; setInterval(() => { const t = document.querySelector('#coach b')?.innerText || '', r = window.__starwake.state.race; const lk = !document.querySelector('#lock-warn').hidden; const k = t + (lk ? ' [LOCK]' : '') + (r && r.time < r.stunUntil ? ' [STUN]' : ''); if (k !== last) { last = k; window.__coachLog.push(`${r?.time.toFixed(1)} ${k}`); } }, 50); });
  check('picking up an item moves to the zap lesson', /zap/i.test(await coach()), await coach());
  for (let k = 0; k < 3 && !/Incoming/.test(await coach()); k++) { await until(() => /Incoming/.test(document.querySelector('#coach b')?.innerText || '') || window.__starwake.combat.currentLock(window.__starwake.state.race, []), 3000); if (/Incoming/.test(await coach())) break; await page.keyboard.press('f'); await wait(700); }
  { const ok = /Incoming|Too slow/.test(await coach()); check('a landed zap moves to the roll lesson', ok, ok ? '' : `${await coach()}\n        ${(await page.evaluate(() => window.__coachLog)).join('\n        ')}`); }
  const lock = await until(() => !document.querySelector('#lock-warn').hidden && document.querySelector('#lock-warn').innerText, 9000);
  check('a sim pilot telegraphs its shot', lock, lock || 'no warning');
  await page.keyboard.press('q');
  // A late roll gets the coach's "Too slow! Once more": like a player, wait for the next lock and roll again.
  let outcome = null;
  for (let attempt = 0; attempt < 3 && !outcome; attempt++) {
    // After a retry the "Too slow" card is still showing, so only a real outcome (reflect or hand-off) ends the wait.
    outcome = await page.waitForFunction((first) => { const t = document.querySelector('#coach b')?.innerText || '', r = window.__starwake.state.race; return ((r.reflects || 0) > 0 || /win the heat|got the idea/.test(t) || (first && /Too slow/.test(t))) && { title: t, reflects: r.reflects || 0 }; }, attempt === 0, { timeout: 12000 }).then((h) => h.jsonValue()).catch(() => null);
    if (outcome && /Too slow/.test(outcome.title)) {
      outcome = null;
      await until(() => !document.querySelector('#lock-warn').hidden, 10000);
      await page.keyboard.press('q');
    }
  }
  const dump = outcome ? '' : await page.evaluate(() => { const S = window.__starwake, r = S.state.race, b = S.combat.debugRacers().map((x) => ({ n: x.name, gap: +(x.d - r.distance).toFixed(1), dx: +(x.x - r.x).toFixed(1), ammo: x.ammo, item: x.item, aim: x.aimAt, coach: !!x.coachTarget, cool: +(x.cooldown || 0).toFixed(1), stun: x.stunUntil > r.time })); return JSON.stringify({ me: { item: r.item, ammo: r.ammo, zaps: r.zapsLanded || 0, hull: r.hull, breaches: r.breaches || 0, d: Math.round(r.distance) }, t: +r.time.toFixed(1), coach: document.querySelector('#coach b')?.innerText, lock: document.querySelector('#lock-warn').hidden ? '' : document.querySelector('#lock-warn').innerText, reflects: r.reflects || 0, stun: r.stunUntil > r.time, bots: b }); });
  check('rolling on the warning reflects the shot', outcome?.reflects > 0 && /win the heat/.test(outcome.title), outcome ? JSON.stringify(outcome) : dump);
  await wait(3000);
  check('coach closes and remembers it ran', (await coach()) === '(hidden)' && (await page.evaluate(() => localStorage.getItem('starwake-coached'))) === '1');
} catch (error) { check('test ran to completion', false, error.message); }
check('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
await browser.close();
const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
