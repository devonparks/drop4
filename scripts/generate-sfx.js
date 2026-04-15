// Drop4 SFX synthesizer
// ─────────────────────────────────────────────────────────────────────────
// Generates a full set of premium-feeling UI/gameplay sound effects from
// scratch using basic synthesis primitives. No external dependencies.
//
// Each sound is built from a few building blocks:
//   • Tone:        sum of sine harmonics with amplitude envelope
//   • Sweep:       sine whose frequency moves over time (chirps, drops, rises)
//   • FM bell:     frequency modulation for bell/chime tones
//   • Noise burst: pink-ish noise with envelope (whoosh, swoosh)
//   • Mix:         add multiple sources at gains
//
// Output format: 44.1 kHz, 16-bit signed PCM, mono WAV.
// Output dir: <project>/src/assets/sounds/<name>.wav
//
// Run:  node scripts/generate-sfx.js

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const TWO_PI = Math.PI * 2;

// ─── Envelope helpers ────────────────────────────────────────────────────
// All envelopes return a value in [0, 1] at time t (seconds).

function envADSR({ attack, decay, sustain, release, hold = 0, peak = 1 }) {
  const a = attack, d = decay, h = hold, r = release;
  return (t) => {
    if (t < 0) return 0;
    if (t < a) return (t / a) * peak;
    if (t < a + d) return peak - ((t - a) / d) * (peak - sustain);
    if (t < a + d + h) return sustain;
    if (t < a + d + h + r) return sustain * (1 - (t - a - d - h) / r);
    return 0;
  };
}

// Quick percussive envelope: instant attack, exponential decay.
function envPerc(decayTime, peak = 1, curve = 4) {
  return (t) => (t < 0 ? 0 : peak * Math.exp(-curve * (t / decayTime)));
}

// ─── Source generators ──────────────────────────────────────────────────

// Sum of sine harmonics, optionally weighted: harmonics = [{n: 1, gain: 1}, {n: 2, gain: 0.3}]
function tone({ freq, harmonics = [{ n: 1, gain: 1 }], duration, env }) {
  const N = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    for (const h of harmonics) s += h.gain * Math.sin(TWO_PI * freq * h.n * t);
    out[i] = s * env(t);
  }
  return out;
}

// Sine sweep from f0 -> f1 with envelope
function sweep({ f0, f1, duration, env, curve = 'lin' }) {
  const N = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(N);
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const u = t / duration;
    const f = curve === 'exp' ? f0 * Math.pow(f1 / f0, u) : f0 + (f1 - f0) * u;
    phase += (TWO_PI * f) / SAMPLE_RATE;
    out[i] = Math.sin(phase) * env(t);
  }
  return out;
}

// FM bell: carrier frequency modulated by another sine. Produces bell, chime, glass tones.
function fmBell({ carrier, modRatio = 2.01, modIndex = 6, duration, env }) {
  const N = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    const mod = modIndex * Math.sin(TWO_PI * carrier * modRatio * t) * Math.exp(-3 * t / duration);
    out[i] = Math.sin(TWO_PI * carrier * t + mod) * env(t);
  }
  return out;
}

// Filtered noise burst: white noise smoothed by a 1-pole low-pass. cutoff ∈ (0..1)
function noise({ duration, env, cutoff = 0.3, color = 'white' }) {
  const N = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(N);
  let prev = 0;
  let pinkB0 = 0, pinkB1 = 0, pinkB2 = 0; // Voss-McCartney-ish pink filter
  for (let i = 0; i < N; i++) {
    const t = i / SAMPLE_RATE;
    let n = (Math.random() * 2 - 1);
    if (color === 'pink') {
      pinkB0 = 0.99765 * pinkB0 + n * 0.0990460;
      pinkB1 = 0.96300 * pinkB1 + n * 0.2965164;
      pinkB2 = 0.57000 * pinkB2 + n * 1.0526913;
      n = (pinkB0 + pinkB1 + pinkB2 + n * 0.1848) * 0.25;
    }
    // 1-pole LP: y[n] = y[n-1] + cutoff * (x[n] - y[n-1])
    prev += cutoff * (n - prev);
    out[i] = prev * env(t);
  }
  return out;
}

