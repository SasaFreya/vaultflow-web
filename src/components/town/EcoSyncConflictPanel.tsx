import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, GitMerge } from 'lucide-react';
import type { LifeTownMemoriesData } from '@/types/life-town';
import {
  pullRemoteEnvelope,
  applyRemoteBackupData,
  pushRemoteBackup,
  clearSyncConflict,
  type RemoteSyncConfig,
  type SyncConflictInfo,
} from '@/lib/life-memories-sync-remote';
import {
  mergeLifeMemoriesData,
  computeMergePreview,
  computeMergeDiff,
  defaultMergeSelection,
  type MergeSelection,
} from '@/lib/life-memories-merge';
import { saveLifeMemoriesData } from '@/lib/life-memories-persistence';

interface EcoSyncConflictPanelProps {
  local: LifeTownMemoriesData;
  config: RemoteSyncConfig;
  conflict: SyncConflictInfo;
  onResolved: () => void;
}

function DiffList({
  title,
  items,
  selected,
  onToggle,
  onToggleAll,
  accent,
}: {
  title: string;
  items: Array<{ id: string; title: string; date: string }>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (on: boolean) => void;
  accent: string;
}) {
  if (items.length === 0) return null;
  const allOn = items.every(m => selected.has(m.id));
  return (
    <div className="rounded-lg p-2 text-[10px]" style={{ background: 'var(--rpg-bg)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: accent }}>{title} ({items.length})</span>
        <button type="button" className="underline opacity-80" onClick={() => onToggleAll(!allOn)}>
          {allOn ? '全不选' : '全选'}
        </button>
      </div>
      <ul className="space-y-1 max-h-28 overflow-y-auto">
        {items.map(m => (
          <li key={m.id} className="flex items-start gap-1.5">
            <input
              type="checkbox"
              checked={selected.has(m.id)}
              onChange={() => onToggle(m.id)}
              className="mt-0.5"
            />
            <span>
              <span className="opacity-70">{m.date}</span> · {m.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EcoSyncConflictPanel({
  local,
  config,
  conflict,
  onResolved,
}: EcoSyncConflictPanelProps) {
  const [remote, setRemote] = useState<LifeTownMemoriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showDiff, setShowDiff] = useState(true);
  const [selection, setSelection] = useState<MergeSelection | null>(null);

  useEffect(() => {
    let cancelled = false;
    void pullRemoteEnvelope(config)
      .then(env => {
        if (cancelled) return;
        const data = env?.data ?? null;
        setRemote(data);
        if (data) {
          const diff = computeMergeDiff(local, data);
          setSelection(defaultMergeSelection(diff));
        }
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : '拉取远程失败');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [config, local]);

  const diff = useMemo(
    () => (remote ? computeMergeDiff(local, remote) : null),
    [local, remote],
  );

  const preview = remote && selection
    ? computeMergePreview(local, remote, selection)
    : null;

  const merged = remote && selection
    ? mergeLifeMemoriesData(local, remote, selection)
    : null;

  const toggleLocal = (id: string) => {
    if (!selection) return;
    const next = new Set(selection.localOnlyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection({ ...selection, localOnlyIds: next });
  };

  const toggleRemote = (id: string) => {
    if (!selection) return;
    const next = new Set(selection.remoteOnlyIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection({ ...selection, remoteOnlyIds: next });
  };

  const toggleOverlap = (id: string, pick: 'local' | 'remote') => {
    if (!selection) return;
    const next = new Map(selection.overlapPick);
    next.set(id, pick);
    setSelection({ ...selection, overlapPick: next });
  };

  const applyLocal = async () => {
    await pushRemoteBackup(local, config, true);
    clearSyncConflict();
    onResolved();
  };

  const applyRemote = async () => {
    if (!remote) return;
    await applyRemoteBackupData(remote, config, conflict.remoteExportedAt);
    onResolved();
  };

  const applyMerge = async () => {
    if (!merged) return;
    await saveLifeMemoriesData(merged);
    await pushRemoteBackup(merged, { ...config, enabled: true }, true);
    onResolved();
  };

  return (
    <div
      className="rounded-xl p-3 space-y-3 eco-sync-conflict"
      style={{ background: 'rgba(255, 152, 0, 0.08)', border: '1px solid rgba(255, 152, 0, 0.35)' }}
    >
      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#E65100' }}>
        <GitMerge className="w-4 h-4" />
        同步冲突 · 三路对比
      </div>
      <p className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>{conflict.message}</p>
      {loading && <p className="text-[10px]">正在拉取远程备份…</p>}
      {err && <p className="text-[10px]" style={{ color: '#C62828' }}>{err}</p>}
      {preview && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg p-2 text-[10px]" style={{ background: 'var(--rpg-bg)' }}>
            <div className="font-semibold mb-1">本机</div>
            <div className="text-lg font-bold" style={{ color: 'var(--rpg-primary)' }}>{preview.localMemories}</div>
            <div className="opacity-70">条回忆</div>
            <div className="mt-1 opacity-70">独有 {preview.localOnly}</div>
          </div>
          <div className="rounded-lg p-2 text-[10px]" style={{ background: 'var(--rpg-bg)' }}>
            <div className="font-semibold mb-1">远程</div>
            <div className="text-lg font-bold" style={{ color: '#7B1FA2' }}>{preview.remoteMemories}</div>
            <div className="opacity-70">条回忆</div>
            <div className="mt-1 opacity-70">独有 {preview.remoteOnly}</div>
          </div>
          <div className="rounded-lg p-2 text-[10px]" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
            <div className="font-semibold mb-1">合并预览</div>
            <div className="text-lg font-bold" style={{ color: '#2E7D32' }}>{preview.mergedMemories}</div>
            <div className="opacity-70">条回忆</div>
            <div className="mt-1 opacity-70">重叠 {preview.bothSides}</div>
          </div>
        </div>
      )}

      {diff && selection && (
        <div className="space-y-2">
          <button
            type="button"
            className="flex items-center gap-1 text-[10px] font-medium"
            style={{ color: 'var(--rpg-text)' }}
            onClick={() => setShowDiff(v => !v)}
          >
            {showDiff ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            独有回忆明细（可勾选参与合并）
          </button>
          {showDiff && (
            <div className="space-y-2">
              <DiffList
                title="仅本机"
                items={diff.localOnly}
                selected={selection.localOnlyIds}
                onToggle={toggleLocal}
                onToggleAll={on => setSelection({
                  ...selection,
                  localOnlyIds: on ? new Set(diff.localOnly.map(m => m.id)) : new Set(),
                })}
                accent="var(--rpg-primary)"
              />
              <DiffList
                title="仅远程"
                items={diff.remoteOnly}
                selected={selection.remoteOnlyIds}
                onToggle={toggleRemote}
                onToggleAll={on => setSelection({
                  ...selection,
                  remoteOnlyIds: on ? new Set(diff.remoteOnly.map(m => m.id)) : new Set(),
                })}
                accent="#7B1FA2"
              />
              {diff.overlapPairs.length > 0 && (
                <div className="rounded-lg p-2 text-[10px] space-y-2" style={{ background: 'var(--rpg-bg)' }}>
                  <div className="font-semibold">重叠回忆 · 选择保留版本</div>
                  {diff.overlapPairs.map(pair => {
                    const pick = selection.overlapPick.get(pair.id) ?? pair.defaultPick;
                    return (
                      <div key={pair.id} className="grid grid-cols-2 gap-2 border-t pt-1.5" style={{ borderColor: 'var(--rpg-border)' }}>
                        <button
                          type="button"
                          className={`text-left p-1.5 rounded ${pick === 'local' ? 'ring-1 ring-[var(--rpg-primary)]' : ''}`}
                          onClick={() => toggleOverlap(pair.id, 'local')}
                        >
                          <span className="opacity-70">本机</span>
                          <div>{pair.local.title}</div>
                          <div className="opacity-60">{pair.local.date}</div>
                        </button>
                        <button
                          type="button"
                          className={`text-left p-1.5 rounded ${pick === 'remote' ? 'ring-1 ring-[#7B1FA2]' : ''}`}
                          onClick={() => toggleOverlap(pair.id, 'remote')}
                        >
                          <span className="opacity-70">远程</span>
                          <div>{pair.remote.title}</div>
                          <div className="opacity-60">{pair.remote.date}</div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {diff.overlapping.length > 0 && diff.overlapPairs.length === 0 && (
                <p className="text-[10px] opacity-70">
                  重叠 {diff.overlapping.length} 条将自动保留较新版本
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="season-report-btn" onClick={() => void applyLocal()}>
          用本机覆盖远程
        </button>
        <button
          type="button"
          className="season-report-btn"
          disabled={!remote}
          onClick={() => void applyRemote()}
        >
          用远程覆盖本机
        </button>
        <button
          type="button"
          className="season-report-btn"
          disabled={!merged}
          onClick={() => void applyMerge()}
        >
          应用勾选合并 ({preview?.mergedMemories ?? 0} 条)
        </button>
      </div>
    </div>
  );
}
