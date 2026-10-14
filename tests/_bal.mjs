import { chromium } from 'playwright-core';
const mode = process.argv[2] || 'casual';
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1000, height: 640 } });
await c.addInitScript(() => { localStorage.setItem('starwake-playtest', '1'); localStorage.setItem('starwake-coached', '1'); });
const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://127.0.0.1:5180'); await p.waitForTimeout(600); await p.click('#launch-solo');
await p.waitForTimeout(1500); await p.keyboard.press('Enter').catch(()=>{});
await p.waitForFunction(() => window.__starwake.state.race?.time > 1, null, { timeout: 30000 });
if (mode === 'skilled') {
  // In-page autopilot: steer at the next gate/ring/crate/star, dodge rocks, fire when loaded, roll on LOCKED ON.
  await p.evaluate(() => { const S = window.__starwake, K = {}; const press = (k, on) => { if (!!K[k] === on) return; K[k] = on; dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: k })); };
    setInterval(() => { const r = S.state.race; if (!r || r.done) return; const lap = r.lapDistance || 1, d = r.distance % lap;
      const ahead = (r.obstacles || []).filter(o => !o.resolved && ((o.distance - d + lap) % lap) > 3 && ((o.distance - d + lap) % lap) < 45);
      ahead.sort((a, b) => ((a.distance - d + lap) % lap) - ((b.distance - d + lap) % lap));
      const good = ahead.find(o => ['gate', 'ring', 'pod', 'star', 'boost'].includes(o.type)); const bad = ahead.find(o => ['rock', 'mine', 'pillar', 'fence', 'mover', 'debris'].includes(o.type) && ((o.distance - d + lap) % lap) < 14 && Math.abs(o.x - r.x) < 2 && Math.abs(o.y - r.y) < 2);
      let tx = good ? good.x : 0, ty = good ? good.y : 0; if (bad) { tx = r.x + (bad.x > r.x ? -3 : 3); }
      press('ArrowLeft', tx < r.x - .35); press('ArrowRight', tx > r.x + .35); press('ArrowUp', ty > r.y + .3); press('ArrowDown', ty < r.y - .3); press(' ', r.fuel > r.maxFuel * .4);
      if (r.item && Math.random() < .3) { dispatchEvent(new KeyboardEvent('keydown', { key: 'f' })); dispatchEvent(new KeyboardEvent('keyup', { key: 'f' })); }
      if (!document.getElementById('lock-warn').hidden) { dispatchEvent(new KeyboardEvent('keydown', { key: 'q' })); dispatchEvent(new KeyboardEvent('keyup', { key: 'q' })); }
    }, 60); });
}
let t = 0;
while (!(await p.evaluate(() => !!document.querySelector('#results-screen.active')))) {
  if (mode === 'casual') { const k = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'][t % 4]; await p.keyboard.down(k); if (t % 2) await p.keyboard.down('Space'); await p.keyboard.press('f'); await p.waitForTimeout(400); await p.keyboard.up(k); await p.keyboard.up('Space'); }
  else if (mode === 'idle') { await p.keyboard.down('Space'); await p.keyboard.press('f'); await p.waitForTimeout(500); await p.keyboard.up('Space'); }
  else await p.waitForTimeout(500);
  t++; if (t > 400) break;
}
await p.waitForTimeout(3000);
console.log(mode.padEnd(8), await p.evaluate(() => document.querySelector('#result-rows')?.innerText.replace(/\s+/g, ' ').replace('PILOT HEAT TOTAL LAP ', '')));
await b.close();
