import { useMemo } from 'react';
import type { CommuteType, TownLocation } from '@/types/town';
import { COMMUTE_META } from '@/lib/town-utils';

const COMMUTE_DURATION: Record<CommuteType, number> = {
  walk: 22,
  bike: 15,
  subway: 11,
  car: 7,
};

interface ExploreRouteRunnersProps {
  home: { x: number; y: number };
  locations: TownLocation[];
  preferredTransport: CommuteType;
  hasVehicle: boolean;
  layoutEdit: boolean;
}

function routePath(home: { x: number; y: number }, loc: TownLocation): string {
  const mx = (home.x + loc.position.x) / 2;
  const my = Math.min(home.y, loc.position.y) - 6;
  return `M ${home.x} ${home.y} Q ${mx} ${my} ${loc.position.x} ${loc.position.y}`;
}

export default function ExploreRouteRunners({
  home,
  locations,
  preferredTransport,
  hasVehicle,
  layoutEdit,
}: ExploreRouteRunnersProps) {
  const routes = useMemo(
    () =>
      locations.map(loc => {
        const type =
          hasVehicle && preferredTransport === 'car' ? 'car' : loc.commute.defaultType;
        const meta = COMMUTE_META[type] ?? COMMUTE_META.walk;
        return {
          id: loc.id,
          d: routePath(home, loc),
          thin: type === 'walk' || type === 'bike',
          emoji: meta.emoji,
          duration: COMMUTE_DURATION[type] ?? 14,
        };
      }),
    [home, locations, preferredTransport, hasVehicle],
  );

  if (layoutEdit) return null;

  return (
    <svg className="explore-route-runners" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {routes.map(r => (
        <g key={r.id}>
          <path
            id={`explore-route-${r.id}`}
            d={r.d}
            fill="none"
            stroke="rgba(0,0,0,0.04)"
            strokeWidth={r.thin ? 4 : 5.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={r.d}
            fill="none"
            stroke="#D7CCC8"
            strokeWidth={r.thin ? 2.5 : 3.5}
            strokeLinecap="round"
            strokeDasharray={r.thin ? '5 4' : undefined}
            vectorEffect="non-scaling-stroke"
            className="explore-route-line"
          />
        </g>
      ))}
    </svg>
  );
}
