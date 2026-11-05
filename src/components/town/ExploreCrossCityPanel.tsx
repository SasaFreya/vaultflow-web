import type { CrossCityDomainCompare } from '@/lib/explore-ecosystem';

interface ExploreCrossCityPanelProps {
  comparisons: CrossCityDomainCompare[];
}

const VITALITY_DOT: Record<string, string> = {
  vivid: '🟢',
  active: '🟡',
  emerging: '🟠',
  dormant: '⚪',
};

export default function ExploreCrossCityPanel({ comparisons }: ExploreCrossCityPanelProps) {
  if (comparisons.every(c => c.cities.length < 2)) return null;

  return (
    <div className="explore-cross-city-panel">
      <span className="explore-cross-city-title">跨城对比</span>
      {comparisons.map(row => (
        <div key={row.buildingType} className="explore-cross-city-row">
          <span className="explore-cross-city-domain">{row.domainLabel}</span>
          <div className="explore-cross-city-cities">
            {row.cities.map(c => (
              <span key={c.cityId} className="explore-cross-city-chip" title={`回忆 ${c.memoryCount} · 账单 ${c.financeActivity}`}>
                {VITALITY_DOT[c.vitality]} {c.cityName}
                <small>💭{c.memoryCount} 📊{c.financeActivity}</small>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
