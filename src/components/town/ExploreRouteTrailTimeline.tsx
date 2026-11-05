import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { buildRouteTimelineBuckets } from '@/lib/explore-route-trails';
import { exportRouteSharePng, copyRouteShareCard } from '@/lib/explore-route-export';
import { LIFE_DOMAIN_META } from '@/lib/explore-ecosystem';
import type { BuildingType } from '@/types/life-town';

interface ExploreRouteTrailTimelineProps {
  cityId: string;
  cityName?: string;
  refreshKey?: number;
}

const DOMAIN_LABEL: Partial<Record<string, string>> = {
  home: '小窝',
  company: '公司',
  library: '图书馆',
  gym: '健身房',
  cafe: '咖啡馆',
};

export default function ExploreRouteTrailTimeline({
  cityId,
  cityName = '当前城市',
  refreshKey = 0,
}: ExploreRouteTrailTimelineProps) {
  const buckets = useMemo(() => buildRouteTimelineBuckets(cityId), [cityId, refreshKey]);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState('');

  if (buckets.length === 0) return null;

  const handleExport = async () => {
    const result = await copyRouteShareCard(cityId, cityName);
    setExportMsg(result === 'copied' ? '季末卡片已复制到剪贴板' : '复制失败');
    window.setTimeout(() => setExportMsg(''), 2500);
  };

  const handleExportPng = async () => {
    const result = await exportRouteSharePng(cityId, cityName);
    setExportMsg(result === 'saved' ? 'PNG 已下载' : 'PNG 导出失败');
    window.setTimeout(() => setExportMsg(''), 2500);
  };

  const display = activeBucket
    ? buckets.filter(b => b.label === activeBucket)
    : buckets;

  return (
    <div className="explore-route-timeline">
      <span className="explore-route-timeline-label">路线记忆</span>
      <button
        type="button"
        className="explore-route-timeline-export"
        onClick={() => void handleExport()}
        title="复制季末文字卡片"
      >
        文字
      </button>
      <button
        type="button"
        className="explore-route-timeline-export"
        onClick={() => void handleExportPng()}
        title="导出 PNG 分享图"
      >
        <Share2 className="w-3 h-3" /> PNG
      </button>
      {exportMsg && <span className="explore-route-timeline-export-msg">{exportMsg}</span>}
      {buckets.map(b => (
        <button
          key={b.label}
          type="button"
          className={`explore-route-timeline-tab ${activeBucket === b.label ? 'explore-route-timeline-tab--active' : ''} ${!activeBucket || activeBucket === b.label ? '' : 'explore-route-timeline-tab--dim'}`}
          onClick={() => setActiveBucket(activeBucket === b.label ? null : b.label)}
          title={`回放${b.label}常去的地方`}
        >
          {b.label}
        </button>
      ))}
      <div className="explore-route-timeline-chips">
        {display.flatMap(b =>
          b.locationIds.map(id => {
            const label =
              DOMAIN_LABEL[id] ??
              LIFE_DOMAIN_META[id as BuildingType]?.label ??
              id;
            return (
              <span
                key={`${b.label}-${id}`}
                className="explore-route-timeline-chip"
                style={{ opacity: b.opacity }}
              >
                {label}
              </span>
            );
          }),
        )}
      </div>
    </div>
  );
}
