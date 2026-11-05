import type { LifeMemory } from '@/types/life-town';
import { geoToMapOffset, getCityGeoCenter } from '@/lib/explore-ecology-ext';
import { EXPLORE_HOME_ID } from '@/lib/town-explore-layout';

interface ExploreGeoMarkersProps {
  cityId: string;
  memories: LifeMemory[];
  positions: Record<string, { x: number; y: number }>;
}

export default function ExploreGeoMarkers({ cityId, memories, positions }: ExploreGeoMarkersProps) {
  const center = getCityGeoCenter(cityId);
  const withGeo = memories.filter(m => m.cityId === cityId && m.geo);

  return (
    <>
      {withGeo.map(m => {
        const pinId = m.buildingType === 'home' ? EXPLORE_HOME_ID : m.buildingType;
        const base = positions[pinId];
        if (!base || !m.geo) return null;
        const off = geoToMapOffset(m.geo, center);
        return (
          <div
            key={m.id}
            className="explore-geo-marker"
            style={{
              left: `${base.x + off.dx}%`,
              top: `${base.y + off.dy}%`,
            }}
            title={m.geo.label ?? `📍 ${m.buildingType}`}
          >
            📍
          </div>
        );
      })}
    </>
  );
}
