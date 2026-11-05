import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';

interface ExpandPanelProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string;
}

export function ExpandPanel({ title, open, onToggle, children, badge }: ExpandPanelProps) {
  return (
    <div className="vault-card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:opacity-90 transition-opacity"
        style={{ borderBottom: open ? '1px solid var(--vault-border)' : 'none' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium vault-heading">{title}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded vault-muted" style={{ backgroundColor: 'var(--vault-border)' }}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 vault-muted" /> : <ChevronDown className="w-4 h-4 vault-muted" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
