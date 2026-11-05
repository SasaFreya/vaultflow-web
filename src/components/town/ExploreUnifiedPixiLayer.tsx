import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, AnimatedSprite } from 'pixi.js';
import type { CommuteType, TownLocation } from '@/types/town';
import { buildZoneHeatmap, HEATMAP_ZONES } from '@/lib/explore-route-heatmap';
import { COMMUTE_META } from '@/lib/town-utils';
import { markRouteVisited } from '@/lib/explore-route-trails';
import {
  createRunnerTextures,
  RUNNER_FRAME_MS,
} from '@/lib/explore-runner-sprites';

const PIXI_UNIFIED_KEY = 'vaultflow_explore_pixi_unified';

const COMMUTE_DURATION: Record<CommuteType, number> = {
  walk: 22,
  bike: 15,
  subway: 11,
  car: 7,
};

const HUE_BY_EMOJI: Record<string, number> = {
  '🚗': 0x64b5f6,
  '🚇': 0x90a4ae,
  '🚶': 0xffab91,
  '🚴': 0xffab91,
};

export function loadPixiUnifiedEnabled(): boolean {
  try {
    return localStorage.getItem(PIXI_UNIFIED_KEY) === '1';
  } catch {
    return false;
  }
}

export function savePixiUnifiedEnabled(on: boolean): void {
  localStorage.setItem(PIXI_UNIFIED_KEY, on ? '1' : '0');
}

function sampleQuadratic(
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * cx + t * t * x1,
    y: u * u * y0 + 2 * u * t * cy + t * t * y1,
  };
}

function routeControl(home: { x: number; y: number }, loc: TownLocation) {
  const cx = (home.x + loc.position.x) / 2;
  const cy = Math.min(home.y, loc.position.y) - 6;
  return { cx, cy, x1: loc.position.x, y1: loc.position.y };
}

interface ExploreUnifiedPixiLayerProps {
  cityId: string;
  refreshKey?: number;
  active: boolean;
  particleKind?: 'fireflies' | 'leaves' | 'none';
  home?: { x: number; y: number };
  locations?: TownLocation[];
  preferredTransport?: CommuteType;
  hasVehicle?: boolean;
  showFpsHud?: boolean;
  onRouteVisited?: () => void;
  onFpsUpdate?: (fps: number) => void;
}

