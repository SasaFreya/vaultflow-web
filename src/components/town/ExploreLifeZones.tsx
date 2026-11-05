import type { BuildingType } from '@/types/life-town';
import { LIFE_DOMAIN_META } from '@/lib/explore-ecosystem';

/** 固定的人生域光晕 — 不随 pin 拖拽变形，避免路线乱线 */
const DOMAIN_ZONES: Array<{
  buildingType: BuildingType;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}> = [
  { buildingType: 'home', cx: 28, cy: 68, rx: 16, ry: 12 },
  { buildingType: 'company', cx: 78, cy: 28, rx: 15, ry: 11 },
  { buildingType: 'gym', cx: 18, cy: 38, rx: 13, ry: 10 },
  { buildingType: 'library', cx: 22, cy: 22, rx: 13, ry: 10 },
  { buildingType: 'cafe', cx: 82, cy: 58, rx: 14, ry: 11 },
];

interface ExploreLifeZonesProps {
  vitalityByBuilding: Partial<Record<BuildingType, 'dormant' | 'emerging' | 'active' | 'vivid'>>;
}

export default function ExploreLifeZones({ vitalityByBuilding }: ExploreLifeZonesProps) {
  return (
    <svg className="explore-life-zones" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {DOMAIN_ZONES.map(zone => {
        const meta = LIFE_DOMAIN_META[zone.buildingType];
        const vitality = vitalityByBuilding[zone.buildingType] ?? 'dormant';
        const opacity =
          vitality === 'vivid' ? 1 : vitality === 'active' ? 0.85 : vitality === 'emerging' ? 0.6 : 0.35;
        return (
          <g key={zone.buildingType} opacity={opacity}>
            <ellipse
              cx={zone.cx}
              cy={zone.cy}
              rx={zone.rx}
              ry={zone.ry}
              fill={meta.hue}
            />
            <text
              x={zone.cx}
              y={zone.cy - zone.ry - 1.5}
              textAnchor="middle"
              className="explore-life-zone-label"
            >
              {meta.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
