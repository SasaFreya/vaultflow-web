import type { ExploreTimelinePeriod } from '@/lib/explore-ecosystem';

interface ExploreTimelineBarProps {
  period: ExploreTimelinePeriod;
  growingDomains: number;
  dormantDomains: number;
  onPeriodChange: (period: ExploreTimelinePeriod) => void;
}

export default function ExploreTimelineBar({
  period,
  growingDomains,
  dormantDomains,
  onPeriodChange,
}: ExploreTimelineBarProps) {
  return (
    <div className="explore-timeline-bar">
      <span className="explore-timeline-label">时间轴</span>
      <div className="explore-timeline-tabs">
        <button
          type="button"
          className={`explore-timeline-tab ${period === 'week' ? 'explore-timeline-tab--active' : ''}`}
          onClick={() => onPeriodChange('week')}
        >
          本周
        </button>
        <button
          type="button"
          className={`explore-timeline-tab ${period === 'month' ? 'explore-timeline-tab--active' : ''}`}
          onClick={() => onPeriodChange('month')}
        >
          本月
        </button>
      </div>
      <span className="explore-timeline-hint">
        🌱 {growingDomains} 域生长 · 💤 {dormantDomains} 域休眠
      </span>
    </div>
  );
}
