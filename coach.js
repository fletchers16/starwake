/**
 * First-flight coach: on a player's first solo race, three live prompts teach the battle verbs
 * by doing them instead of reading them: grab a ? crate, zap the racer it puts ahead of you,
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
  // Stop coaching without marking it done (quit mid-lesson, or a race that isn't a first solo flight).
  function reset() { active = false; el.hidden = true; document.body.classList.remove('coaching'); combat.debugRacers?.().forEach((b) => { b.holdAhead = 0; }); combat.coachStandDown?.(); }
  function finish() { reset(); markDone(); }

  function begin(r) {
    if (coachDone()) return;
    active = true;
    document.body.classList.add('coaching');
    step = 0;
    stepAt = r.time;
    say('Fly through a <em>?</em> crate', 'Crates give you an item. Steer into one.');
  }

  function update(r) {
    if (!active || !r.started) return;
    if (r.done) { finish(); return; }
    // Missed every crate for 10 s: hand over the blaster so the lesson keeps moving.
    if (step === 0 && !r.item && !r.rolling && r.time - stepAt > 10) { r.item = 'blaster'; r.ammo = 3; r.pendingItem = null; }
    // Each card stays up long enough to read (~3 s) before the next lesson starts.
    if (step === 0 && (r.item || r.rolling) && r.time - stepAt > 2.5) {
      step = 1; stepAt = r.time;
      // Guarantee a target: a sim pilot just ahead of you.
      const b = combat.debugRacers()[0];
      // It stays at least 12 m ahead until zapped (sim pilots ease off when leading, so it would drift behind).
      if (b) { b.d = r.distance + 14; b.x = r.x; b.y = r.y; b.tx = r.x; b.ty = r.y; b.stunUntil = -9; b.noDodgeUntil = r.time + 30; b.nextWeave = r.time + 4; b.holdAhead = 12; }
      if (r.item !== 'blaster' || r.rolling) { r.item = 'blaster'; r.ammo = 3; r.rolling = 0; r.pendingItem = null; }
      say(`${touch ? 'Tap <em>FIRE</em>' : 'Press <em>F</em>'} to zap`, 'Your blaster locks onto the racer ahead. A zap steals 8% of their points.');
    } else if (step === 1 && !r.zapsLanded && !r.rolling && r.item !== 'blaster') {
      // A crate grabbed mid-lesson would replace the blaster: keep the zap lesson's tool in hand.
      r.item = 'blaster'; r.ammo = 3; r.pendingItem = null;
    } else if (step === 1 && (r.zapsLanded || 0) > 0 && r.time - stepAt > 3) {
      combat.debugRacers().forEach((b) => { b.holdAhead = 0; });
      step = 2; stepAt = r.time; armedAt = 0; retried = false; stunSeen = r.stunUntil;
      say('Incoming fire!', `When you see <em>LOCKED ON</em>, ${touch ? 'tap <em>ROLL</em>' : 'press <em>Q</em>'} to barrel-roll. The shot bounces back.`);
    } else if (step === 2) {
      // Arm a sim pilot behind you once, so a telegraphed shot really comes.
      if (!armedAt && r.time - stepAt > 3) {
        if (combat.coachArm(r)) armedAt = r.time;
      }
      // The PERFECT REFLECT banner already celebrates; the card just hands over.
      if ((r.reflects || 0) > 0) { step = 3; say('Now win the heat!', 'You know every move: crates, zaps and rolls.'); setTimeout(finish, 2600); }
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

  return { begin, update, finish, reset, get active() { return active; } };
}
