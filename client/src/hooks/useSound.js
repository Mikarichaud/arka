import { useCallback } from 'react';
import useGameStore from '../store/gameStore';

let ctx = null;

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const soundDefs = {
  spin: (c) => {
    const buf = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.6;
    }
    const src = c.createBufferSource();
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.8;
    src.buffer = buf;
    src.connect(filter);
    filter.connect(c.destination);
    src.start();
  },

  stop: (c) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, c.currentTime + 0.35);
    gain.gain.setValueAtTime(0.35, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.45);
  },

  validate: (c) => {
    [660, 880].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const t = c.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  },

  refuse: (c) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(130, c.currentTime + 0.4);
    gain.gain.setValueAtTime(0.25, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.45);
  },

  timer: (c) => {
    [220, 185].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = c.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  },
};

export function useSound() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);

  const play = useCallback((name) => {
    if (!soundEnabled) return;
    try {
      const c = getCtx();
      if (!c) return;
      soundDefs[name]?.(c);
    } catch {
      // Fallback silencieux
    }
  }, [soundEnabled]);

  return { play };
}
