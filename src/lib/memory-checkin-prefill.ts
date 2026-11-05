import type { BuildingType, MemoryMood } from '@/types/life-town';
import type { SceneHotspot } from '@/types/town';

const PREFILL_KEY = 'memory_draft_prefill';

const ACTION_MOOD: Record<string, MemoryMood> = {
  focus: 'calm',
  team: 'happy',
  social: 'happy',
  workout: 'excited',
  strength: 'excited',
  reading: 'calm',
  deepStudy: 'calm',
  buyCoffee: 'happy',
  relax: 'calm',
  journal: 'neutral',
  rest: 'calm',
};

function moodForAction(action: string): MemoryMood {
  return ACTION_MOOD[action] ?? 'neutral';
}

function tagsForCheckIn(buildingType: BuildingType, hotspot: SceneHotspot): string[] {
  const base = [`#${buildingType}`, hotspot.label];
  if (hotspot.action === 'team') base.push('协作');
  if (hotspot.action === 'reading' || hotspot.action === 'deepStudy') base.push('学习');
  if (hotspot.action === 'workout' || hotspot.action === 'strength') base.push('健身');
  return base;
}

export function buildCheckInMemoryPrefill(
  buildingType: BuildingType,
  placeName: string,
  hotspot: SceneHotspot,
  durationMin?: number,
): {
  buildingType: BuildingType;
  content: string;
  mood: MemoryMood;
  tags: string[];
  date: string;
  source: 'manual';
} {
  const story = hotspot.story ? `「${hotspot.story}」` : '';
  const duration = durationMin && durationMin > 0 ? ` · ${durationMin} 分钟` : '';
  return {
    buildingType,
    content: `在${placeName}${hotspot.label}${duration}。${story}`.trim(),
    mood: moodForAction(hotspot.action),
    tags: tagsForCheckIn(buildingType, hotspot),
    date: new Date().toISOString().slice(0, 10),
    source: 'manual',
  };
}

export function stashMemoryDraftPrefill(prefill: ReturnType<typeof buildCheckInMemoryPrefill>): void {
  sessionStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
}

export function openMemoryComposeWithPrefill(
  navigate: (path: string) => void,
  prefill: ReturnType<typeof buildCheckInMemoryPrefill>,
): void {
  stashMemoryDraftPrefill(prefill);
  navigate(`/town/loft?tab=memories&building=${prefill.buildingType}&compose=1`);
}
