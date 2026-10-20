// Tiny WebAudio synth: chiptune SFX + looping background tunes, no files needed.
// Audio uses the real Math.random (captured at load): online play swaps Math.random for a seeded one during
// simulation steps, and sound must never consume those numbers (a muted phone would fall out of step).
import { realRandom as rnd } from './detmath.js';
let ac = null, master = null, musicGain = null, sfxGain = null;
let muted = false;
let quiet = false; // online catch-up: the simulation fast-forwards silently
export function setQuiet(q) { quiet = q; }
try { muted = localStorage.getItem('thoa_mute') === '1'; } catch (e) { /* storage blocked */ }

function ensure() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return false;
  ac = new A(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
  musicGain = ac.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
  sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
  return true;
}
export function unlock() { ensure(); }
export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted; try { localStorage.setItem('thoa_mute', muted ? '1' : '0'); } catch (e) { /* ignore */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.02);
  return muted;
}

function tone(freq, dur, { type = 'square', vol = 0.3, slide = 0, delay = 0, dest = null, attack = 0.005 } = {}) {
  if (quiet || !ensure()) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest || sfxGain); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.3, delay = 0, freq = 1200, q = 1 } = {}) {
  if (quiet || !ensure()) return;
  const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t);
}

const N = n => 440 * Math.pow(2, (n - 69) / 12);
export const sfx = {
  move: () => tone(660, 0.05, { vol: 0.12, type: 'square' }),
  tool: () => tone(520, 0.06, { vol: 0.15, type: 'triangle', slide: 200 }),
  ok: () => { tone(N(76), 0.08, { vol: 0.2 }); tone(N(83), 0.12, { vol: 0.2, delay: 0.06 }); },
  great: () => [72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.12, { vol: 0.18, delay: i * 0.05 })),
  bad: () => { tone(220, 0.18, { vol: 0.2, type: 'sawtooth', slide: -80 }); },
  water: () => noise(0.25, { vol: 0.25, freq: 3000, q: 0.8 }),
  snip: () => { noise(0.05, { vol: 0.35, freq: 5000 }); noise(0.05, { vol: 0.35, freq: 5000, delay: 0.08 }); },
  catchBug: () => { tone(900, 0.08, { vol: 0.15, slide: 600 }); noise(0.08, { vol: 0.15, freq: 2000, delay: 0.03 }); },
  wilt: () => tone(400, 0.3, { vol: 0.12, type: 'triangle', slide: -250 }),
  drop: () => { tone(160, 0.3, { vol: 0.35, type: 'triangle', slide: -100 }); noise(0.3, { vol: 0.35, freq: 600 }); },
  shovel: () => noise(0.09, { vol: 0.3, freq: 900 + rnd() * 600, q: 2 }),
  bump: () => { tone(120, 0.15, { vol: 0.35, type: 'square', slide: -60 }); noise(0.12, { vol: 0.3, freq: 400 }); },
  honk: () => { tone(N(64), 0.14, { vol: 0.15, type: 'square' }); tone(N(67), 0.14, { vol: 0.12, type: 'square' }); tone(N(64), 0.2, { vol: 0.15, type: 'square', delay: 0.17 }); tone(N(67), 0.2, { vol: 0.12, type: 'square', delay: 0.17 }); },
  pickup: () => { tone(N(84), 0.06, { vol: 0.15 }); tone(N(91), 0.1, { vol: 0.15, delay: 0.05 }); },
  quack: () => tone(600, 0.12, { vol: 0.15, type: 'sawtooth', slide: -300 }),
  woof: () => { tone(300, 0.08, { vol: 0.2, type: 'sawtooth', slide: -150 }); tone(280, 0.1, { vol: 0.2, type: 'sawtooth', slide: -150, delay: 0.12 }); },
  count: () => tone(N(72), 0.12, { vol: 0.2 }),
  go: () => { tone(N(84), 0.3, { vol: 0.22 }); tone(N(79), 0.3, { vol: 0.12, type: 'triangle' }); },
  click: () => tone(1200, 0.03, { vol: 0.1, type: 'triangle' }),
  pop: () => tone(500, 0.08, { vol: 0.15, type: 'sine', slide: 500 }),
  type: () => tone(1500 + rnd() * 300, 0.02, { vol: 0.05, type: 'square' }),
  fanfare: () => [[72, 0], [76, .12], [79, .24], [84, .36], [79, .54], [84, .66]].forEach(([n, d]) => tone(N(n), 0.22, { vol: 0.2, delay: d })),
  timeup: () => { tone(N(79), 0.15, { vol: 0.2 }); tone(N(74), 0.15, { vol: 0.2, delay: 0.15 }); tone(N(67), 0.35, { vol: 0.2, delay: 0.3 }); },
  tick: () => tone(1800, 0.03, { vol: 0.06, type: 'square' }),
};

// ---- engine hum for the truck
let eng = null;
export function engine(speed01) {
  if (!ensure()) return;
  if (!eng) {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(sfxGain); o.start(); eng = { o, g };
  }
  if (speed01 < 0) { eng.g.gain.setTargetAtTime(0, ac.currentTime, 0.05); return; }
  eng.o.frequency.setTargetAtTime(55 + speed01 * 90, ac.currentTime, 0.08);
  eng.g.gain.setTargetAtTime(0.05 + speed01 * 0.06, ac.currentTime, 0.08);
}

// ---- music: tiny step sequencer
const SONGS = {
  title: { bpm: 112, lead: [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 79, 72, 0, 0, 0, 76, 0, 79, 0, 84, 81, 79, 0, 81, 79, 76, 74, 76, 0, 0, 0], bass: [48, 55, 52, 55, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50] },
  play: { bpm: 140, lead: [72, 76, 79, 76, 81, 79, 76, 74, 72, 74, 76, 79, 77, 76, 74, 0, 72, 76, 79, 84, 81, 79, 76, 79, 77, 76, 74, 72, 74, 0, 72, 0], bass: [48, 48, 55, 55, 53, 53, 50, 50, 48, 48, 55, 55, 53, 55, 48, 48] },
  calm: { bpm: 96, lead: [79, 0, 76, 0, 77, 0, 74, 0, 76, 0, 72, 0, 74, 76, 0, 0, 79, 0, 81, 0, 79, 0, 76, 0, 77, 76, 74, 0, 72, 0, 0, 0], bass: [48, 52, 53, 50, 48, 45, 50, 55, 48, 52, 53, 50, 53, 55, 48, 48] },
};
let seq = null;
export function music(name) {
  if (seq && seq.name === name) return;
  stopMusic(); if (!name || !ensure()) return;
  const song = SONGS[name], stepDur = 60 / song.bpm / 2;
  let step = 0, next = ac.currentTime + 0.1;
  const timer = setInterval(() => {
    while (next < ac.currentTime + 0.2) {
      const l = song.lead[step % song.lead.length];
      if (l) tone(N(l), stepDur * 0.9, { vol: 0.16, type: 'square', delay: next - ac.currentTime, dest: musicGain });
      if (step % 2 === 0) { const b = song.bass[(step / 2) % song.bass.length]; tone(N(b), stepDur * 1.8, { vol: 0.3, type: 'triangle', delay: next - ac.currentTime, dest: musicGain }); }
      if (step % 4 === 2) noise(0.04, { vol: 0.06, freq: 8000, delay: next - ac.currentTime });
      next += stepDur; step++;
    }
  }, 50);
  seq = { name, timer };
}
export function stopMusic() { if (seq) { clearInterval(seq.timer); seq = null; } }

// low-level access for scenes that sequence their own music (round 4)
export { tone, noise, N };