// Mix any number of buffers with gains. Output length = max length.
function mix(...sources) {
  const N = Math.max(...sources.map((s) => s.buf.length));
  const out = new Float32Array(N);
  for (const { buf, gain = 1, delay = 0 } of sources) {
    const offset = Math.floor(delay * SAMPLE_RATE);
    for (let i = 0; i < buf.length; i++) {
      const j = i + offset;
      if (j >= 0 && j < N) out[j] += buf[i] * gain;
    }
  }
  return out;
}

// Pad a buffer to a target duration (silence padding).
function pad(buf, totalDuration) {
  const N = Math.floor(totalDuration * SAMPLE_RATE);
  if (buf.length >= N) return buf;
  const out = new Float32Array(N);
  out.set(buf, 0);
  return out;
}

// Apply a gentle limiter so the WAV never clips at int16 conversion.
function limit(buf, ceiling = 0.95) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  if (peak <= ceiling) return buf;
  const k = ceiling / peak;
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * k;
  return out;
}

// ─── WAV writer (mono, 16-bit signed PCM, 44.1 kHz) ─────────────────────

function bufToWav(buf) {
  const N = buf.length;
  const dataSize = N * 2;
  const totalSize = 44 + dataSize;
  const out = Buffer.alloc(totalSize);
  // RIFF header
  out.write('RIFF', 0);
  out.writeUInt32LE(totalSize - 8, 4);
  out.write('WAVE', 8);
  // fmt chunk
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);          // PCM chunk size
  out.writeUInt16LE(1, 20);           // PCM format
  out.writeUInt16LE(1, 22);           // mono
  out.writeUInt32LE(SAMPLE_RATE, 24); // sample rate
  out.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate (sr * channels * 2)
  out.writeUInt16LE(2, 32);           // block align
  out.writeUInt16LE(16, 34);          // bits per sample
  // data chunk
  out.write('data', 36);
  out.writeUInt32LE(dataSize, 40);
  // PCM samples
  for (let i = 0; i < N; i++) {
    let s = Math.max(-1, Math.min(1, buf[i]));
    out.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return out;
}

// ─── Sound recipes ──────────────────────────────────────────────────────

const sfx = {};

// 1. tap — soft satisfying premium UI tap
//    Two close sine harmonics with very fast perc envelope. Adds a brief
//    high-mid click for snap.
sfx.tap = () => {
  const main = tone({
    freq: 1400,
    harmonics: [{ n: 1, gain: 0.7 }, { n: 1.5, gain: 0.3 }],
    duration: 0.12,
    env: envPerc(0.12, 0.7, 6),
  });
  const click = tone({
    freq: 4200,
    harmonics: [{ n: 1, gain: 1 }],
    duration: 0.04,
    env: envPerc(0.04, 0.4, 8),
  });
  return limit(pad(mix({ buf: main }, { buf: click, gain: 0.6 }), 0.2));
};

// 2. click — premium UI button click with snappy bass thump
//    Low-mid sine pluck + fast high transient.
sfx.click = () => {
  const body = tone({
    freq: 320,
    harmonics: [{ n: 1, gain: 0.8 }, { n: 2, gain: 0.4 }, { n: 3, gain: 0.15 }],
    duration: 0.18,
    env: envPerc(0.18, 0.85, 5),
  });
  const transient = tone({
    freq: 2800,
    harmonics: [{ n: 1, gain: 1 }],
    duration: 0.03,
    env: envPerc(0.03, 0.55, 10),
  });
  return limit(pad(mix({ buf: body }, { buf: transient, gain: 0.55 }), 0.25));
};

// 3. swoosh — light airy whoosh for menu slides
//    Filtered noise burst with quick attack-decay envelope.
sfx.swoosh = () => {
  const env = (t) => {
    const u = t / 0.4;
    if (u < 0 || u > 1) return 0;
    return Math.sin(Math.PI * u) * 0.7; // smooth half-sine bell
  };
  const noiseBuf = noise({ duration: 0.4, env, cutoff: 0.55, color: 'pink' });
  return limit(pad(noiseBuf, 0.5));
};

