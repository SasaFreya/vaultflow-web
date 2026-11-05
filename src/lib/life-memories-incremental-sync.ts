import type { LifeMemory, LifeTownMemoriesData } from '@/types/life-town';
import type { LifeMemoriesBackupEnvelope } from '@/lib/life-memories-sync';

const SYNC_STATE_KEY = 'vaultflow_eco_sync_memory_hashes';

type MemoryHashMap = Record<string, string>;

function memoryFingerprint(m: LifeMemory): string {
  return `${m.createdAt}|${m.date}|${m.content}|${m.buildingType}|${(m.tags ?? []).join(',')}`;
}

function loadHashes(): MemoryHashMap {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    return raw ? (JSON.parse(raw) as MemoryHashMap) : {};
  } catch {
    return {};
  }
}

function saveHashes(map: MemoryHashMap): void {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(map));
}

export function snapshotMemoryHashes(data: LifeTownMemoriesData): MemoryHashMap {
  const map: MemoryHashMap = {};
  for (const m of data.memories) {
    map[m.id] = memoryFingerprint(m);
  }
  return map;
}

export function getChangedMemories(
  data: LifeTownMemoriesData,
  prevHashes: MemoryHashMap,
): LifeMemory[] {
  const changed: LifeMemory[] = [];
  const seen = new Set<string>();

  for (const m of data.memories) {
    seen.add(m.id);
    if (prevHashes[m.id] !== memoryFingerprint(m)) {
      changed.push(m);
    }
  }

  const deletedIds = Object.keys(prevHashes).filter(id => !seen.has(id));
  if (deletedIds.length > 0 || changed.length > 0) {
    return changed;
  }
  return [];
}

export function getDeletedMemoryIds(data: LifeTownMemoriesData, prevHashes: MemoryHashMap): string[] {
  const ids = new Set(data.memories.map(m => m.id));
  return Object.keys(prevHashes).filter(id => !ids.has(id));
}

/** 将本地变更合并进远程数据（WebDAV 增量策略） */
export function mergeIncrementalIntoRemote(
  local: LifeTownMemoriesData,
  remote: LifeTownMemoriesData | null,
  prevHashes: MemoryHashMap,
): { merged: LifeTownMemoriesData; changedCount: number; deletedCount: number } {
  const base = remote ?? local;
  const changed = getChangedMemories(local, prevHashes);
  const deletedIds = new Set(getDeletedMemoryIds(local, prevHashes));

  const memoryMap = new Map(base.memories.map(m => [m.id, m]));
  for (const m of changed) {
    memoryMap.set(m.id, m);
  }
  for (const id of deletedIds) {
    memoryMap.delete(id);
  }

  const localCityIds = new Set(local.cities.map(c => c.id));
  const cities = [
    ...base.cities.filter(c => localCityIds.has(c.id)),
    ...local.cities.filter(c => !base.cities.some(b => b.id === c.id)),
  ];

  const merged: LifeTownMemoriesData = {
    ...local,
    cities: cities.length > 0 ? cities : local.cities,
    memories: [...memoryMap.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    ),
    personTagConfig: local.personTagConfig ?? base.personTagConfig,
    activeCityId: local.activeCityId,
  };

  return { merged, changedCount: changed.length, deletedCount: deletedIds.size };
}

export function mergeIncrementalFromRemote(
  local: LifeTownMemoriesData,
  remote: LifeTownMemoriesData,
): { merged: LifeTownMemoriesData; importedCount: number; updatedCount: number } {
  const localHashes = snapshotMemoryHashes(local);
  const memoryMap = new Map(local.memories.map(m => [m.id, m]));
  let importedCount = 0;
  let updatedCount = 0;

  for (const rm of remote.memories) {
    const fp = memoryFingerprint(rm);
    const existing = memoryMap.get(rm.id);
    if (!existing) {
      memoryMap.set(rm.id, rm);
      importedCount += 1;
      continue;
    }
    if (localHashes[rm.id] === fp) continue;
    if (rm.createdAt >= existing.createdAt) {
      memoryMap.set(rm.id, rm);
      updatedCount += 1;
    }
  }

  const remoteCityIds = new Set(remote.cities.map(c => c.id));
  const cities = [
    ...local.cities.filter(c => !remoteCityIds.has(c.id)),
    ...remote.cities.map(rc => {
      const lc = local.cities.find(c => c.id === rc.id);
      return lc ? { ...lc, ...rc, exploreLayout: lc.exploreLayout ?? rc.exploreLayout } : rc;
    }),
  ];

  const merged: LifeTownMemoriesData = {
    ...local,
    cities: cities.length > 0 ? cities : local.cities,
    memories: [...memoryMap.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    ),
    personTagConfig: remote.personTagConfig ?? local.personTagConfig,
    activeCityId: local.activeCityId,
  };

  return { merged, importedCount, updatedCount };
}

