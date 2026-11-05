import type { LifeTownMemoriesData, LifeCityId } from '@/types/life-town';
import {
  createDefaultLifeMemoriesData,
  createDefaultCity,
  LIFE_CITY_DEFS,
  normalizeCityRecord,
  isPresetCityId,
} from '@/lib/life-memories-data';
import { syncCityUnlocksFromMemories } from '@/lib/life-city-unlock';
import { isElectron } from '@/lib/persistence';

const STORAGE_KEY = 'vaultflow_life_memories';
const FILE_NAME = 'life-memories.json';

function normalize(raw: Partial<LifeTownMemoriesData>): LifeTownMemoriesData {
  const defaults = createDefaultLifeMemoriesData();
  const rawCities = raw.cities ?? [];

  const presetCities = LIFE_CITY_DEFS.map(def => {
    const saved = rawCities.find(c => c.id === def.id);
    return saved
      ? normalizeCityRecord({ ...saved, id: def.id, isCustom: false }, def.name)
      : createDefaultCity(def.id, def.name, def.id === 'shenzhen');
  });

  const customCities = rawCities
    .filter(c => c.id && !isPresetCityId(c.id))
    .map(c => normalizeCityRecord({ ...c, isCustom: true }, c.name ?? '我的小镇'));

  const cities = [...presetCities, ...customCities];
  const activeCityId = (raw.activeCityId ?? defaults.activeCityId) as LifeCityId;
  const memories = Array.isArray(raw.memories) ? raw.memories : [];

  const personTagConfig = raw.personTagConfig
    ? {
        customTags: Array.isArray(raw.personTagConfig.customTags) ? raw.personTagConfig.customTags : [],
        excludedTags: Array.isArray(raw.personTagConfig.excludedTags) ? raw.personTagConfig.excludedTags : [],
      }
    : undefined;

  const merged: LifeTownMemoriesData = {
    version: 1,
    activeCityId: cities.some(c => c.id === activeCityId) ? activeCityId : 'shenzhen',
    cities,
    memories,
    personTagConfig,
  };

  return syncCityUnlocksFromMemories(merged);
}

export async function loadLifeMemoriesData(): Promise<LifeTownMemoriesData> {
  if (isElectron()) {
    try {
      const raw = await window.electronAPI!.readFile(FILE_NAME);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.error('Electron life memories load failed:', e);
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalize(JSON.parse(stored));
  } catch (e) {
    console.error('localStorage life memories load failed:', e);
  }

  const defaults = createDefaultLifeMemoriesData();
  await saveLifeMemoriesData(defaults);
  return defaults;
}

export async function saveLifeMemoriesData(data: LifeTownMemoriesData): Promise<void> {
  const json = JSON.stringify(data);
  localStorage.setItem(STORAGE_KEY, json);

  if (isElectron()) {
    try {
      await window.electronAPI!.writeFile(FILE_NAME, json);
    } catch (e) {
      console.error('Electron life memories save failed:', e);
    }
  }
}
