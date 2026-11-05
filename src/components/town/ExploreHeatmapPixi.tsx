import { useEffect, useRef } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { buildZoneHeatmap, HEATMAP_ZONES } from '@/lib/explore-route-heatmap';

const PIXI_HEAT_KEY = 'vaultflow_explore_pixi_heatmap';

export function loadPixiHeatmapEnabled(): boolean {
  try {
    return localStorage.getItem(PIXI_HEAT_KEY) === '1';
  } catch {
    return false;
  }
}

export function savePixiHeatmapEnabled(on: boolean): void {
  localStorage.setItem(PIXI_HEAT_KEY, on ? '1' : '0');
}

interface ExploreHeatmapPixiProps {
  cityId: string;
  refreshKey?: number;
  active: boolean;
}

/** Pixi 热力粒子试点 — 与 SVG 热力 A/B 对比 */
export default function ExploreHeatmapPixi({ cityId, refreshKey = 0, active }: ExploreHeatmapPixiProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!active || !hostRef.current) return;

    let destroyed = false;
    const heats = buildZoneHeatmap(cityId);
    const heatMap = new Map(heats.map(h => [h.locationId, h]));

    void (async () => {
      const app = new Application();
      await app.init({
        backgroundAlpha: 0,
        resizeTo: hostRef.current!,
        antialias: true,
      });
      if (destroyed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      hostRef.current!.appendChild(app.canvas);

      const layer = new Container();
      app.stage.addChild(layer);

      const w = hostRef.current!.clientWidth || 400;
      const h = hostRef.current!.clientHeight || 400;

      for (const zone of HEATMAP_ZONES) {
        const heat = heatMap.get(zone.locationId);
        if (!heat || heat.count === 0) continue;

        const cx = (zone.cx / 100) * w;
        const cy = (zone.cy / 100) * h;
        const rx = (zone.rx / 100) * w;
        const ry = (zone.ry / 100) * h;
        const particleCount = Math.min(24, 6 + Math.round(heat.heat * 18));

        for (let i = 0; i < particleCount; i++) {
          const g = new Graphics();
          const angle = (i / particleCount) * Math.PI * 2;
          const dist = 0.3 + Math.random() * 0.7;
          const px = cx + Math.cos(angle) * rx * dist;
          const py = cy + Math.sin(angle) * ry * dist;
          const r = 2 + heat.heat * 4;
          const alpha = 0.15 + heat.heat * 0.45;
          g.circle(0, 0, r);
          g.fill({ color: 0x81c784, alpha });
          g.x = px;
          g.y = py;
          layer.addChild(g);
        }
      }

      let tick = 0;
      app.ticker.add(() => {
        tick += 0.02;
        layer.children.forEach((child, i) => {
          child.alpha = 0.5 + 0.5 * Math.sin(tick + i * 0.3);
        });
      });
    })();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
  }, [cityId, refreshKey, active]);

  if (!active) return null;

  return <div ref={hostRef} className="explore-heatmap-pixi" aria-hidden />;
}
