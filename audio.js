/**
 * Starwake sound: a tiny Web Audio synth (no asset files).
 *
 * Browsers only allow audio after a user gesture, so call `unlock()` from a
 * click/keydown. Everything is a no-op while sound is off or locked.
 */

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];
const KEY = 'starwake-sound';

export function createAudio() {
  let ctx = null;
  let master = null;
  let engine = null;
  let enabled = localStorage.getItem(KEY) !== 'off';

  const now = () => ctx.currentTime;
  const ready = () => enabled && ctx && ctx.state === 'running';

  function unlock() {
    if (!enabled) return;
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const limiter = ctx.createDynamicsCompressor();
      master.connect(limiter).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone({ freq = 440, type = 'sine', attack = 0.005, decay = 0.25, gain = 0.2, slide = 0, delay = 0 }) {
    if (!ready()) return;
    const t = now() + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + decay);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    osc.connect(amp).connect(master);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  function noise({ duration = 0.25, gain = 0.25, filter = 900, sweep = 0.3, delay = 0 }) {
    if (!ready()) return;
    const t = now() + delay;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(filter, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(60, filter * sweep), t + duration);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(lp).connect(amp).connect(master);
    src.start(t);
  }

  const note = (step, base = 523.25) => base * 2 ** (step / 12);

  // ---- Music: a bouncy cartoon chiptune, sequenced live (bass, drums, a lead), faster and busier in Zap Frenzy.
  // Call music(mode) every race tick; it stops by itself a moment after the calls stop (results, quit, menus).
  const CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]]; // C, Am, F, G
  const LEAD = [[7, null, 9, 7, 4, null, 2, 4], [0, 2, 4, null, 7, 4, 2, null], [5, null, 4, 2, 0, null, 2, null], [2, 4, 7, 9, 7, null, 11, null]];
  let musicBus = null, musicTimer = 0, step16 = 0, nextAt = 0, musicMode = 'off', musicSeen = 0;
  function drum(kind, t) {
    if (kind === 'kick') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.18);
      return;
    }
    const len = kind === 'hat' ? 0.04 : 0.14, buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
    g.gain.setValueAtTime(kind === 'hat' ? 0.12 : 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(musicBus); src.start(t);
  }
  function blip(freq, t, dur, type, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function scheduleMusic() {
    if (!ready() || musicMode === 'off' || performance.now() - musicSeen > 700) { stopMusic(); return; }
    const frenzy = musicMode === 'frenzy', sixteenth = 60 / (frenzy ? 152 : 128) / 4;
    while (nextAt < now() + 0.15) {
      const i = step16 % 16, bar = Math.floor(step16 / 16) % 4, chord = CHORDS[bar], t = nextAt;
      if (i % 4 === 0) drum('kick', t);
      if (i === 4 || i === 12) drum('snare', t);
      if (i % 2 === 0 || frenzy) drum('hat', t);
      if (i % 2 === 0) blip(note(chord[0] + (i % 4 === 2 ? 12 : 0), 130.81), t, sixteenth * 1.6, 'triangle', 0.22);
      const lead = LEAD[bar][i >> 1];
      if (i % 2 === 0 && lead !== null) blip(note(lead, 523.25), t, sixteenth * 1.8, 'square', 0.045);
      if (frenzy) blip(note(chord[i % 3] + 12, 523.25), t, sixteenth * 0.9, 'sawtooth', 0.03);
      nextAt += sixteenth;
      step16++;
    }
  }
  function stopMusic() {
    clearInterval(musicTimer); musicTimer = 0; musicMode = 'off';
    if (musicBus) { const bus = musicBus; bus.gain.setTargetAtTime(0.0001, now(), 0.15); setTimeout(() => bus.disconnect(), 600); musicBus = null; }
  }

  return {
    unlock,
    get enabled() { return enabled; },
    setEnabled(on) {
      enabled = on;
      localStorage.setItem(KEY, on ? 'on' : 'off');
      if (on) unlock();
      else { this.engine(0, false); if (musicTimer) stopMusic(); }
    },
    /** Ring collected: pitch climbs with the combo. */
    ring(combo = 1) {
      const step = PENTATONIC[Math.min(PENTATONIC.length - 1, combo - 1)];
      tone({ freq: note(step), type: 'triangle', decay: 0.22, gain: 0.16 });
      tone({ freq: note(step + 12), type: 'sine', decay: 0.18, gain: 0.06, delay: 0.02 });
    },
    perfect() { [0, 4, 7, 12].forEach((s, i) => tone({ freq: note(s, 659.25), type: 'triangle', decay: 0.3, gain: 0.12, delay: i * 0.06 })); },
    miss() { tone({ freq: 220, type: 'sine', decay: 0.18, gain: 0.07, slide: 0.6 }); },
    star() { [0, 7, 12, 19].forEach((s, i) => tone({ freq: note(s, 783.99), type: 'sine', decay: 0.35, gain: 0.08, delay: i * 0.04 })); },
    hit() {
      noise({ duration: 0.32, gain: 0.32, filter: 1400, sweep: 0.15 });
      tone({ freq: 110, type: 'sawtooth', decay: 0.25, gain: 0.12, slide: 0.45 });
    },
    boost() { noise({ duration: 0.5, gain: 0.12, filter: 400, sweep: 6 }); },
    // Battle sounds: a falling "pew", a cartoon "boing" when stunned, and a bubbly item roll.
    zap() { tone({ freq: 1400, type: 'square', decay: 0.16, gain: 0.06, slide: 0.18 }); tone({ freq: 900, type: 'sawtooth', decay: 0.12, gain: 0.03, slide: 0.3, delay: 0.02 }); },
    zapped() { tone({ freq: 300, type: 'triangle', decay: 0.5, gain: 0.12, slide: 2.4 }); tone({ freq: 160, type: 'sine', decay: 0.6, gain: 0.1, slide: 0.5, delay: 0.12 }); },
    roll(step = 0) { tone({ freq: note(step % 8, 523.25), type: 'triangle', decay: 0.06, gain: 0.05 }); },
    item() { [0, 4, 7].forEach((s, i) => tone({ freq: note(s, 880), type: 'square', decay: 0.12, gain: 0.05, delay: i * 0.05 })); },
    shield() { tone({ freq: 520, type: 'sine', decay: 0.4, gain: 0.09, slide: 1.6 }); },
    moo() { tone({ freq: 140, type: 'sawtooth', attack: 0.04, decay: 0.55, gain: 0.08, slide: 0.7 }); tone({ freq: 210, type: 'triangle', attack: 0.04, decay: 0.5, gain: 0.05, slide: 0.65 }); },
    pop() { noise({ duration: 0.12, gain: 0.14, filter: 2400, sweep: 0.2 }); },
    countdown(final = false) { tone({ freq: final ? 880 : 440, type: 'square', decay: final ? 0.45 : 0.14, gain: 0.07 }); },
    lap() { [0, 7, 12].forEach((s, i) => tone({ freq: note(s, 392), type: 'triangle', decay: 0.4, gain: 0.1, delay: i * 0.09 })); },
    finish() { [0, 4, 7, 12, 16].forEach((s, i) => tone({ freq: note(s, 523.25), type: 'triangle', decay: 0.5, gain: 0.1, delay: i * 0.08 })); },
    /** Background music: 'race', 'frenzy' or 'off'. Call it every tick while it should play. */
    music(mode = 'race') {
      if (!ready() || mode === 'off') { if (musicTimer) stopMusic(); return; }
      musicSeen = performance.now();
      if (mode !== musicMode && musicTimer) musicMode = mode;
      if (musicTimer) return;
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.0001;
      musicBus.gain.setTargetAtTime(0.16, now(), 0.4);
      musicBus.connect(master);
      musicMode = mode; step16 = 0; nextAt = now() + 0.08;
      musicTimer = setInterval(scheduleMusic, 40);
    },
    /** Continuous engine hum; `level` 0..1 maps to pitch and loudness. */
    engine(level = 0, on = true) {
      if (!ctx) return;
      if (!on || !enabled) {
        if (engine) {
          engine.amp.gain.setTargetAtTime(0.0001, now(), 0.08);
          const old = engine;
          setTimeout(() => { try { old.osc.stop(); old.sub.stop(); } catch {} }, 300);
          engine = null;
        }
        return;
      }
      if (!ready()) return;
      if (!engine) {
        const osc = ctx.createOscillator(), sub = ctx.createOscillator(), amp = ctx.createGain(), lp = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        sub.type = 'sine';
        lp.type = 'lowpass';
        lp.frequency.value = 420;
        amp.gain.value = 0.0001;
        osc.connect(lp);
        sub.connect(lp);
        lp.connect(amp).connect(master);
        osc.start();
        sub.start();
        engine = { osc, sub, amp, lp };
      }
      const t = now();
      engine.osc.frequency.setTargetAtTime(48 + level * 46, t, 0.12);
      engine.sub.frequency.setTargetAtTime(24 + level * 23, t, 0.12);
      engine.lp.frequency.setTargetAtTime(320 + level * 900, t, 0.12);
      engine.amp.gain.setTargetAtTime(0.035 + level * 0.04, t, 0.15);
    },
  };
}