export type IncrementalMergeChoice = 'remote' | 'local' | 'skip';

export type IncrementalPullItem = {
  id: string;
  kind: 'new' | 'updated';
  memory: LifeTownMemoriesData['memories'][number];
  localDate?: string;
  localMemory?: LifeTownMemoriesData['memories'][number];
};

/** 拉取前预览远程增量 — 不写入本地 */
export function previewIncrementalPull(
  local: LifeTownMemoriesData,
  remote: LifeTownMemoriesData,
): IncrementalPullItem[] {
  const localHashes = snapshotMemoryHashes(local);
  const items: IncrementalPullItem[] = [];

  for (const rm of remote.memories) {
    const fp = memoryFingerprint(rm);
    const existing = local.memories.find(m => m.id === rm.id);
    if (!existing) {
      items.push({ id: rm.id, kind: 'new', memory: rm });
      continue;
    }
    if (localHashes[rm.id] === fp) continue;
    if (rm.createdAt >= existing.createdAt) {
      items.push({
        id: rm.id,
        kind: 'updated',
        memory: rm,
        localDate: existing.date,
        localMemory: existing,
      });
    }
  }

  return items.sort((a, b) => b.memory.date.localeCompare(a.memory.date));
}

export function mergeIncrementalFromRemoteSelected(
  local: LifeTownMemoriesData,
  remote: LifeTownMemoriesData,
  choices: Map<string, IncrementalMergeChoice>,
): { merged: LifeTownMemoriesData; importedCount: number; updatedCount: number } {
  const memoryMap = new Map(local.memories.map(m => [m.id, m]));
  let importedCount = 0;
  let updatedCount = 0;

  for (const [id, choice] of choices) {
    if (choice === 'skip') continue;
    const rm = remote.memories.find(m => m.id === id);
    if (!rm) continue;
    if (choice === 'remote') {
      const existed = memoryMap.has(id);
      memoryMap.set(id, rm);
      if (existed) updatedCount += 1;
      else importedCount += 1;
    }
  }

  const remoteCityIds = new Set(remote.cities.map(c => c.id));
  const cities = [
    ...local.cities.filter(c => !remoteCityIds.has(c.id)),
    ...remote.cities.map(rc => {
      const lc = local.cities.find(c => c.id === rc.id);
      return lc ? { ...lc, ...rc, exploreLayout: lc.exploreLayout ?? rc.exploreLayout } : rc;
    }),
  ];

  const merged: LifeTownMemoriesData = {
    ...local,
    cities: cities.length > 0 ? cities : local.cities,
    memories: [...memoryMap.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    ),
    personTagConfig: remote.personTagConfig ?? local.personTagConfig,
    activeCityId: local.activeCityId,
  };

  return { merged, importedCount, updatedCount };
}

export function markMemoriesSynced(data: LifeTownMemoriesData): void {
  saveHashes(snapshotMemoryHashes(data));
}

export function buildIncrementalEnvelope(
  data: LifeTownMemoriesData,
  device: string,
): LifeMemoriesBackupEnvelope & { delta?: { changedIds: string[]; deletedIds: string[] } } {
  const prev = loadHashes();
  const changed = getChangedMemories(data, prev);
  const deletedIds = getDeletedMemoryIds(data, prev);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    device,
    data,
    delta: {
      changedIds: changed.map(m => m.id),
      deletedIds,
    },
  };
}

export function loadSyncedMemoryHashes(): MemoryHashMap {
  return loadHashes();
}
