import { useMemo } from 'react';
import type { TownLocation } from '@/types/town';
import {
  getRouteVisitRecords,
  trailOpacityForDate,
} from '@/lib/explore-route-trails';

interface ExploreRouteTrailLayerProps {
  cityId: string;
  home: { x: number; y: number };
  locations: TownLocation[];
  refreshKey?: number;
}

function routePath(home: { x: number; y: number }, loc: TownLocation): string {
  const mx = (home.x + loc.position.x) / 2;
  const my = Math.min(home.y, loc.position.y) - 6;
  return `M ${home.x} ${home.y} Q ${mx} ${my} ${loc.position.x} ${loc.position.y}`;
}

export default function ExploreRouteTrailLayer({ cityId, home, locations, refreshKey = 0 }: ExploreRouteTrailLayerProps) {
  const trails = useMemo(() => {
    const records = getRouteVisitRecords(cityId);
    const byLoc = new Map<string, { d: string; opacity: number }>();

    for (const loc of locations) {
      const hits = records.filter(r => r.locationId === loc.id);
      if (hits.length === 0) continue;
      const latest = hits[hits.length - 1]!;
      byLoc.set(loc.id, {
        d: routePath(home, loc),
        opacity: trailOpacityForDate(latest.visitedAt),
      });
    }
    return [...byLoc.entries()].map(([id, v]) => ({ id, ...v }));
  }, [cityId, home, locations, refreshKey]);

  if (trails.length === 0) return null;

  return (
    <svg className="explore-route-trails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {trails.map(t => (
        <g key={t.id} style={{ opacity: t.opacity }}>
          <path
            d={t.d}
            fill="none"
            stroke="rgba(129, 199, 132, 0.35)"
            strokeWidth={5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="explore-route-trail"
          />
          <path
            d={t.d}
            fill="none"
            stroke="rgba(102, 187, 106, 0.55)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
            className="explore-route-trail explore-route-trail--inner"
          />
        </g>
      ))}
    </svg>
  );
}
