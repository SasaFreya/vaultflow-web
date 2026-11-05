import { useMemo, useState } from 'react';
import type { LifeTownMemoriesData } from '@/types/life-town';
import type { RemoteSyncConfig } from '@/lib/life-memories-sync-remote';
import {
  mergeIncrementalFromRemoteSelected,
  previewIncrementalPull,
  markMemoriesSynced,
  type IncrementalPullItem,
  type IncrementalMergeChoice,
} from '@/lib/life-memories-incremental-sync';
import { applyRemoteBackupData } from '@/lib/life-memories-sync-remote';

interface EcoSyncPullPreviewPanelProps {
  local: LifeTownMemoriesData;
  remote: LifeTownMemoriesData;
  config: RemoteSyncConfig;
  exportedAt?: string;
  onMerged: () => void;
  onCancel: () => void;
}

function itemLabel(item: IncrementalPullItem): string {
  const m = item.memory;
  const title = m.content?.trim().slice(0, 40) || '无标题回忆';
  const kind = item.kind === 'new' ? '新增' : '更新';
  return `[${kind}] ${m.date} · ${title}`;
}

export default function EcoSyncPullPreviewPanel({
  local,
  remote,
  config,
  exportedAt,
  onMerged,
  onCancel,
}: EcoSyncPullPreviewPanelProps) {
  const items = useMemo(() => previewIncrementalPull(local, remote), [local, remote]);
  const [choices, setChoices] = useState<Map<string, IncrementalMergeChoice>>(() => {
    const m = new Map<string, IncrementalMergeChoice>();
    for (const item of items) {
      m.set(item.id, item.kind === 'new' ? 'remote' : 'remote');
    }
    return m;
  });
  const [busy, setBusy] = useState(false);

  const setChoice = (id: string, choice: IncrementalMergeChoice) => {
    setChoices(prev => new Map(prev).set(id, choice));
  };

  const remoteCount = [...choices.values()].filter(c => c === 'remote').length;

  const handleMerge = async () => {
    if (remoteCount === 0) return;
    setBusy(true);
    try {
      const { merged } = mergeIncrementalFromRemoteSelected(local, remote, choices);
      await applyRemoteBackupData(merged, config, exportedAt);
      markMemoriesSynced(merged);
      onMerged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-lg p-3 space-y-2 text-xs"
      style={{ background: 'rgba(129, 199, 132, 0.1)', border: '1px solid var(--rpg-border)' }}
    >
      <p className="font-semibold" style={{ color: 'var(--rpg-text)' }}>
        远程增量预览 · 共 {items.length} 条
      </p>
      <p className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
        每条可选：用远程 / 保留本地 / 跳过
      </p>
      <ul className="max-h-52 overflow-y-auto space-y-2">
        {items.map(item => {
          const choice = choices.get(item.id) ?? 'skip';
          return (
            <li key={item.id} className="space-y-1">
              <p style={{ color: 'var(--rpg-text)' }}>{itemLabel(item)}</p>
              {item.kind === 'updated' && item.localMemory && (
                <p className="text-[9px] pl-2 opacity-70" style={{ color: 'var(--rpg-text-secondary)' }}>
                  本地：{item.localMemory.content.slice(0, 36)}…
                </p>
              )}
              <div className="flex flex-wrap gap-1 pl-1">
                {(['remote', 'local', 'skip'] as IncrementalMergeChoice[]).map(c => (
                  <button
                    key={c}
                    type="button"
                    className="px-2 py-0.5 rounded text-[9px]"
                    style={{
                      background: choice === c ? 'var(--rpg-primary)' : 'var(--rpg-bg)',
                      color: choice === c ? '#fff' : 'var(--rpg-text)',
                      border: '1px solid var(--rpg-border)',
                    }}
                    onClick={() => setChoice(item.id, c)}
                  >
                    {c === 'remote' ? '用远程' : c === 'local' ? '保留本地' : '跳过'}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="season-report-btn text-[10px]"
          disabled={busy || remoteCount === 0}
          onClick={() => void handleMerge()}
        >
          {busy ? '合并中…' : `确认合并 ${remoteCount} 条远程`}
        </button>
        <button type="button" className="season-report-btn text-[10px]" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="season-report-btn text-[10px]"
          onClick={() => {
            const m = new Map<string, IncrementalMergeChoice>();
            items.forEach(i => m.set(i.id, 'remote'));
            setChoices(m);
          }}
        >
          全用远程
        </button>
      </div>
    </div>
  );
}
