/**
 * A crowded room: four human pilots plus two aliens in one live heat. Everyone steers, fires and rolls;
 * checks every screen sees every human, zaps land between humans, and all four agree on the standings.
 *   node tests/crowd.e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://127.0.0.1:5180';
const HUMANS = 4;
const b = await chromium.launch();
const errors = [];
const mk = async (i) => { const c = await b.newContext({ viewport: { width: 900, height: 600 } }); await c.addInitScript((n) => { localStorage.setItem('starwake-playtest', '1'); localStorage.setItem('starwake-coached', '1'); localStorage.setItem('starwake-name', n); }, `PILOT${i + 1}`); const p = await c.newPage(); p.on('pageerror', (e) => errors.push(`p${i + 1}: ${e.message}`)); return p; };
const checks = [];
const check = (name, ok, detail = '') => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `\n        ${detail}` : ''}`); };

const host = await mk(0); await host.goto(BASE); await host.waitForTimeout(600); await host.click('#launch-button');
const code = await host.waitForFunction(() => document.querySelector('#lobby-screen.active') && window.__starwake.state.code, null, { timeout: 15000 }).then((h) => h.jsonValue());
const pages = [host];
for (let i = 1; i < HUMANS; i++) { const p = await mk(i); await p.goto(`${BASE}/?room=${code}&from=PILOT1`); await p.waitForTimeout(600); await p.click('#launch-skip'); await p.waitForFunction((c) => window.__starwake.state.code === c, code, { timeout: 15000 }); pages.push(p); }
const crew = await host.waitForFunction((n) => document.querySelectorAll('#crew-list .crew-row:not(.bot)').length >= n, HUMANS, { timeout: 20000 }).then(() => true).catch(() => false);
check(`host lobby lists all ${HUMANS} humans`, crew);
// Two aliens fill the other seats.
for (let i = 0; i < 6 && (await host.textContent('#bot-count')) !== '2'; i++) { const n = Number(await host.textContent('#bot-count')); await host.click(n > 2 ? '#bots-minus' : '#bots-plus'); await host.waitForTimeout(300); }

await host.click('#start-button');
for (const p of pages) { await p.waitForTimeout(300); await p.keyboard.press('Enter').catch(() => {}); }
const started = await Promise.all(pages.map((p) => p.waitForFunction(() => window.__starwake.state.race?.time > 3, null, { timeout: 30000 }).then(() => true).catch(() => false)));
check('all four screens start the heat', started.every(Boolean));
const sees = await Promise.all(pages.map((p) => p.waitForFunction((n) => Object.keys(window.__starwake.state.rivals || {}).length >= n, HUMANS - 1, { timeout: 15000 }).then(() => true).catch(() => false)));
check('every screen sees the other three humans', sees.every(Boolean));

// Fly for ~20 s: weave, boost, keep blasters loaded and fire, roll now and then.
const t0 = Date.now(); let tick = 0;
while (Date.now() - t0 < 20000) {
  await Promise.all(pages.map(async (p, i) => {
    const k = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][(tick + i) % 4];
    await p.keyboard.down(k); await p.keyboard.down('Space');
    if (tick % 3 === i % 3) await p.evaluate(() => { const r = window.__starwake.state.race; if (!r.item) { r.item = 'blaster'; r.ammo = 3; } });
    await p.keyboard.press('f');
    if (tick % 7 === i) await p.keyboard.press('q');
    await p.waitForTimeout(350); await p.keyboard.up(k); await p.keyboard.up('Space');
  }));
  tick++;
}
const landed = await Promise.all(pages.map((p) => p.evaluate(() => window.__starwake.state.race.zapsLanded || 0)));
const total = landed.reduce((a, c) => a + c, 0);
check('zaps land in a crowded heat', total > 0, `per pilot: ${landed.join(', ')}`);

for (const p of pages) await p.evaluate(() => { const S = window.__starwake; S.state.race.endsAt = Date.now() + (S.state.serverOffset || 0) + 1500; });
const reached = await Promise.all(pages.map((p) => p.waitForFunction(() => document.querySelector('#results-screen.active') && document.querySelector('#result-rows')?.innerText, null, { timeout: 30000 }).then(() => true).catch(() => false)));
check('all four reach the results screen', reached.every(Boolean));
await host.waitForTimeout(4000);
const rows = () => document.querySelector('#result-rows')?.innerText.replace(/ · YOU/g, '').replace(/\s+/g, ' ').trim();
const all = await Promise.all(pages.map((p) => p.evaluate(rows)));
check('all four screens agree on the standings', all.every((r) => r && r === all[0]), all.map((r, i) => `p${i + 1}: ${r}`).join('\n        '));
const names = (all[0] || '').match(/PILOT\d/g) || [];
check('standings list every human pilot', new Set(names).size === HUMANS, all[0]);
check('no page errors', errors.length === 0, errors.slice(0, 5).join('\n        '));
console.log(`        zaps landed ${total} (per pilot ${landed.join('/')})`);

const failed = checks.filter(([, ok]) => !ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
await b.close();
process.exit(failed ? 1 : 0);
