import type {
  BuildingType,
  LifeCityId,
  LifeCityRecord,
  LifeMemory,
  LifeTownMemoriesData,
  MemoryMood,
  PresetCityId,
} from '@/types/life-town';
import { uid } from '@/lib/rpg';

export const BUILDING_TYPES: BuildingType[] = ['home', 'company', 'library', 'gym', 'cafe'];

export const BUILDING_META: Record<
  BuildingType,
  { label: string; icon: string; expPerVisit: number }
> = {
  home: { label: '小窝', icon: '🏠', expPerVisit: 5 },
  company: { label: '公司', icon: '🏢', expPerVisit: 8 },
  library: { label: '图书馆', icon: '📚', expPerVisit: 12 },
  gym: { label: '健身房', icon: '💪', expPerVisit: 10 },
  cafe: { label: '咖啡厅', icon: '☕', expPerVisit: 8 },
};

export const LIFE_CITY_DEFS: Array<{ id: PresetCityId; name: string }> = [
  { id: 'shenzhen', name: '深圳' },
  { id: 'beijing', name: '北京' },
  { id: 'shanghai', name: '上海' },
];

const PRESET_IDS = new Set<string>(LIFE_CITY_DEFS.map(c => c.id));

export function isPresetCityId(id: string): id is PresetCityId {
  return PRESET_IDS.has(id);
}

export const MOOD_OPTIONS: Array<{ value: MemoryMood; label: string; emoji: string }> = [
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'calm', label: '平静', emoji: '😌' },
  { value: 'excited', label: '兴奋', emoji: '🤩' },
  { value: 'tired', label: '疲惫', emoji: '😴' },
  { value: 'neutral', label: '一般', emoji: '😐' },
];

function emptyBuildings(): LifeCityRecord['buildings'] {
  return {
    home: { level: 1, visitCount: 0 },
    company: { level: 1, visitCount: 0 },
    library: { level: 1, visitCount: 0 },
    gym: { level: 1, visitCount: 0 },
    cafe: { level: 1, visitCount: 0 },
  };
}

export function createDefaultCity(
  id: LifeCityId,
  name: string,
  unlocked = id === 'shenzhen',
  isCustom = false,
): LifeCityRecord {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id,
    name,
    isCustom,
    createdAt: isCustom ? today : undefined,
    unlockedAt: unlocked ? today : undefined,
    stats: {
      memoryCount: 0,
      totalExp: 0,
      currentMood: 'neutral',
    },
    buildings: emptyBuildings(),
  };
}

export function createDefaultLifeMemoriesData(): LifeTownMemoriesData {
  return {
    version: 1,
    activeCityId: 'shenzhen',
    cities: LIFE_CITY_DEFS.map(c => createDefaultCity(c.id, c.name, c.id === 'shenzhen')),
    memories: [],
  };
}

export function buildingLevelFromVisits(visitCount: number): number {
  return Math.max(1, Math.floor(visitCount / 5) + 1);
}

export function applyMemoryToCity(
  city: LifeCityRecord,
  memory: Pick<LifeMemory, 'buildingType' | 'mood' | 'date'>,
): LifeCityRecord {
  const exp = BUILDING_META[memory.buildingType].expPerVisit;
  const building = city.buildings[memory.buildingType];
  const visitCount = building.visitCount + 1;

  return {
    ...city,
    unlockedAt: city.unlockedAt ?? memory.date,
    stats: {
      memoryCount: city.stats.memoryCount + 1,
      totalExp: city.stats.totalExp + exp,
      currentMood: memory.mood ?? city.stats.currentMood,
      lastVisit: memory.date,
    },
    buildings: {
      ...city.buildings,
      [memory.buildingType]: {
        level: buildingLevelFromVisits(visitCount),
        visitCount,
      },
    },
  };
}

export function newMemoryId(): string {
  return `mem-${uid()}`;
}

export function normalizeCityRecord(raw: Partial<LifeCityRecord>, fallbackName: string): LifeCityRecord {
  const base = createDefaultCity(raw.id ?? `town-${uid()}`, raw.name ?? fallbackName, !!raw.unlockedAt, !!raw.isCustom);
  return {
    ...base,
    ...raw,
    isCustom: raw.isCustom ?? !isPresetCityId(raw.id ?? ''),
    buildings: { ...base.buildings, ...raw.buildings },
    stats: { ...base.stats, ...raw.stats },
    hubLayout: raw.hubLayout,
    exploreLayout: raw.exploreLayout,
    exploreNames: raw.exploreNames,
    domainGoals: raw.domainGoals,
    domainGoalStreakMonths: raw.domainGoalStreakMonths,
    lastGoalMonthMet: raw.lastGoalMonthMet,
    lastStreakRewardMonth: raw.lastStreakRewardMonth,
  };
}
