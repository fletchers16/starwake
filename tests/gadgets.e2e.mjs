/**
 * Gadgets between two human players: magnet steals the rival's item, ink splats their screen,
 * swap trades places, and a dropped banana spins them out. Run against a dev server:
 *   node tests/gadgets.e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://127.0.0.1:5180';
const b = await chromium.launch();
const mk = async () => { const c = await b.newContext({ viewport: { width: 1100, height: 700 } }); await c.addInitScript(() => { localStorage.setItem('starwake-playtest', '1'); localStorage.setItem('starwake-coached', '1'); }); const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); return p; };
const A = await mk(); await A.goto(BASE); await A.waitForTimeout(600); await A.click('#launch-button');
const code = await A.waitForFunction(() => document.querySelector('#lobby-screen.active') && window.__starwake.state.code, null, { timeout: 15000 }).then(h => h.jsonValue());
const B = await mk(); await B.goto(`${BASE}/?room=${code}&from=A`); await B.waitForTimeout(600); await B.click('#launch-skip');
await B.waitForFunction((c) => window.__starwake.state.code === c, code, { timeout: 15000 });
for (let i = 0; i < 4 && (await A.textContent('#bot-count')) !== '0'; i++) { await A.click('#bots-minus'); await A.waitForTimeout(300); }
await A.click('#start-button'); for (const p of [A, B]) { await p.waitForTimeout(400); await p.keyboard.press('Enter').catch(() => {}); }
for (const p of [A, B]) await p.waitForFunction(() => window.__starwake.state.race?.time > 3, null, { timeout: 30000 });
await A.waitForFunction(() => Object.keys(window.__starwake.state.rivals || {}).length > 0, null, { timeout: 15000 });
// Magnet re-check vs a bot is covered elsewhere; here: A's gadgets on human B.
const fireA = async (k, setup) => { await A.evaluate(([k, setup]) => { const S = window.__starwake, r = S.state.race, g = Object.values(S.state.rivals)[0]; if (setup === 'ahead') r.distance = (g.shown ?? g.d) - 20; if (setup === 'behind') r.distance = (g.shown ?? g.d) + 15; r.x = g.x; r.y = g.y; r.item = k; r.ammo = 1; r.rolling = 0; r.stunUntil = -9; }, [k, setup]); await A.waitForTimeout(250); await A.keyboard.press('f'); };
await B.evaluate(() => { const r = window.__starwake.state.race; r.item = 'blaster'; r.ammo = 3; r.rolling = 0; });
await A.waitForTimeout(800);
await fireA('magnet', 'ahead');
const mag = await B.waitForFunction(() => window.__starwake.state.race.item === null, null, { timeout: 8000 }).then(() => true).catch(() => false);
const aGot = await A.evaluate(() => window.__starwake.state.race.item);
await fireA('ink', 'behind');
const ink = await B.waitForFunction(() => document.querySelector('#app').classList.contains('inked'), null, { timeout: 8000 }).then(() => true).catch(() => false);
const dB = await B.evaluate(() => window.__starwake.state.race.distance);
await fireA('swap', 'ahead');
const swap = await B.waitForFunction((d) => window.__starwake.state.race.distance < d - 5, dB, { timeout: 8000 }).then(() => true).catch(() => false);
// Banana: A drops it right in front of B's path.
await A.evaluate(() => { const S = window.__starwake, r = S.state.race, g = Object.values(S.state.rivals)[0]; r.distance = (g.shown ?? g.d) + 25; r.x = g.x; r.y = g.y; r.item = 'banana'; r.ammo = 1; r.rolling = 0; });
await A.waitForTimeout(200); await A.keyboard.press('f');
await B.evaluate(() => { const r = window.__starwake.state.race; r.stunUntil = -9; });
const seenDrop = await B.waitForFunction(() => window.__starwake.combat && document.querySelectorAll && true, null, { timeout: 2000 }).then(() => true);
const banana = await B.waitForFunction(() => { const r = window.__starwake.state.race; return r.stunUntil > r.time && /SPLAT/.test(document.querySelector('#race-toast').innerText); }, null, { timeout: 15000 }).then(() => true).catch(() => false);
// Goo: A activates it and bumps B (placed right on top of B).
await B.evaluate(() => { const r = window.__starwake.state.race; r.slowUntil = -9; r.stunUntil = -9; });
await A.evaluate(() => { const S = window.__starwake, r = S.state.race; r.item = 'goo'; r.ammo = 1; r.rolling = 0; r.stunUntil = -9; });
await A.keyboard.press('f');
await A.evaluate(async () => { const S = window.__starwake, r = S.state.race; for (let k = 0; k < 12; k++) { const g = Object.values(S.state.rivals)[0]; r.distance = (g.shown ?? g.d) - 2.4; r.x = g.x; r.y = g.y; await new Promise((res) => setTimeout(res, 60)); } });
const goo = await B.waitForFunction(() => { const r = window.__starwake.state.race; return r.slowUntil > r.time; }, null, { timeout: 8000 }).then(() => true).catch(() => false);
// Decoy: A drops a fake crate in B's path; B grabs it and loses points.
await B.evaluate(() => { const r = window.__starwake.state.race; r.stunUntil = -9; r.ringPoints = (r.ringPoints || 0) + 3000; });
await A.evaluate(() => { const S = window.__starwake, r = S.state.race, g = Object.values(S.state.rivals)[0]; r.distance = (g.shown ?? g.d) + 25; r.x = g.x; r.y = g.y; r.item = 'decoy'; r.ammo = 1; r.rolling = 0; });
await A.waitForTimeout(200); await A.keyboard.press('f');
const decoy = await B.waitForFunction(() => /DECOY/.test(document.querySelector('#race-toast').innerText), null, { timeout: 15000 }).then(() => true).catch(() => false);
const checks = [["slow-mo goo slows the rival you bump", goo], ["a decoy crate fools the rival", decoy], ["magnet takes the rival's item", mag && aGot === 'blaster'], ["ink splats the rival's screen", ink], ['swap ray trades places', swap], ['a dropped banana spins the rival out', banana]];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
const failed = checks.filter(([, ok]) => !ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
await b.close();
process.exit(failed ? 1 : 0);
