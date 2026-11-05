import type { LifeCityRecord, LifeMemory, LifeTownMemoriesData } from '@/types/life-town';
import { uid } from '@/lib/rpg';
import { isPresetCityId } from '@/lib/life-memories-data';

export const PRESET_HOME_CITY_ID = 'shenzhen';

export function newCustomCityId(): string {
  return `town-${uid()}`;
}

export function countMemoriesForCity(memories: LifeMemory[], cityId: string): number {
  return memories.filter(m => m.cityId === cityId).length;
}

/** 是否可进入该城市小镇（深圳/自定义始终可进；预设城市需 ≥1 条回忆） */
export function isCityAccessible(city: LifeCityRecord, memoryCount: number): boolean {
  if (city.id === PRESET_HOME_CITY_ID) return true;
  if (city.isCustom) return true;
  return memoryCount >= 1;
}

export function syncCityUnlocksFromMemories(data: LifeTownMemoriesData): LifeTownMemoriesData {
  const cities = data.cities.map(city => {
    const memoryCount = countMemoriesForCity(data.memories, city.id);

    if (city.isCustom) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        ...city,
        unlockedAt: city.unlockedAt ?? city.createdAt ?? today,
      };
    }

    if (city.id === PRESET_HOME_CITY_ID) {
      const today = new Date().toISOString().slice(0, 10);
      return { ...city, unlockedAt: city.unlockedAt ?? today };
    }

    if (memoryCount >= 1) {
      const firstDate =
        data.memories
          .filter(m => m.cityId === city.id)
          .sort((a, b) => a.date.localeCompare(b.date))[0]?.date ??
        new Date().toISOString().slice(0, 10);
      return { ...city, unlockedAt: firstDate };
    }

    return { ...city, unlockedAt: undefined };
  });

  let activeCityId = data.activeCityId;
  const active = cities.find(c => c.id === activeCityId);
  const activeMemCount = countMemoriesForCity(data.memories, activeCityId);
  if (active && !isCityAccessible(active, activeMemCount)) {
    activeCityId = PRESET_HOME_CITY_ID;
  }

  if (!cities.some(c => c.id === activeCityId)) {
    activeCityId = PRESET_HOME_CITY_ID;
  }

  return { ...data, cities, activeCityId };
}

export function sortCitiesForDisplay(cities: LifeCityRecord[]): LifeCityRecord[] {
  const presetOrder = ['shenzhen', 'beijing', 'shanghai'];
  return [...cities].sort((a, b) => {
    const ai = presetOrder.indexOf(a.id);
    const bi = presetOrder.indexOf(b.id);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.name.localeCompare(b.name);
  });
}

export function resolveCityDisplayName(cityId: string, cities: LifeCityRecord[]): string {
  return cities.find(c => c.id === cityId)?.name ?? cityId;
}

export function isCustomCity(city: LifeCityRecord): boolean {
  return !!city.isCustom || !isPresetCityId(city.id);
}
