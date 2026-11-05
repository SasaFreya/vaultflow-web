import { useMemo } from 'react';
import { buildWeekHeatmapDiff, buildZoneHeatmap, HEATMAP_ZONES } from '@/lib/explore-route-heatmap';

interface ExploreRouteHeatmapLayerProps {
  cityId: string;
  refreshKey?: number;
  onZoneClick?: (locationId: string) => void;
}

/** 路线热力图 — 访问频次越高区块越暖；周对比高亮新常去 */
export default function ExploreRouteHeatmapLayer({
  cityId,
  refreshKey = 0,
  onZoneClick,
}: ExploreRouteHeatmapLayerProps) {
  const heats = useMemo(() => buildZoneHeatmap(cityId), [cityId, refreshKey]);
  const weekDiff = useMemo(() => buildWeekHeatmapDiff(cityId), [cityId, refreshKey]);
  const heatMap = useMemo(() => new Map(heats.map(h => [h.locationId, h])), [heats]);
  const diffMap = useMemo(() => new Map(weekDiff.map(d => [d.locationId, d])), [weekDiff]);

  if (heats.length === 0) return null;

  return (
    <svg className="explore-route-heatmap" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {HEATMAP_ZONES.map(zone => {
        const h = heatMap.get(zone.locationId);
        if (!h || h.count === 0) return null;
        const diff = diffMap.get(zone.locationId);
        const isNew = diff?.isNewFrequent;
        const clickable = Boolean(onZoneClick);
        return (
          <g
            key={zone.locationId}
            className={clickable ? 'explore-route-heatmap-zone--clickable' : undefined}
            onClick={clickable ? () => onZoneClick?.(zone.locationId) : undefined}
            style={{ cursor: clickable ? 'pointer' : undefined }}
          >
            <ellipse
              cx={zone.cx}
              cy={zone.cy}
              rx={zone.rx}
              ry={zone.ry}
              fill={h.fill}
              className="explore-route-heatmap-blob"
              style={{ opacity: 0.35 + h.heat * 0.65 }}
            />
            {isNew && (
              <ellipse
                cx={zone.cx}
                cy={zone.cy}
                rx={zone.rx + 2}
                ry={zone.ry + 1.5}
                fill="none"
                stroke="#FFD54F"
                strokeWidth="0.6"
                className="explore-route-heatmap-new-ring"
              />
            )}
            {diff && diff.delta > 0 && !isNew && (
              <text
                x={zone.cx}
                y={zone.cy - zone.ry - 2}
                textAnchor="middle"
                fontSize="3.5"
                fill="#81C784"
                className="explore-route-heatmap-delta"
              >
                +{diff.delta}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
