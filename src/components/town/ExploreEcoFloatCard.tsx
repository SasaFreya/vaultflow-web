import { useMemo, useState } from 'react';
import { X, PenLine, Sparkles } from 'lucide-react';
import type { BuildingType } from '@/types/life-town';
import type { DomainDetailData } from '@/lib/explore-ecology-ext';
import {
  buildMergedDomainTimeline,
  filterTimelineByMode,
  markLinkableTimelinePairs,
  type TimelineViewMode,
} from '@/lib/domain-timeline';
import DomainMergedTimeline, { TimelineModeTabs } from '@/components/town/DomainMergedTimeline';
import MapOverlayPortal from '@/components/town/MapOverlayPortal';

interface ExploreEcoFloatCardProps {
  open: boolean;
  detail: DomainDetailData | null;
  onClose: () => void;
  onCompose: (buildingType: BuildingType) => void;
  onAiEcho: (buildingType: BuildingType) => void;
  onTimelineItemClick?: (buildingType: BuildingType, memoryId?: string) => void;
  aiEchoLoading?: boolean;
}

/** 生态数据居中浮层 — 非侧栏 */
export default function ExploreEcoFloatCard({
  open,
  detail,
  onClose,
  onCompose,
  onAiEcho,
  onTimelineItemClick,
  aiEchoLoading,
}: ExploreEcoFloatCardProps) {
  const [timelineMode, setTimelineMode] = useState<TimelineViewMode>('merged');

  const timeline = useMemo(() => {
    if (!detail) return [];
    const merged = buildMergedDomainTimeline(detail.memories, detail.bills);
    const filtered = filterTimelineByMode(merged, timelineMode);
    return markLinkableTimelinePairs(filtered);
  }, [detail, timelineMode]);

  if (!open || !detail) return null;

  const { ecosystem } = detail;

  return (
    <MapOverlayPortal>
      <div className="eco-float-overlay" onClick={onClose} role="presentation">
        <div
          className="eco-float-panel"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-label={`${detail.domainLabel}生态数据`}
        >
          <header className="eco-float-panel-header">
            <div>
              <span className="eco-float-kicker">生态数据 · 框内浮层</span>
              <span className="eco-float-domain">{detail.domainLabel}</span>
              <h2 className="eco-float-title">{detail.placeName}</h2>
              <p className="eco-float-sub">
                💭 {ecosystem.memoryCount} 回忆 · 📊 {ecosystem.financeActivity} 账单 · Lv.
                {ecosystem.effectiveLevel}
              </p>
            </div>
            <button type="button" className="eco-float-close" onClick={onClose} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="eco-float-actions">
            <button type="button" className="eco-float-cta" onClick={() => onCompose(detail.buildingType)}>
              <PenLine className="w-3.5 h-3.5" />
              补充回忆
            </button>
            <button
              type="button"
              className="eco-float-cta eco-float-cta--ghost"
              disabled={aiEchoLoading || detail.bills.length === 0}
              onClick={() => onAiEcho(detail.buildingType)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiEchoLoading ? '生成中…' : 'AI 回声'}
            </button>
          </div>

          <section className="eco-float-timeline-section">
            <h3>域内时间轴 · 账单与回忆</h3>
            <p className="eco-float-timeline-hint">点击条目可在地图上高亮对应 Pin</p>
            <TimelineModeTabs mode={timelineMode} onModeChange={setTimelineMode} />
            <DomainMergedTimeline
              items={timeline}
              onItemClick={item =>
                onTimelineItemClick?.(
                  detail.buildingType,
                  item.kind === 'memory' ? item.id : undefined,
                )
              }
            />
          </section>
        </div>
      </div>
    </MapOverlayPortal>
  );
}
