import { useState } from 'react';
import type { LifeMemory } from '@/types/life-town';
import { useLifeMemories } from '@/hooks/useLifeMemories';

const DOMAIN_LABEL: Record<string, string> = {
  home: '小窝',
  company: '公司',
  library: '图书馆',
  gym: '健身房',
  cafe: '咖啡馆',
};

interface ExploreHeatDrillPanelProps {
  locationId: string;
  memories: LifeMemory[];
  onClose: () => void;
  onOpenScene?: () => void;
}

/** 热力区块钻取 — 本周回忆列表 + 内联编辑 */
export default function ExploreHeatDrillPanel({
  locationId,
  memories,
  onClose,
  onOpenScene,
}: ExploreHeatDrillPanelProps) {
  const { updateMemoryContent } = useLifeMemories();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const label = DOMAIN_LABEL[locationId] ?? locationId;
  const weekMs = 7 * 24 * 60 * 60_000;
  const cutoff = Date.now() - weekMs;
  const weekMemories = memories.filter(m => new Date(m.date).getTime() >= cutoff);

  const startEdit = (m: LifeMemory) => {
    setEditingId(m.id);
    setDraft(m.content);
  };

  const saveEdit = () => {
    if (editingId && draft.trim()) {
      updateMemoryContent(editingId, draft);
    }
    setEditingId(null);
    setDraft('');
  };

  return (
    <div className="explore-heat-drill-panel" role="dialog">
      <header className="explore-heat-drill-header">
        <span>本周 · {label}</span>
        <button type="button" onClick={onClose} aria-label="关闭">×</button>
      </header>
      <p className="explore-heat-drill-sub">{weekMemories.length} 条回忆 · 点击可编辑</p>
      <ul className="explore-heat-drill-list">
        {weekMemories.length === 0 ? (
          <li className="explore-heat-drill-empty">本周暂无回忆，去场景里写一条吧</li>
        ) : (
          weekMemories.slice(0, 8).map(m => (
            <li key={m.id}>
              {editingId === m.id ? (
                <div className="explore-heat-drill-edit">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={2}
                    className="explore-heat-drill-textarea"
                  />
                  <button type="button" className="explore-heat-drill-save" onClick={saveEdit}>
                    保存
                  </button>
                </div>
              ) : (
                <button type="button" className="explore-heat-drill-row" onClick={() => startEdit(m)}>
                  <span className="explore-heat-drill-date">{m.date}</span>
                  <span>{m.content.slice(0, 48)}{m.content.length > 48 ? '…' : ''}</span>
                </button>
              )}
            </li>
          ))
        )}
      </ul>
      {onOpenScene && (
        <button type="button" className="explore-heat-drill-scene-btn" onClick={onOpenScene}>
          进入 {label} 微场景 →
        </button>
      )}
    </div>
  );
}
