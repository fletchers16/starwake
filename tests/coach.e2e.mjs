/**
 * First-flight coach: a brand-new player's first solo race walks through pod → zap → telegraphed
 * shot → barrel roll, then the coach remembers it's done.
 *   npm run dev   (in another terminal)
 *   node tests/coach.e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:5180';
const checks = [];
const check = (name, ok, detail = '') => { checks.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
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
  check('coach opens with the pod lesson', /pod/i.test(await coach()), await coach());
  await page.evaluate(() => { const r = window.__starwake.state.race; r.item = 'blaster'; r.ammo = 3; }); // as if a pod was flown through
  await wait(300);
  check('picking up an item moves to the zap lesson', /zap/i.test(await coach()), await coach());
  for (let k = 0; k < 3 && !/Incoming/.test(await coach()); k++) { await until(() => window.__starwake.combat.currentLock(window.__starwake.state.race, []), 3000); await page.keyboard.press('f'); await wait(700); }
  check('a landed zap moves to the roll lesson', /Incoming/.test(await coach()), await coach());
  const lock = await until(() => !document.querySelector('#lock-warn').hidden && document.querySelector('#lock-warn').innerText, 6000);
  check('a sim pilot telegraphs its shot', lock, lock || 'no warning');
  await page.keyboard.press('q');
  const outcome = await until(() => /win the heat|got the idea/.test(document.querySelector('#coach b')?.innerText || '') && { title: document.querySelector('#coach b').innerText, reflects: window.__starwake.state.race.reflects || 0 }, 6000);
  check('rolling on the warning reflects the shot', outcome?.reflects > 0 && /win the heat/.test(outcome.title), JSON.stringify(outcome));
  await wait(3000);
  check('coach closes and remembers it ran', (await coach()) === '(hidden)' && (await page.evaluate(() => localStorage.getItem('starwake-coached'))) === '1');
} catch (error) { check('test ran to completion', false, error.message); }
check('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
await browser.close();
const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
