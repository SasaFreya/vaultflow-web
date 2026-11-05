import type { BuildingType } from '@/types/life-town';
import type { HubBuildingId } from '@/lib/town-hub-buildings';

let ambientTimer: ReturnType<typeof setInterval> | null = null;
let ambientCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ambientCtx) {
    try {
      ambientCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ambientCtx.state === 'suspended') void ambientCtx.resume();
  return ambientCtx;
}

function playTone(freq: number, duration: number, gain = 0.04, type: OscillatorType = 'sine') {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

const EXPLORE_AMBIENT: Record<BuildingType, () => void> = {
  gym: () => {
    playTone(62, 0.35, 0.05, 'triangle');
    playTone(48, 0.5, 0.03, 'sine');
  },
  library: () => {
    playTone(220, 0.08, 0.025, 'sine');
    playTone(196, 0.1, 0.02, 'sine');
  },
  home: () => playTone(330, 0.4, 0.03, 'sine'),
  company: () => playTone(180, 0.15, 0.025, 'square'),
  cafe: () => {
    playTone(400, 0.06, 0.02, 'sine');
    playTone(520, 0.05, 0.015, 'sine');
  },
};

const HUB_AMBIENT: Partial<Record<HubBuildingId, () => void>> = {
  bank: () => playTone(140, 0.2, 0.03, 'triangle'),
  wishTree: () => playTone(523, 0.25, 0.03, 'sine'),
  house: () => playTone(294, 0.35, 0.03, 'sine'),
  clockTower: () => playTone(880, 0.12, 0.025, 'sine'),
  shop: () => playTone(360, 0.1, 0.02, 'square'),
};

export function startMicroSceneAmbient(
  kind: 'explore',
  id: BuildingType,
  enabled: boolean,
): void;
export function startMicroSceneAmbient(
  kind: 'hub',
  id: HubBuildingId,
  enabled: boolean,
): void;
export function startMicroSceneAmbient(
  kind: 'explore' | 'hub',
  id: BuildingType | HubBuildingId,
  enabled: boolean,
): void {
  stopMicroSceneAmbient();
  if (!enabled) return;
  const tick =
    kind === 'explore'
      ? EXPLORE_AMBIENT[id as BuildingType]
      : HUB_AMBIENT[id as HubBuildingId];
  if (!tick) return;
  tick();
  ambientTimer = setInterval(tick, id === 'gym' ? 2800 : 4200);
}

export function stopMicroSceneAmbient(): void {
  if (ambientTimer) {
    clearInterval(ambientTimer);
    ambientTimer = null;
  }
}