// 4. whoosh — powerful whoosh transition with deep bass tail
//    Pink-noise sweep with low rumble layer.
sfx.whoosh = () => {
  const env = (t) => {
    const u = t / 0.55;
    if (u < 0 || u > 1) return 0;
    return Math.sin(Math.PI * u) * 0.8;
  };
  const noiseBuf = noise({ duration: 0.55, env, cutoff: 0.35, color: 'pink' });
  const rumble = sweep({
    f0: 180,
    f1: 60,
    duration: 0.55,
    env: envPerc(0.55, 0.6, 2),
    curve: 'exp',
  });
  return limit(pad(mix({ buf: noiseBuf, gain: 0.85 }, { buf: rumble, gain: 0.5 }), 0.7));
};

// 5. drop — Connect 4 piece dropping into a slot
//    Two sine bursts: a quick high "tick" and a thunky low body with a
//    short pitch drop, mimicking plastic-on-plastic with hollow resonance.
sfx.drop = () => {
  const tick = tone({
    freq: 1900,
    harmonics: [{ n: 1, gain: 1 }],
    duration: 0.04,
    env: envPerc(0.04, 0.6, 8),
  });
  const body = sweep({
    f0: 220,
    f1: 130,
    duration: 0.22,
    env: envPerc(0.22, 0.85, 4),
    curve: 'exp',
  });
  const subTail = tone({
    freq: 95,
    harmonics: [{ n: 1, gain: 1 }],
    duration: 0.18,
    env: envPerc(0.18, 0.45, 5),
  });
  return limit(
    pad(mix({ buf: tick, gain: 0.5 }, { buf: body }, { buf: subTail, gain: 0.6, delay: 0.02 }), 0.32),
  );
};

// 6. win — joyful ascending major arpeggio (C5 - E5 - G5 - C6)
sfx.win = () => {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const dur = 0.18;
  const noteEnv = envPerc(dur, 0.7, 4);
  const buffers = notes.map((f, i) => ({
    buf: tone({
      freq: f,
      harmonics: [{ n: 1, gain: 0.8 }, { n: 2, gain: 0.25 }, { n: 3, gain: 0.1 }],
      duration: dur,
      env: noteEnv,
    }),
    delay: i * 0.09,
    gain: 0.85,
  }));
  // Sustained chord at the end
  const chord = mix(
    { buf: tone({ freq: 523.25, harmonics: [{ n: 1, gain: 1 }, { n: 2, gain: 0.3 }], duration: 0.6, env: envPerc(0.6, 0.5, 2) }), gain: 0.55 },
    { buf: tone({ freq: 659.25, harmonics: [{ n: 1, gain: 1 }, { n: 2, gain: 0.3 }], duration: 0.6, env: envPerc(0.6, 0.5, 2) }), gain: 0.45 },
    { buf: tone({ freq: 783.99, harmonics: [{ n: 1, gain: 1 }, { n: 2, gain: 0.3 }], duration: 0.6, env: envPerc(0.6, 0.5, 2) }), gain: 0.45 },
  );
  return limit(pad(mix(...buffers, { buf: chord, delay: 0.36, gain: 0.7 }), 1.2));
};

// 7. lose — soft descending minor (G4 - Eb4 - C4) with gentle dignity
sfx.lose = () => {
  const notes = [392.0, 311.13, 261.63];
  const dur = 0.32;
  const buffers = notes.map((f, i) => ({
    buf: tone({
      freq: f,
      harmonics: [{ n: 1, gain: 0.9 }, { n: 2, gain: 0.18 }],
      duration: dur,
      env: envPerc(dur, 0.55, 3),
    }),
    delay: i * 0.18,
    gain: 0.8,
  }));
  return limit(pad(mix(...buffers), 1.0));
};

// 8. coin — bright sparkle ding (high major chord stack with FM glint)
sfx.coin = () => {
  const ding = fmBell({ carrier: 1567.98, modRatio: 3.01, modIndex: 4, duration: 0.35, env: envPerc(0.35, 0.85, 3) });
  const sparkle = fmBell({ carrier: 2349, modRatio: 2.01, modIndex: 5, duration: 0.25, env: envPerc(0.25, 0.55, 5) });
  return limit(pad(mix({ buf: ding }, { buf: sparkle, gain: 0.6, delay: 0.02 }), 0.45));
};

