import { getCityGeoCenter } from '@/lib/explore-ecology-ext';

interface ExploreMapLayerProps {
  cityId: string;
  enabled: boolean;
  opacity?: number;
}

/** 半透明 OSM 地图底图（只读展示，不写入资产层） */
export default function ExploreMapLayer({ cityId, enabled, opacity = 0.35 }: ExploreMapLayerProps) {
  if (!enabled) return null;

  const { lat, lng } = getCityGeoCenter(cityId);
  const zoom = 12;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);

  const tiles = [
    [x - 1, y - 1],
    [x, y - 1],
    [x + 1, y - 1],
    [x - 1, y],
    [x, y],
    [x + 1, y],
    [x - 1, y + 1],
    [x, y + 1],
    [x + 1, y + 1],
  ];

  return (
    <div className="explore-map-layer" style={{ opacity }} aria-hidden>
      <div className="explore-map-layer-grid">
        {tiles.map(([tx, ty], i) => (
          <img
            key={`${tx}-${ty}-${i}`}
            className="explore-map-layer-tile"
            src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`}
            alt=""
            loading="lazy"
            draggable={false}
          />
        ))}
      </div>
      <div className="explore-map-layer-vignette" />
      <span className="explore-map-layer-attrib">© OpenStreetMap</span>
    </div>
  );
}
