import { useEffect, useRef } from 'react';

export type ParticleScene = 'hub-smoke' | 'explore-leaves' | 'explore-fireflies' | 'rain';

interface TownParticleCanvasProps {
  scene: ParticleScene;
  active?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
}

export default function TownParticleCanvas({ scene, active = true, className = '' }: TownParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const spawn = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (scene === 'hub-smoke') {
        particles.push({
          x: w * 0.54 + (Math.random() - 0.5) * 20,
          y: h * 0.42,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.4 - Math.random() * 0.5,
          life: 0,
          maxLife: 80 + Math.random() * 40,
          size: 3 + Math.random() * 4,
          alpha: 0.35,
        });
      } else if (scene === 'explore-leaves') {
        particles.push({
          x: Math.random() * w,
          y: -10,
          vx: 0.3 + Math.random() * 0.6,
          vy: 0.5 + Math.random() * 0.8,
          life: 0,
          maxLife: 120 + Math.random() * 80,
          size: 4 + Math.random() * 3,
          alpha: 0.55,
        });
      } else if (scene === 'explore-fireflies') {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.7 + h * 0.15,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          life: 0,
          maxLife: 100 + Math.random() * 100,
          size: 2 + Math.random() * 2,
          alpha: 0.8,
        });
      } else if (scene === 'rain') {
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: -1.2,
            vy: 6 + Math.random() * 4,
            life: 0,
            maxLife: 40 + Math.random() * 20,
            size: 1.5,
            alpha: 0.35,
          });
        }
      }
    };

    let frame = 0;
    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frame % (scene === 'rain' ? 1 : 18) === 0) spawn();

      particles = particles.filter(p => {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        const fade = scene === 'explore-fireflies'
          ? 0.3 + Math.abs(Math.sin(p.life * 0.12)) * 0.7
          : 1 - t;

        if (scene === 'hub-smoke') {
          ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha * fade})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + t * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else if (scene === 'rain') {
          ctx.strokeStyle = `rgba(150, 180, 220, ${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 2);
          ctx.stroke();
        } else if (scene === 'explore-leaves') {
          ctx.fillStyle = `rgba(129, 199, 132, ${p.alpha * fade})`;
          ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
        } else {
          ctx.fillStyle = `rgba(255, 235, 120, ${p.alpha * fade})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        return p.life < p.maxLife && p.y < canvas.height + 20 && p.x > -20 && p.x < canvas.width + 20;
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [scene, active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`town-particle-canvas pointer-events-none ${className}`}
      aria-hidden
    />
  );
}
