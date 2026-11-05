import type { DomainTimelineItem, TimelineViewMode } from '@/lib/domain-timeline';

interface DomainMergedTimelineProps {
  items: DomainTimelineItem[];
  onItemClick?: (item: DomainTimelineItem) => void;
}

const MODE_LABEL: Record<TimelineViewMode, string> = {
  merged: '交错',
  bills: '仅账单',
  memories: '仅回忆',
};

interface DomainMergedTimelineWithModeProps extends DomainMergedTimelineProps {
  mode: TimelineViewMode;
  onModeChange: (mode: TimelineViewMode) => void;
}

export function TimelineModeTabs({ mode, onModeChange }: Pick<DomainMergedTimelineWithModeProps, 'mode' | 'onModeChange'>) {
  return (
    <div className="domain-timeline-mode-tabs">
      {(Object.keys(MODE_LABEL) as TimelineViewMode[]).map(m => (
        <button
          key={m}
          type="button"
          className={`domain-timeline-mode-tab ${mode === m ? 'domain-timeline-mode-tab--active' : ''}`}
          onClick={() => onModeChange(m)}
        >
          {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

export default function DomainMergedTimeline({ items, onItemClick }: DomainMergedTimelineProps) {
  if (items.length === 0) {
    return <p className="eco-float-empty">暂无时间线数据</p>;
  }

  return (
    <ol className="domain-merged-timeline">
      {items.map((item, idx) => (
        <li key={item.id}>
          <button
            type="button"
            className={`domain-merged-timeline-item domain-merged-timeline-item--${item.kind} ${item.linkable ? 'domain-merged-timeline-item--linkable' : ''}`}
            onClick={() => onItemClick?.(item)}
          >
          <span className="domain-merged-timeline-rail" aria-hidden />
          <div className="domain-merged-timeline-dot" aria-hidden />
          <div className="domain-merged-timeline-body">
            <div className="domain-merged-timeline-meta">
              <span className="domain-merged-timeline-date">{item.date}</span>
              <span className="domain-merged-timeline-kind">
                {item.kind === 'bill' ? '📊 账单' : '💭 回忆'}
              </span>
              {item.linkable && <span className="domain-merged-timeline-linkable">可链未链</span>}
            </div>
            <p className="domain-merged-timeline-title">{item.title}</p>
            {item.subtitle && <p className="domain-merged-timeline-sub">{item.subtitle}</p>}
            {item.lagHint && (
              <span className={`domain-merged-timeline-lag ${item.lagHint.includes('滞后') ? 'domain-merged-timeline-lag--warn' : ''}`}>
                {item.lagHint}
              </span>
            )}
          </div>
          {idx < items.length - 1 && <span className="domain-merged-timeline-connector" aria-hidden />}
          </button>
        </li>
      ))}
    </ol>
  );
}
