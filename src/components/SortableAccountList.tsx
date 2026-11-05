import { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import type { Account } from '@/types';

interface SortableAccountListProps {
  accounts: Account[];
  onReorder: (orderedIds: string[]) => void;
  renderAccount: (account: Account, dragHandle: React.ReactNode) => React.ReactNode;
}

export function SortableAccountList({ accounts, onReorder, renderAccount }: SortableAccountListProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const handleDragStart = (id: string) => {
    dragIdRef.current = id;
    setDragId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = dragIdRef.current;
    if (!sourceId || sourceId === targetId) return;

    const ids = accounts.map(a => a.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    onReorder(next);
  };

  const handleDragEnd = () => {
    dragIdRef.current = null;
    setDragId(null);
  };

  return (
    <div className="divide-y" style={{ borderColor: 'var(--vault-border)' }}>
      {accounts.map(account => {
        const handle = (
          <div
            draggable
            onDragStart={() => handleDragStart(account.id)}
            onDragEnd={handleDragEnd}
            onDragOver={e => handleDragOver(e, account.id)}
            className="cursor-grab active:cursor-grabbing p-1 rounded opacity-40 group-hover:opacity-100 transition-opacity"
            title="拖拽排序"
          >
            <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--vault-text-secondary)' }} />
          </div>
        );

        return (
          <div
            key={account.id}
            className={`transition-opacity ${dragId === account.id ? 'opacity-50' : ''}`}
            onDragOver={e => handleDragOver(e, account.id)}
          >
            {renderAccount(account, handle)}
          </div>
        );
      })}
    </div>
  );
}
