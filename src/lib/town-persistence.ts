import type { TownData } from '@/types/town';
import { createDefaultTownData } from '@/lib/town-data';
import { isElectron } from '@/lib/persistence';

const TOWN_KEY = 'vaultflow_town';
const TOWN_FILE = 'town-data.json';

function normalize(data: Partial<TownData>): TownData {
  const defaults = createDefaultTownData();
  const rooms = defaults.rooms.map(dr => {
    const saved = data.rooms?.find(r => r.id === dr.id);
    return saved
      ? { ...dr, ...saved, furniture: saved.furniture ?? [] }
      : dr;
  });

  return {
    ...defaults,
    ...data,
    locations: data.locations?.length
      ? defaults.locations.map(dl => {
          const saved = data.locations!.find(l => l.id === dl.id);
          return saved ? { ...dl, ...saved } : dl;
        })
      : defaults.locations,
    rooms,
    inventory: Array.isArray(data.inventory) ? data.inventory : [],
    vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
    visitLog: data.visitLog ?? {},
    checkIns: Array.isArray(data.checkIns) ? data.checkIns : [],
  };
}

export async function loadTownData(): Promise<TownData> {
  if (isElectron()) {
    try {
      const raw = await window.electronAPI!.readFile(TOWN_FILE);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.error('Electron town load failed:', e);
    }
  }

  try {
    const stored = localStorage.getItem(TOWN_KEY);
    if (stored) return normalize(JSON.parse(stored));
  } catch (e) {
    console.error('localStorage town load failed:', e);
  }

  const defaults = createDefaultTownData();
  await saveTownData(defaults);
  return defaults;
}

export async function saveTownData(data: TownData): Promise<void> {
  const json = JSON.stringify(data);
  localStorage.setItem(TOWN_KEY, json);

  if (isElectron()) {
    try {
      await window.electronAPI!.writeFile(TOWN_FILE, json);
    } catch (e) {
      console.error('Electron town save failed:', e);
    }
  }
}
