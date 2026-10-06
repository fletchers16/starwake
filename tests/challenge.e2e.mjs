/**
 * Async dare test: a laptop flies a solo heat and sends a "beat my run" link; a phone (isolated
 * browser, different pilot) opens it, races the ghost on the same layout, and gets a verdict that
 * matches the ladder; the laptop's hub then shows the reply and TRY AGAIN races the phone's run.
 *
 *   npm run dev            # in another terminal
 *   node tests/challenge.e2e.mjs [baseUrl]
 */
import { chromium, devices } from 'playwright-core';
// Opt in to the playtest hook, so the suite also runs against a deployed site.
const optIn = async (browser, options) => { const ctx = await browser.newContext(options); await ctx.addInitScript(() => localStorage.setItem('starwake-playtest', '1')); return ctx; };
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:5180';
const OUT = process.env.OUT || new URL('./artifacts/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
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
async function callsign(page, name) {
  await page.evaluate((n) => { const i = document.querySelector('#sw-callsign'); if (!i) return; i.value = n; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, name);
}
// Finish the current heat quickly with a given ring score.
async function flyHeat(page, rings) {
  await until(page, () => window.__starwake.state.race?.started && !window.__starwake.state.race.done, null, { timeout: 25000 });
  await page.evaluate((pts) => { const S = window.__starwake; S.state.race.ringPoints = pts; S.state.race.endsAt = Date.now() + (S.state.serverOffset || 0) + 6500; }, rings);
  return until(page, () => document.querySelector('#results-screen.active') && ['results', 'complete'].includes(window.__starwake.state.room?.phase), null, { timeout: 30000 });
}

const browser = await chromium.launch({ headless: !process.env.HEADED });
const laptop = await (await optIn(browser, { viewport: { width: 1280, height: 800 } })).newPage();
const phone = await (await optIn(browser, { ...devices['iPhone 13'] })).newPage();
const errors = [];
for (const page of [laptop, phone]) page.on('pageerror', (e) => errors.push(e.message));

try {
  // ---- Laptop: solo heat, then BEAT MY RUN ----
  await laptop.goto(BASE);
  await laptop.waitForSelector('#launch-skip');
  await laptop.click('#launch-skip');
  await laptop.waitForSelector('.sw-hub-launch', { state: 'visible' });
  await callsign(laptop, 'DARER');
  await laptop.click('[data-mode=pve]');
  await laptop.click('[data-course=titan-veil]');
  await laptop.click('.sw-hub-launch');
  await wait(1200);
  await laptop.keyboard.press('Enter');
  check('laptop finishes a solo heat', await flyHeat(laptop, 700));
  await laptop.evaluate(() => { window.__copied = ''; navigator.clipboard.writeText = async (t) => { window.__copied = t; }; });
  await laptop.click('.challenge-send');
  const link = await until(laptop, () => (window.__copied.match(/https?:\/\/\S+\?challenge=[a-z0-9]{8}/) || [])[0]);
  check('BEAT MY RUN produces a dare link', link, link || 'no link');
  const target = await laptop.evaluate(() => window.__starwake.state.race.finalScore);

  // ---- Phone: opens the dare, sees the named target, races the ghost ----
  await phone.goto(link);
  await phone.waitForSelector('#launch-button');
  const headline = await until(phone, () => /BEAT\s+[\d,]+/.test(document.querySelector('.launch-copy h1')?.innerText || '') && document.querySelector('.launch-copy h1').innerText.replace(/\s+/g, ' '));
  check('dare landing names the target score', headline && headline.includes(Number(target).toLocaleString()), headline || '');
  await callsign(phone, 'TAKER');
  await phone.tap('#launch-button');
  await until(phone, () => !document.querySelector('#briefing')?.hidden);
  const brief = await phone.evaluate(() => document.querySelector('.brief-challenge')?.innerText || '');
  check('briefing explains the dare', /CHALLENGE FROM DARER/i.test(brief), brief.replace(/\s+/g, ' ').slice(0, 80));
  await phone.tap('.brief-go');
  const ghost = await until(phone, () => window.__starwake.combat?.externalScores(window.__starwake.state.race).length > 0);
  check('the dare ghost races beside you', ghost);
  await callsign(phone, 'TAKER');
  check('phone finishes the dare heat', await flyHeat(phone, 1600));
  const verdict = await until(phone, () => document.querySelector('.challenge-verdict')?.innerText.replace(/\s+/g, ' '));
  const ladder = await until(phone, () => document.querySelector('.challenge-ladder')?.innerText.replace(/\s+/g, ' '), null, { timeout: 15000 });
  check('verdict says who won', /beat DARER/i.test(verdict || ''), verdict || '');
  const verdictNums = (verdict || '').match(/[\d,]+ vs [\d,]+/)?.[0].split(' vs ').map((n) => Number(n.replace(/,/g, '')));
  const ladderNums = [...(ladder || '').matchAll(/(TAKER|DARER)(?: · YOU)?\s+([\d,]+)/g)].reduce((m, x) => ({ ...m, [x[1]]: Number(x[2].replace(/,/g, '')) }), {});
  check('verdict and ladder show the same two scores', verdictNums && ladderNums.TAKER === verdictNums[0] && ladderNums.DARER === verdictNums[1], `verdict ${verdictNums}, ladder ${JSON.stringify(ladderNums)}`);
  await phone.screenshot({ path: `${OUT}/challenge-phone-verdict.png` });

  // ---- Laptop: back at the hub, the dare shows the reply and TRY AGAIN races the phone's run ----
  await laptop.click('#continue-button').catch(() => {});
  await laptop.evaluate(() => document.querySelector('#results-screen [data-home]')?.click());
  const card = await until(laptop, () => document.querySelector('.sw-dares')?.innerText.replace(/\s+/g, ' '), null, { timeout: 15000 });
  check("sender's hub card shows the reply", /TAKER leads/i.test(card || ''), card || 'no card');
  const href = await laptop.evaluate(() => document.querySelector('.sw-dare-row')?.getAttribute('href') || '');
  const replyId = href.match(/challenge=([a-z0-9]{8})/)?.[1];
  const original = link.match(/challenge=([a-z0-9]{8})/)[1];
  check("TRY AGAIN races the replier's run", replyId && replyId !== original, href);
} catch (error) {
  check('test ran to completion', false, error.message);
}
check('no page errors', !errors.length, errors.slice(0, 2).join(' | '));
await browser.close();
const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
