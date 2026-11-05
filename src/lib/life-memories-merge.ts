import type { LifeCityRecord, LifeMemory, LifeTownMemoriesData } from '@/types/life-town';

export interface MergePreviewStats {
  localMemories: number;
  remoteMemories: number;
  mergedMemories: number;
  localOnly: number;
  remoteOnly: number;
  bothSides: number;
}

export interface MergeDiffItem {
  id: string;
  title: string;
  date: string;
  cityId: string;
}

export interface OverlapMemoryDiff {
  id: string;
  local: MergeDiffItem;
  remote: MergeDiffItem;
  defaultPick: 'local' | 'remote';
}

export interface MergeDiffDetail {
  localOnly: MergeDiffItem[];
  remoteOnly: MergeDiffItem[];
  overlapping: MergeDiffItem[];
  overlapPairs: OverlapMemoryDiff[];
}

export function computeOverlapPairs(
  local: LifeTownMemoriesData,
  remote: LifeTownMemoriesData,
): OverlapMemoryDiff[] {
  const remoteById = new Map(remote.memories.map(m => [m.id, m]));
  const pairs: OverlapMemoryDiff[] = [];
  for (const m of local.memories) {
    const r = remoteById.get(m.id);
    if (!r) continue;
    const lItem = toDiffItem(m);
    const rItem = toDiffItem(r);
    pairs.push({
      id: m.id,
      local: lItem,
      remote: rItem,
      defaultPick: m.createdAt >= r.createdAt ? 'local' : 'remote',
    });
  }
  return pairs;
}

function memoryTitle(m: LifeMemory): string {
  const line = m.content.trim().split('\n')[0] ?? '';
  return line.length > 48 ? `${line.slice(0, 47)}…` : line || '（无标题）';
}

function toDiffItem(m: LifeMemory): MergeDiffItem {
  return { id: m.id, title: memoryTitle(m), date: m.date, cityId: m.cityId };
}

export function computeMergeDiff(local: LifeTownMemoriesData, remote: LifeTownMemoriesData): MergeDiffDetail {
  const remoteById = new Map(remote.memories.map(m => [m.id, m]));
  const localById = new Map(local.memories.map(m => [m.id, m]));

  const localOnly: MergeDiffItem[] = [];
  const remoteOnly: MergeDiffItem[] = [];
  const overlapping: MergeDiffItem[] = [];

  for (const m of local.memories) {
    if (remoteById.has(m.id)) overlapping.push(toDiffItem(m));
    else localOnly.push(toDiffItem(m));
  }
  for (const m of remote.memories) {
    if (!localById.has(m.id)) remoteOnly.push(toDiffItem(m));
  }

  return { localOnly, remoteOnly, overlapping, overlapPairs: computeOverlapPairs(local, remote) };
}

export interface MergeSelection {
  localOnlyIds: Set<string>;
  remoteOnlyIds: Set<string>;
  overlapPick: Map<string, 'local' | 'remote'>;
}

export function defaultMergeSelection(diff: MergeDiffDetail): MergeSelection {
  return {
    localOnlyIds: new Set(diff.localOnly.map(m => m.id)),
    remoteOnlyIds: new Set(diff.remoteOnly.map(m => m.id)),
    overlapPick: new Map(diff.overlapPairs.map(p => [p.id, p.defaultPick])),
  };
}

export function mergeLifeMemoriesData(
  local: LifeTownMemoriesData,
  remote: LifeTownMemoriesData,
  selection?: MergeSelection,
): LifeTownMemoriesData {
  const diff = computeMergeDiff(local, remote);
  const sel = selection ?? defaultMergeSelection(diff);
  const memoryById = new Map<string, LifeMemory>();

  const remoteById = new Map(remote.memories.map(m => [m.id, m]));
  const localById = new Map(local.memories.map(m => [m.id, m]));

  for (const pair of diff.overlapPairs) {
    const pick = sel.overlapPick.get(pair.id) ?? pair.defaultPick;
    const m = pick === 'local' ? localById.get(pair.id) : remoteById.get(pair.id);
    if (m) memoryById.set(pair.id, m);
  }
  for (const id of sel.localOnlyIds) {
    const m = localById.get(id);
    if (m) memoryById.set(id, m);
  }
  for (const id of sel.remoteOnlyIds) {
    const m = remoteById.get(id);
    if (m) memoryById.set(id, m);
  }

  const cityById = new Map<string, LifeCityRecord>();
  for (const c of remote.cities) cityById.set(c.id, c);
  for (const c of local.cities) {
    const prev = cityById.get(c.id);
    cityById.set(c.id, prev ? { ...prev, ...c } : c);
  }

  const memories = [...memoryById.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );

  const hasPersonConfig =
    local.personTagConfig || remote.personTagConfig;

  return {
    version: 1,
    activeCityId: local.activeCityId || remote.activeCityId,
    cities: [...cityById.values()],
    memories,
    personTagConfig: hasPersonConfig
      ? {
          customTags: [
            ...new Set([
              ...(remote.personTagConfig?.customTags ?? []),
              ...(local.personTagConfig?.customTags ?? []),
            ]),
          ],
          excludedTags: [
            ...new Set([
              ...(remote.personTagConfig?.excludedTags ?? []),
              ...(local.personTagConfig?.excludedTags ?? []),
            ]),
          ],
        }
      : undefined,
  };
}

export function computeMergePreview(
  local: LifeTownMemoriesData,
  remote: LifeTownMemoriesData,
  selection?: MergeSelection,
): MergePreviewStats {
  const diff = computeMergeDiff(local, remote);
  const merged = mergeLifeMemoriesData(local, remote, selection);
  return {
    localMemories: local.memories.length,
    remoteMemories: remote.memories.length,
    mergedMemories: merged.memories.length,
    localOnly: diff.localOnly.length,
    remoteOnly: diff.remoteOnly.length,
    bothSides: diff.overlapping.length,
  };
}
