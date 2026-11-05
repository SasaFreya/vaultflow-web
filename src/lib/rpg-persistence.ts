import type { LifeRPGData } from '@/types/rpg';
import { createDefaultRPGData } from '@/lib/rpg';
import { isElectron } from '@/lib/persistence';

const RPG_KEY = 'vaultflow_rpg';
const RPG_FILE = 'rpg-data.json';

function normalize(data: Partial<LifeRPGData>): LifeRPGData {
  const defaults = createDefaultRPGData();
  return {
    ...defaults,
    ...data,
    stats: { ...defaults.stats, ...(data.stats ?? {}) },
    quests: Array.isArray(data.quests)
      ? data.quests.map(q => ({ ...q, tasks: Array.isArray(q.tasks) ? q.tasks : [] }))
      : defaults.quests,
    habits: Array.isArray(data.habits) ? data.habits : defaults.habits,
    theme: data.theme ?? defaults.theme,
    soundEnabled: data.soundEnabled ?? defaults.soundEnabled,
    claimedBossIds: Array.isArray(data.claimedBossIds) ? data.claimedBossIds : [],
    selectedCharacterId: data.selectedCharacterId ?? defaults.selectedCharacterId,
  };
}

export async function loadRPGData(): Promise<LifeRPGData> {
  if (isElectron()) {
    try {
      const raw = await window.electronAPI!.readFile(RPG_FILE);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.error('Electron RPG load failed:', e);
    }
  }

  try {
    const stored = localStorage.getItem(RPG_KEY);
    if (stored) return normalize(JSON.parse(stored));
  } catch (e) {
    console.error('localStorage RPG load failed:', e);
  }

  const defaults = createDefaultRPGData();
  await saveRPGData(defaults);
  return defaults;
}

export async function saveRPGData(data: LifeRPGData): Promise<void> {
  const json = JSON.stringify(data);
  localStorage.setItem(RPG_KEY, json);

  if (isElectron()) {
    try {
      await window.electronAPI!.writeFile(RPG_FILE, json);
    } catch (e) {
      console.error('Electron RPG save failed:', e);
    }
  }
}
