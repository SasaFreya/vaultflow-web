let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
) {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export function playQuestCompleteSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(880, t, 0.12, 'sine', 0.12);
  tone(1174.66, t + 0.08, 0.18, 'sine', 0.1);
}

export function playHabitCompleteSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(659.25, t, 0.1, 'triangle', 0.1);
  tone(783.99, t + 0.06, 0.14, 'triangle', 0.08);
}

export function playLevelUpSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    tone(freq, t + i * 0.12, 0.35, 'square', 0.08);
  });
  tone(1046.5, t + 0.55, 0.5, 'sine', 0.12);
}

export function playBossDefeatSound(enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  [392, 493.88, 587.33, 783.99].forEach((freq, i) => {
    tone(freq, t + i * 0.15, 0.4, 'sawtooth', 0.06);
  });
}

/** 切城云雾转场 — 轻柔 whoosh */
export function playCityTransitionWhoosh(enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(180, t, 0.35, 'sine', 0.06);
  tone(120, t + 0.08, 0.45, 'triangle', 0.05);
  tone(90, t + 0.2, 0.5, 'sine', 0.04);
}

const AMBIENT_KEY = 'vaultflow_city_ambient_enabled';
let ambientNodes: { osc: OscillatorNode; gain: GainNode }[] | null = null;
let ambientFadeTimer: ReturnType<typeof setTimeout> | null = null;

export function loadCityAmbientEnabled(): boolean {
  try {
    return localStorage.getItem(AMBIENT_KEY) !== '0';
  } catch {
    return true;
  }
}

export function saveCityAmbientEnabled(on: boolean): void {
  localStorage.setItem(AMBIENT_KEY, on ? '1' : '0');
}

export function stopCityAmbientLoop(): void {
  if (ambientFadeTimer) {
    clearTimeout(ambientFadeTimer);
    ambientFadeTimer = null;
  }
  if (!ambientNodes) return;
  const ctx = getCtx();
  if (!ctx) {
    ambientNodes = null;
    return;
  }
  const t = ctx.currentTime;
  for (const { osc, gain } of ambientNodes) {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.8);
    osc.stop(t + 0.85);
  }
  ambientNodes = null;
}

/** whoosh 后 3 秒环境音循环（可选）— 按城市音色 */
export function playCityAmbientLoop(
  enabled: boolean,
  soundEnabled: boolean,
  cityId?: string,
) {
  if (!enabled || !soundEnabled) return;
  stopCityAmbientLoop();
  const ctx = getCtx();
  if (!ctx) return;

  const profiles: Record<string, number[]> = {
    shenzhen: [98, 147, 196],
    beijing: [110, 165, 220],
    shanghai: [104, 156, 208],
  };
  const freqs = profiles[cityId ?? ''] ?? [110, 165, 220];

  ambientFadeTimer = setTimeout(() => {
    ambientFadeTimer = null;
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime;
    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];

    freqs.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.018 - i * 0.004, t + 1.2);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      nodes.push({ osc, gain });
    });

    ambientNodes = nodes;
  }, 400);
}
