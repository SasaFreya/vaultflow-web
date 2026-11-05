import { useEffect, useRef } from 'react';
import { Application, Container, AnimatedSprite, type Texture } from 'pixi.js';
import type { CommuteType, TownLocation } from '@/types/town';
import { COMMUTE_META } from '@/lib/town-utils';
import { markRouteVisited } from '@/lib/explore-route-trails';
import {
  createRunnerTextures,
  RUNNER_FRAME_MS,
} from '@/lib/explore-runner-sprites';

const COMMUTE_DURATION: Record<CommuteType, number> = {
  walk: 22,
  bike: 15,
  subway: 11,
  car: 7,
};

const FPS_HUD_KEY = 'vaultflow_explore_pixi_fps_hud';

export function loadPixiFpsHudEnabled(): boolean {
  try {
    return localStorage.getItem(FPS_HUD_KEY) === '1';
  } catch {
    return false;
  }
}

export function savePixiFpsHudEnabled(on: boolean): void {
  localStorage.setItem(FPS_HUD_KEY, on ? '1' : '0');
}

interface ExploreRouteRunnersPixiProps {
  home: { x: number; y: number };
  locations: TownLocation[];
  preferredTransport: CommuteType;
  hasVehicle: boolean;
  layoutEdit: boolean;
  cityId: string;
  showFpsHud?: boolean;
  onRouteVisited?: () => void;
  onFpsUpdate?: (fps: number) => void;
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

const HUE_BY_EMOJI: Record<string, number> = {
  '🚗': 0x64b5f6,
  '🚇': 0x90a4ae,
  '🚶': 0xffab91,
  '🚴': 0xffab91,
};

/** PixiJS Phase 3：精灵表小人 + 可选 FPS HUD */
export default function ExploreRouteRunnersPixi({
  home,
  locations,
  preferredTransport,
  hasVehicle,
  layoutEdit,
  cityId,
  showFpsHud = false,
  onRouteVisited,
  onFpsUpdate,
}: ExploreRouteRunnersPixiProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (layoutEdit || !hostRef.current) return;

    const host = hostRef.current;
    let disposed = false;

    const routes = locations.map(loc => {
      const type =
        hasVehicle && preferredTransport === 'car' ? 'car' : loc.commute.defaultType;
      const meta = COMMUTE_META[type] ?? COMMUTE_META.walk;
      const ctrl = routeControl(home, loc);
      return {
        id: loc.id,
        emoji: meta.emoji,
        hue: HUE_BY_EMOJI[meta.emoji] ?? 0xffab91,
        duration: (COMMUTE_DURATION[type] ?? 14) * 1000,
        ...ctrl,
        x0: home.x,
        y0: home.y,
      };
    });

    void (async () => {
      const app = new Application();
      await app.init({
        backgroundAlpha: 0,
        resizeTo: host,
        antialias: true,
        preference: 'webgl',
      });
      if (disposed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      host.appendChild(app.canvas);
      app.canvas.className = 'explore-route-pixi-canvas';
      app.canvas.style.pointerEvents = 'none';

      const toPx = (v: number, dim: number) => (v / 100) * dim;
      const sheetCache = new Map<number, Texture[]>();

      const sprites: {
        container: Container;
        anim: AnimatedSprite;
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
        app.stage.addChild(container);
        sprites.push({ container, anim, start: Math.random() * route.duration, route, marked: false });
      }

      app.ticker.add(() => {
        const w = app.renderer.width;
        const h = app.renderer.height;
        const now = performance.now();

        if (showFpsHud && onFpsUpdate) {
          onFpsUpdate(Math.round(app.ticker.FPS));
        }

        for (const sprite of sprites) {
          const { container, route } = sprite;
          const elapsed = (now + sprite.start) % route.duration;
          const t = elapsed / route.duration;
          if (t > 0.92 && !sprite.marked) {
            sprite.marked = true;
            markRouteVisited(cityId, route.id);
            onRouteVisited?.();
          } else if (t < 0.1) {
            sprite.marked = false;
          }
          const pt = sampleQuadratic(t, route.x0, route.y0, route.cx, route.cy, route.x1, route.y1);
          container.x = toPx(pt.x, w);
          container.y = toPx(pt.y, h);
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
      disposed = true;
      appRef.current?.destroy(true);
      appRef.current = null;
      host.innerHTML = '';
    };
  }, [
    home,
    locations,
    preferredTransport,
    hasVehicle,
    layoutEdit,
    cityId,
    showFpsHud,
    onRouteVisited,
    onFpsUpdate,
  ]);

  if (layoutEdit) return null;

  return <div ref={hostRef} className="explore-route-pixi-host" aria-hidden />;
}
