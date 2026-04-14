"use client";

/**
 * Procedural sound engine using Web Audio API.
 * No external audio files needed — all sounds are synthesized.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Sci-fi energy weapon shot — blaster "pew" */
export function playBlasterSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    const bufferSize = ctx.sampleRate * 0.06;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 3000;
    filter.Q.value = 2;

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
  } catch {
    // Audio not available
  }
}

/** Shotgun — punchy low-frequency boom with noise burst */
export function playShotgunSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Low punch — the "boom"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Heavy noise burst — the "crack"
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);

    // Secondary thump
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(80, now);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 0.1);
    gain2.gain.setValueAtTime(0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.12);
  } catch {}
}

/** Plasma cannon — rising whine then release */
export function playPlasmaSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Charging whine
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    // Energy release buzz
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(600, now + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(150, now + 0.2);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.2);
  } catch {}
}

/** Rocket launcher — deep thud with whoosh tail */
export function playRocketSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Deep launch thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);

    // Whoosh — filtered noise rising in pitch
    const bufferSize = ctx.sampleRate * 0.4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    filter.Q.value = 1;

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);

    // Metallic clank (tube launch)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(200, now);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.06);
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.06);
  } catch {}
}

/** Enemy hit — metallic impact */
export function playHitSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Audio not available
  }
}

/** Enemy death — explosion */
export function playExplosionSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Low rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
  } catch {
    // Audio not available
  }
}

/** Player takes damage — sharp zap */
export function playDamageSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Distortion crackle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(150, now);
    gain2.gain.setValueAtTime(0.06, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.1);
  } catch {
    // Audio not available
  }
}

/** Wave start — rising tone */
export function playWaveStartSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.5);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);

    // Harmony
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(300, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
    osc2.frequency.exponentialRampToValueAtTime(900, now + 0.55);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.55);
  } catch {
    // Audio not available
  }
}

/** Pickup collected — bright chime */
export function playPickupSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.06;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    // Audio not available
  }
}

/** Footstep — short thud */
export function playFootstepSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.04;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
  } catch {}
}

/** Kill streak sound — ascending tone */
export function playKillStreakSound(streak: number) {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const baseFreq = 400 + streak * 100;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Harmony
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = baseFreq * 1.25;
    gain2.gain.setValueAtTime(0.001, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.25);
  } catch {}
}

/** Random distant rumble — plays occasionally for atmosphere */
export function playDistantRumble() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(25 + Math.random() * 15, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 1.5);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);

    // Low noise layer
    const bufferSize = ctx.sampleRate * 1.2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.02, now + 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 150;

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
  } catch {}
}

/** Pipe hiss — short steam burst */
export function playPipeHiss() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.03, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(4000 + Math.random() * 2000, now);
    filter.Q.value = 3;

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
  } catch {}
}

/** Start ambient hum — returns a stop function */
export function startAmbientHum(): () => void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 55; // Low A
    gain.gain.value = 0.03;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.2;
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain).connect(gain.gain);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    lfo.start();

    return () => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        setTimeout(() => {
          osc.stop();
          lfo.stop();
        }, 600);
      } catch {
        // Already stopped
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Procedural combat music — ambient drone that can be intensified.
 * Returns an object with setIntensity(0-1) and stop() methods.
 */
export function startCombatMusic(): { setIntensity: (v: number) => void; stop: () => void } {
  try {
    const ctx = getCtx();

    // Bass drone
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "sawtooth";
    bass.frequency.value = 40;
    bassGain.gain.value = 0.02;
    bass.connect(bassGain).connect(ctx.destination);
    bass.start();

    // Mid-range pulse
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    mid.type = "square";
    mid.frequency.value = 55;
    midGain.gain.value = 0;
    mid.connect(midGain).connect(ctx.destination);
    mid.start();

    // High tension
    const high = ctx.createOscillator();
    const highGain = ctx.createGain();
    high.type = "sine";
    high.frequency.value = 220;
    highGain.gain.value = 0;
    high.connect(highGain).connect(ctx.destination);
    high.start();

    // LFO on bass for pulsing
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.5;
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain).connect(bassGain.gain);
    lfo.start();

    return {
      setIntensity: (v: number) => {
        const t = ctx.currentTime + 0.1;
        // Scale layers based on intensity (0 = calm, 1 = full combat)
        bassGain.gain.linearRampToValueAtTime(0.02 + v * 0.03, t);
        midGain.gain.linearRampToValueAtTime(v * 0.015, t);
        highGain.gain.linearRampToValueAtTime(v * v * 0.01, t);
        lfo.frequency.linearRampToValueAtTime(0.5 + v * 3, t);
        bass.frequency.linearRampToValueAtTime(40 + v * 10, t);
      },
      stop: () => {
        try {
          const t = ctx.currentTime;
          bassGain.gain.linearRampToValueAtTime(0.001, t + 0.5);
          midGain.gain.linearRampToValueAtTime(0.001, t + 0.5);
          highGain.gain.linearRampToValueAtTime(0.001, t + 0.5);
          setTimeout(() => {
            bass.stop(); mid.stop(); high.stop(); lfo.stop();
          }, 600);
        } catch {}
      },
    };
  } catch {
    return { setIntensity: () => {}, stop: () => {} };
  }
}
