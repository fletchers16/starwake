/**
 * Wish Comet between two human players: both wish on the results screen, the host continues, both screens get the
 * same decree and reveal, and each targeted pilot really carries its effect into the next heat.
 * Without an OpenAI key the server's offline rules judge the wishes, which is what this exercises.
 *   node tests/wish.e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://127.0.0.1:5180';
const b = await chromium.launch();
const errors = [];
const mk = async (name) => { const c = await b.newContext({ viewport: { width: 1000, height: 700 } }); await c.addInitScript((n) => { localStorage.setItem('starwake-playtest', '1'); localStorage.setItem('starwake-coached', '1'); localStorage.setItem('starwake-name', n); }, name); const p = await c.newPage(); p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`)); return p; };
const checks = [];
const check = (name, ok, detail = '') => { checks.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? `\n        ${detail}` : ''}`); };

const A = await mk('ANNA'); await A.goto(BASE); await A.waitForTimeout(600); await A.click('#launch-button');
const code = await A.waitForFunction(() => document.querySelector('#lobby-screen.active') && window.__starwake.state.code, null, { timeout: 15000 }).then((h) => h.jsonValue());
const B = await mk('BEN'); await B.goto(`${BASE}/?room=${code}&from=ANNA`); await B.waitForTimeout(600); await B.click('#launch-skip');
await B.waitForFunction((c) => window.__starwake.state.code === c, code, { timeout: 15000 });
await A.waitForFunction(() => document.querySelectorAll('#crew-list .crew-row:not(.bot)').length >= 2, null, { timeout: 15000 });
await A.click('#start-button');
for (const p of [A, B]) { await p.waitForTimeout(400); await p.keyboard.press('Enter').catch(() => {}); }
for (const p of [A, B]) await p.waitForFunction(() => window.__starwake.state.race?.time > 6, null, { timeout: 30000 });
for (const p of [A, B]) await p.evaluate(() => { const S = window.__starwake; S.state.race.endsAt = Date.now() + (S.state.serverOffset || 0) + 800; });
const boxes = await Promise.all([A, B].map((p) => p.waitForFunction(() => document.querySelector('#results-screen.active') && !document.querySelector('#wish-box').hidden, null, { timeout: 30000 }).then(() => true).catch(() => false)));
check('both results screens offer a wish for heat 2', boxes.every(Boolean));

// Ben wishes something nasty on Anna by name; Anna wishes herself a buff.
await B.fill('#wish-input', 'Slow-mo goo on ANNA'); await B.click('#wish-form button');
await A.fill('#wish-input', 'Give me lucky crates'); await A.click('#wish-form button');
const listed = await A.waitForFunction(() => /BEN/.test(document.querySelector('#wish-list').innerText) && /ANNA/.test(document.querySelector('#wish-list').innerText), null, { timeout: 10000 }).then(() => true).catch(() => false);
check("each player sees the other's wish", listed, await A.evaluate(() => document.querySelector('#wish-list').innerText));

await A.waitForFunction(() => !document.querySelector('#continue-button').disabled, null, { timeout: 20000 });
await A.click('#continue-button');
const revealed = await Promise.all([A, B].map((p) => p.waitForFunction(() => !document.querySelector('#wish-reveal').hidden, null, { timeout: 20000 }).then(() => true).catch(() => false)));
check('the Comet reveal plays on both screens', revealed.every(Boolean));
const decrees = await Promise.all([A, B].map((p) => p.evaluate(() => JSON.stringify(window.__starwake.state.room.decree))));
check('both screens hold the same decree', decrees[0] && decrees[0] === decrees[1]);
const decree = JSON.parse(decrees[0] || '{}');
check('every wish got a ruling (two humans + aliens)', (decree.rulings || []).length >= 2 && decree.rulings.every((r) => ['granted', 'twisted', 'denied'].includes(r.verdict) && r.line), decrees[0]);

for (const p of [A, B]) await p.waitForFunction(() => window.__starwake.state.race?.time > 1.2, null, { timeout: 30000 });
// Each pilot's expected effects from the decree, compared with its race state.
const verify = async (p) => p.evaluate(() => {
  const S = window.__starwake, r = S.state.race, me = S.state.playerId, d = S.state.room.decree;
  const mine = d.rulings.flatMap((ru) => ru.effects).filter((e) => e.target === me);
  const bad = mine.filter((e) => (e.kind === 'goo' && !(r.slowUntil > 0)) || (e.kind === 'lucky_crates' && !r.luckyCrates) || (e.kind === 'double_gates' && r.gateMult !== 2) || (e.kind === 'mirror' && !(r.mirrorUntil > 0)) || (e.kind === 'ink' && !(r.inkUntil > 0)));
  return { kinds: mine.map((e) => e.kind), missing: bad.map((e) => e.kind), chips: document.querySelector('#decree-chips').innerText };
});
const [va, vb] = [await verify(A), await verify(B)];
check('effects aimed at each pilot are applied to that pilot', !va.missing.length && !vb.missing.length, JSON.stringify({ A: va, B: vb }));
check('targeted pilots see their effect chips', (!va.kinds.length || va.chips.trim()) && (!vb.kinds.length || vb.chips.trim()), JSON.stringify({ A: va, B: vb }));
check('no page errors', !errors.length, errors.slice(0, 3).join(' | '));

const failed = checks.filter((c) => !c).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
await b.close();
process.exit(failed ? 1 : 0);
