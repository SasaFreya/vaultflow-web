import { getAobiSeason } from '@/lib/aobi-season';
import type { TownTimeOfDay } from '@/lib/town-time-of-day';

interface TownMapBackgroundProps {
  timeOfDay: TownTimeOfDay;
}

const FLOWERS = [
  { x: 12, y: 68, c: 'pink', d: 0, sway: 0 },
  { x: 18, y: 74, c: 'purple', d: 0.4, sway: 0.8 },
  { x: 35, y: 82, c: 'pink', d: 0.8, sway: 1.6 },
  { x: 42, y: 70, c: 'purple', d: 1.2, sway: 2.4 },
  { x: 58, y: 86, c: 'pink', d: 0.6, sway: 1.2 },
  { x: 65, y: 72, c: 'purple', d: 1.5, sway: 3.0 },
  { x: 78, y: 80, c: 'pink', d: 0.3, sway: 0.6 },
  { x: 85, y: 68, c: 'purple', d: 1.1, sway: 2.2 },
  { x: 28, y: 88, c: 'pink', d: 1.8, sway: 3.6 },
  { x: 72, y: 90, c: 'purple', d: 2.0, sway: 4.0 },
  { x: 48, y: 92, c: 'pink', d: 0.9, sway: 1.8 },
  { x: 92, y: 76, c: 'purple', d: 1.4, sway: 2.8 },
] as const;

const PETALS = Array.from({ length: 12 }, (_, i) => ({
  left: 8 + (i * 7.5) % 84,
  delay: i * 0.7,
  duration: 6 + (i % 4),
}));

/** 弯曲土路：主路径 + 嵌入地面的阴影线 */
const PATHS = [
  { d: 'M50 20 Q46 32 54 52', main: true },
  { d: 'M50 20 Q34 28 26 40', main: true },
  { d: 'M54 54 Q52 64 50 74', main: true },
  { d: 'M26 40 Q38 46 54 54', main: false },
  { d: 'M18 47 Q22 52 26 40', main: false },
  { d: 'M68 44 Q62 50 54 54', main: false },
] as const;

function CloudSvg({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 48" aria-hidden>
      <ellipse cx="36" cy="28" rx="28" ry="16" fill="rgba(255,255,255,0.92)" />
      <ellipse cx="62" cy="22" rx="34" ry="18" fill="rgba(255,255,255,0.95)" />
      <ellipse cx="88" cy="28" rx="24" ry="14" fill="rgba(255,255,255,0.88)" />
    </svg>
  );
}

function PathPair({ d, thin }: { d: string; thin?: boolean }) {
  const width = thin ? 4.5 : 6;
  const shadowWidth = thin ? 6 : 8;
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={shadowWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        transform="translate(0 0.35)"
      />
      <path
        d={d}
        fill="none"
        stroke="#D7CCC8"
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="hub-town-path-stroke"
      />
    </g>
  );
}

export default function TownMapBackground({ timeOfDay }: TownMapBackgroundProps) {
  const season = getAobiSeason();
  const showPetals = season === 'spring' && timeOfDay !== 'night';

  return (
    <div className="hub-town-bg" aria-hidden>
      <div className="hub-town-sky" />
      <div className="hub-town-grass-layer" />

      <svg className="hub-town-paths-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {PATHS.map((p, i) => (
          <PathPair key={i} d={p.d} thin={!p.main} />
        ))}
      </svg>

      {FLOWERS.map((f, i) => (
        <span
          key={i}
          className={`hub-town-flower hub-town-flower--${f.c}`}
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            animationDelay: `${f.d}s`,
            ['--flower-sway-delay' as string]: `${f.sway}s`,
          }}
        />
      ))}

      <CloudSvg className="hub-town-cloud hub-town-cloud--1" />
      <CloudSvg className="hub-town-cloud hub-town-cloud--2" />
      <CloudSvg className="hub-town-cloud hub-town-cloud--3" />

      {timeOfDay === 'night' && (
        <>
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="hub-town-star"
              style={{
                left: `${8 + (i * 17) % 84}%`,
                top: `${6 + (i * 11) % 28}%`,
                animationDelay: `${(i % 5) * 0.4}s`,
              }}
            />
          ))}
        </>
      )}

      <svg className="hub-town-bird" viewBox="0 0 24 12" aria-hidden>
        <path d="M2 8 Q6 2 12 6 Q18 2 22 8" fill="none" stroke="#5D4037" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </svg>

      {showPetals && PETALS.map((p, i) => (
        <span
          key={i}
          className="hub-town-petal"
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}
    </div>
  );
}
