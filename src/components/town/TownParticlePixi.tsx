import { useEffect, useRef } from 'react';
import { Application, Graphics } from 'pixi.js';
import type { ParticleScene } from '@/components/town/TownParticleCanvas';

interface TownParticlePixiProps {
  scene: Extract<ParticleScene, 'explore-leaves' | 'explore-fireflies'>;
  active?: boolean;
  className?: string;
}

interface PixiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  hue: number;
}

/** PixiJS Phase 2：落叶 / 萤火虫粒子（对比 SVG Canvas 性能） */
export default function TownParticlePixi({ scene, active = true, className = '' }: TownParticlePixiProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !hostRef.current) return;
    const host = hostRef.current;
    let disposed = false;
    let spawnTimer: ReturnType<typeof setInterval> | null = null;

    void (async () => {
      const app = new Application();
      await app.init({ backgroundAlpha: 0, resizeTo: host, antialias: true });
      if (disposed) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas);
      app.canvas.className = `town-particle-pixi-canvas ${className}`.trim();
      app.canvas.style.pointerEvents = 'none';

      const particles: PixiParticle[] = [];
      const g = new Graphics();
      app.stage.addChild(g);

      const spawn = () => {
        const w = app.renderer.width;
        const h = app.renderer.height;
        if (scene === 'explore-leaves') {
          particles.push({
            x: Math.random() * w,
            y: -10,
            vx: 0.3 + Math.random() * 0.6,
            vy: 0.5 + Math.random() * 0.8,
            life: 0,
            maxLife: 120 + Math.random() * 80,
            size: 4 + Math.random() * 3,
            alpha: 0.55,
            hue: 30 + Math.random() * 40,
          });
        } else {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h * 0.7 + h * 0.15,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            life: 0,
            maxLife: 100 + Math.random() * 100,
            size: 2 + Math.random() * 2,
            alpha: 0.85,
            hue: 55,
          });
        }
      };

      spawnTimer = setInterval(spawn, scene === 'explore-leaves' ? 420 : 280);

      app.ticker.add(() => {
        const h = app.renderer.height;
        g.clear();

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]!;
          p.life += 1;
          p.x += p.vx;
          p.y += p.vy;
          if (scene === 'explore-leaves') p.vx += Math.sin(p.life / 18) * 0.02;

          const fade =
            scene === 'explore-fireflies'
              ? 0.35 + 0.65 * Math.abs(Math.sin(p.life / 12))
              : 1 - p.life / p.maxLife;

          if (p.life > p.maxLife || p.y > h + 20) {
            particles.splice(i, 1);
            continue;
          }

          const color =
            scene === 'explore-leaves'
              ? 0xffa726
              : 0xfff59d;
          g.circle(p.x, p.y, p.size)
            .fill({ color, alpha: p.alpha * fade });
        }
      });
    })();

    return () => {
      disposed = true;
      if (spawnTimer) clearInterval(spawnTimer);
      host.innerHTML = '';
    };
  }, [scene, active, className]);

  if (!active) return null;
  return <div ref={hostRef} className={`town-particle-pixi-host ${className}`.trim()} aria-hidden />;
}
