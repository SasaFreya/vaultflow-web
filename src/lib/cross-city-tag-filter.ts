import type { LifeMemory } from '@/types/life-town';

export type CrossCityTagMode = 'and' | 'or';

export function parseCrossCityTags(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

export function parseCrossCityTagMode(raw: string | null): CrossCityTagMode {
  return raw === 'and' ? 'and' : 'or';
}

export function filterMemoriesByPersonTags(
  memories: LifeMemory[],
  tags: string[],
  mode: CrossCityTagMode,
): LifeMemory[] {
  if (tags.length === 0) return memories;
  const normalized = tags.map(t => t.trim()).filter(Boolean);
  if (normalized.length === 0) return memories;

  return memories.filter(m => {
    const memoryTags = m.tags.map(t => t.trim());
    if (mode === 'and') {
      return normalized.every(tag => memoryTags.includes(tag));
    }
    return normalized.some(tag => memoryTags.includes(tag));
  });
}
