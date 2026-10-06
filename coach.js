/**
 * First-flight coach: on a player's first solo race, three live prompts teach the battle verbs
 * by doing them instead of reading them: grab a ? pod, zap the racer it puts ahead of you,
 * then barrel-roll a sim pilot's telegraphed shot. Runs once (remembered in localStorage),
 * and can be skipped.
 */
const DONE_KEY = 'starwake-coached';

export const coachDone = () => { try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return true; } };
const markDone = () => { try { localStorage.setItem(DONE_KEY, '1'); } catch {} };

export function createCoach({ el, combat, touch }) {
  let step = 0, stepAt = 0, armedAt = 0, active = false, retried = false, stunSeen = -9;
  const say = (title, body, extra = '') => {
    el.innerHTML = `<small>FIRST FLIGHT · ${Math.min(step + 1, 3)}/3</small><b>${title}</b><span>${body}</span>${extra}<button type="button" class="coach-skip">SKIP</button>`;
    el.querySelector('.coach-skip').onclick = finish;
    el.hidden = false;
  };
  function finish() { active = false; el.hidden = true; document.body.classList.remove('coaching'); combat.coachStandDown?.(); markDone(); }

  function begin(r) {
    if (coachDone()) return;
    active = true;
    document.body.classList.add('coaching');
    step = 0;
    stepAt = r.time;
    say('Fly through a <em>?</em> pod', 'Rainbow boxes give you an item. Steer into one.');
  }

  function update(r) {
    if (!active || !r.started) return;
    if (r.done) { finish(); return; }
    if (step === 0 && (r.item || r.rolling)) {
      step = 1; stepAt = r.time;
      // Guarantee a target: a sim pilot just ahead of you.
      const b = combat.debugRacers()[0];
      if (b) { b.d = r.distance + 14; b.x = r.x; b.y = r.y; b.tx = r.x; b.ty = r.y; b.stunUntil = -9; b.noDodgeUntil = r.time + 20; b.nextWeave = r.time + 4; }
      if (!r.item || r.item === 'shield' || r.item === 'turbo') { r.item = 'blaster'; r.ammo = 3; r.rolling = 0; r.pendingItem = null; }
      say(`${touch ? 'Tap <em>FIRE</em>' : 'Press <em>F</em>'} to zap`, 'Your blaster locks onto the racer ahead. A zap steals 8% of their points.');
    } else if (step === 1 && (r.zapsLanded || 0) > 0) {
      step = 2; stepAt = r.time; armedAt = 0; retried = false; stunSeen = r.stunUntil;
      say('Incoming fire!', `When you see <em>LOCKED ON</em>, ${touch ? 'tap <em>ROLL</em>' : 'press <em>Q</em>'} to barrel-roll. The shot bounces back.`);
    } else if (step === 2) {
      // Arm a sim pilot behind you once, so a telegraphed shot really comes.
      if (!armedAt && r.time - stepAt > 1.2) {
        if (combat.coachArm(r)) armedAt = r.time;
      }
      if ((r.reflects || 0) > 0) { step = 3; say('Perfect reflect!', 'You know every move. Now win the heat.'); setTimeout(finish, 2600); }
      else if (armedAt && r.stunUntil > stunSeen && !retried) {
        // Hit before rolling: one more telegraphed shot.
        retried = true; stunSeen = r.stunUntil; armedAt = 0; stepAt = r.time + 0.8;
        say('Too slow! Once more', `Watch for <em>LOCKED ON</em>, then ${touch ? 'tap <em>ROLL</em>' : 'press <em>Q</em>'}.`);
      }
      else if (armedAt && r.time - armedAt > 6) { step = 3; say('You got the idea', `Roll the moment you see LOCKED ON. Now win the heat.`); setTimeout(finish, 2600); }
    } else if (step === 1 && r.time - stepAt > 12) {
      say(`${touch ? 'Tap <em>FIRE</em>' : 'Press <em>F</em>'} to zap`, 'Point your nose at the racer with the reticle on it, then fire.');
      stepAt = r.time;
    }
  }

  return { begin, update, finish, get active() { return active; } };
}