/** Pixi 全场景 — 热力粒子 + 环境粒子 + 跑酷小人单 Canvas */
export default function ExploreUnifiedPixiLayer({
  cityId,
  refreshKey = 0,
  active,
  particleKind = 'none',
  home,
  locations = [],
  preferredTransport = 'walk',
  hasVehicle = false,
  showFpsHud = false,
  onRouteVisited,
  onFpsUpdate,
}: ExploreUnifiedPixiLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const onRouteVisitedRef = useRef(onRouteVisited);
  const onFpsUpdateRef = useRef(onFpsUpdate);
  onRouteVisitedRef.current = onRouteVisited;
  onFpsUpdateRef.current = onFpsUpdate;

  useEffect(() => {
    if (!active || !hostRef.current) return;

    let destroyed = false;
    const heats = buildZoneHeatmap(cityId);
    const heatMap = new Map(heats.map(h => [h.locationId, h]));

    const routes =
      home && locations.length > 0
        ? locations.map(loc => {
            const type =
              hasVehicle && preferredTransport === 'car' ? 'car' : loc.commute.defaultType;
            const meta = COMMUTE_META[type] ?? COMMUTE_META.walk;
            const ctrl = routeControl(home, loc);
            return {
              id: loc.id,
              hue: HUE_BY_EMOJI[meta.emoji] ?? 0xffab91,
              duration: (COMMUTE_DURATION[type] ?? 14) * 1000,
              ...ctrl,
              x0: home.x,
              y0: home.y,
            };
          })
        : [];

    void (async () => {
      const app = new Application();
      await app.init({
        backgroundAlpha: 0,
        resizeTo: hostRef.current!,
        antialias: true,
        preference: 'webgl',
      });
      if (destroyed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      const canvas = app.canvas;
      canvas.style.pointerEvents = 'none';
      hostRef.current!.appendChild(canvas);

      const heatLayer = new Container();
      const runnerLayer = new Container();
      app.stage.addChild(heatLayer);
      app.stage.addChild(runnerLayer);

      const w = hostRef.current!.clientWidth || 400;
      const h = hostRef.current!.clientHeight || 400;
      const heatChildCount = { n: 0 };

      for (const zone of HEATMAP_ZONES) {
        const heat = heatMap.get(zone.locationId);
        if (!heat || heat.count === 0) continue;
        const cx = (zone.cx / 100) * w;
        const cy = (zone.cy / 100) * h;
        const rx = (zone.rx / 100) * w;
        const ry = (zone.ry / 100) * h;
        const n = Math.min(20, 5 + Math.round(heat.heat * 14));
        heatChildCount.n += n;
        for (let i = 0; i < n; i++) {
          const g = new Graphics();
          const angle = (i / n) * Math.PI * 2;
          g.circle(0, 0, 2 + heat.heat * 3);
          g.fill({ color: 0x81c784, alpha: 0.2 + heat.heat * 0.35 });
          g.x = cx + Math.cos(angle) * rx * (0.3 + Math.random() * 0.7);
          g.y = cy + Math.sin(angle) * ry * (0.3 + Math.random() * 0.7);
          heatLayer.addChild(g);
        }
      }

      let particleStart = heatChildCount.n;
      if (particleKind === 'fireflies') {
        for (let i = 0; i < 12; i++) {
          const g = new Graphics();
          g.circle(0, 0, 1.5);
          g.fill({ color: 0xfff59d, alpha: 0.8 });
          g.x = Math.random() * w;
          g.y = Math.random() * h * 0.6;
          heatLayer.addChild(g);
        }
      } else if (particleKind === 'leaves') {
        for (let i = 0; i < 8; i++) {
          const g = new Graphics();
          g.ellipse(0, 0, 2.5, 1.5);
          g.fill({ color: 0xff8a65, alpha: 0.55 });
          g.x = Math.random() * w;
          g.y = Math.random() * h * 0.4;
          heatLayer.addChild(g);
        }
      }
      particleStart = heatLayer.children.length;

      const sheetCache = new Map<number, ReturnType<typeof createRunnerTextures>>();
      const sprites: {
        container: Container;
        start: number;
        route: (typeof routes)[0];
        marked: boolean;
      }[] = [];

      for (const route of routes) {
        if (!sheetCache.has(route.hue)) {
          sheetCache.set(route.hue, createRunnerTextures(route.hue));
        }
        const frames = sheetCache.get(route.hue)!;
        const anim = new AnimatedSprite(frames);
        anim.animationSpeed = 1000 / RUNNER_FRAME_MS / 60;
        anim.play();
        const container = new Container();
        container.addChild(anim);
        runnerLayer.addChild(container);
        sprites.push({
          container,
          start: Math.random() * route.duration,
          route,
          marked: false,
        });
      }

      const toPx = (v: number, dim: number) => (v / 100) * dim;
      let tick = 0;

      app.ticker.add(() => {
        tick += 0.02;
        const rw = app.renderer.width;
        const rh = app.renderer.height;
        const now = performance.now();

        if (showFpsHud && onFpsUpdateRef.current) {
          onFpsUpdateRef.current(Math.round(app.ticker.FPS));
        }

        heatLayer.children.forEach((child, i) => {
          child.alpha = 0.45 + 0.55 * Math.sin(tick + i * 0.25);
          if (particleKind !== 'none' && i >= particleStart) {
            child.y += 0.15;
            if (child.y > rh) child.y = -4;
          }
        });

        for (const sprite of sprites) {
          const { container, route } = sprite;
          const elapsed = (now + sprite.start) % route.duration;
          const t = elapsed / route.duration;
          if (t > 0.92 && !sprite.marked) {
            sprite.marked = true;
            markRouteVisited(cityId, route.id);
            onRouteVisitedRef.current?.();
          } else if (t < 0.1) {
            sprite.marked = false;
          }
          const pt = sampleQuadratic(t, route.x0, route.y0, route.cx, route.cy, route.x1, route.y1);
          container.x = toPx(pt.x, rw);
          container.y = toPx(pt.y, rh);
          const nudge = sampleQuadratic(
            Math.min(t + 0.02, 1),
            route.x0,
            route.y0,
            route.cx,
            route.cy,
            route.x1,
            route.y1,
          );
          container.rotation =
            Math.atan2(nudge.y - pt.y, nudge.x - pt.x) + Math.PI / 2;
        }
      });
    })();

    return () => {
      destroyed = true;
      appRef.current?.destroy(true);
      appRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
  }, [
    cityId,
    refreshKey,
    active,
    particleKind,
    home,
    locations,
    preferredTransport,
    hasVehicle,
    showFpsHud,
  ]);

  if (!active) return null;
  return <div ref={hostRef} className="explore-unified-pixi" aria-hidden />;
}