// 9. level_up — ascending sweep + arrival chord
sfx.level_up = () => {
  const rise = sweep({ f0: 300, f1: 1200, duration: 0.45, env: envPerc(0.45, 0.6, 2.5), curve: 'exp' });
  const chordNotes = [523.25, 659.25, 783.99, 1046.5];
  const chord = mix(
    ...chordNotes.map((f) => ({
      buf: tone({ freq: f, harmonics: [{ n: 1, gain: 1 }, { n: 2, gain: 0.3 }], duration: 0.7, env: envPerc(0.7, 0.55, 2.5) }),
      gain: 0.55,
    })),
  );
  const sparkle = fmBell({ carrier: 2093, modRatio: 3.01, modIndex: 5, duration: 0.4, env: envPerc(0.4, 0.5, 4) });
  return limit(
    pad(mix({ buf: rise, gain: 0.7 }, { buf: chord, delay: 0.42, gain: 0.85 }, { buf: sparkle, delay: 0.42, gain: 0.6 }), 1.4),
  );
};

// 10. achievement — triumphant unlock with golden bell + subtle fanfare
sfx.achievement = () => {
  const bell1 = fmBell({ carrier: 1318.51, modRatio: 2.01, modIndex: 6, duration: 0.6, env: envPerc(0.6, 0.85, 2.5) });
  const bell2 = fmBell({ carrier: 1975.53, modRatio: 3.01, modIndex: 5, duration: 0.55, env: envPerc(0.55, 0.65, 2.8) });
  const lowTone = tone({ freq: 329.63, harmonics: [{ n: 1, gain: 1 }, { n: 2, gain: 0.3 }, { n: 3, gain: 0.15 }], duration: 0.8, env: envPerc(0.8, 0.5, 2) });
  return limit(
    pad(mix({ buf: bell1, gain: 0.8 }, { buf: bell2, gain: 0.55, delay: 0.08 }, { buf: lowTone, gain: 0.55 }), 1.2),
  );
};

// 11. countdown — single short tick
sfx.countdown = () => {
  const tick = tone({
    freq: 880,
    harmonics: [{ n: 1, gain: 1 }, { n: 2, gain: 0.3 }],
    duration: 0.1,
    env: envPerc(0.1, 0.8, 6),
  });
  return limit(pad(tick, 0.15));
};

// 12. boss_intro — dramatic low brass-like sting
sfx.boss_intro = () => {
  // Detuned low sawtooth approximation via odd harmonics
  const harmonicsLow = [
    { n: 1, gain: 0.8 },
    { n: 2, gain: 0.45 },
    { n: 3, gain: 0.3 },
    { n: 4, gain: 0.2 },
    { n: 5, gain: 0.12 },
  ];
  const root = tone({ freq: 87.31, harmonics: harmonicsLow, duration: 1.4, env: envPerc(1.4, 0.85, 1.5) }); // F2
  const fifth = tone({ freq: 130.81, harmonics: harmonicsLow, duration: 1.4, env: envPerc(1.4, 0.7, 1.5) }); // C3
  // Quick rumble noise hit at start
  const hit = noise({ duration: 0.2, env: envPerc(0.2, 0.4, 4), cutoff: 0.2, color: 'pink' });
  return limit(pad(mix({ buf: root, gain: 0.7 }, { buf: fifth, gain: 0.55 }, { buf: hit, gain: 0.4 }), 1.6));
};

// 13. match_found — exciting dual chime (two notes overlapping)
sfx.match_found = () => {
  const c1 = fmBell({ carrier: 880, modRatio: 2.01, modIndex: 4, duration: 0.5, env: envPerc(0.5, 0.85, 3) });
  const c2 = fmBell({ carrier: 1318.51, modRatio: 2.01, modIndex: 4, duration: 0.5, env: envPerc(0.5, 0.85, 3) });
  return limit(pad(mix({ buf: c1 }, { buf: c2, delay: 0.12, gain: 0.85 }), 0.85));
};

// ─── Run ────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'src', 'assets', 'sounds');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let total = 0;
for (const [name, build] of Object.entries(sfx)) {
  const buf = build();
  const wav = bufToWav(buf);
  const file = path.join(outDir, `${name}.wav`);
  fs.writeFileSync(file, wav);
  const sec = (buf.length / SAMPLE_RATE).toFixed(2);
  console.log(`  ✓ ${name.padEnd(14)} ${sec}s  ${(wav.length / 1024).toFixed(1)} KB`);
  total++;
}
console.log(`\nGenerated ${total} sound effects → ${outDir}`);
