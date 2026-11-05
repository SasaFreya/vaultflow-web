import type { TownWeatherSnapshot } from '@/lib/town-weather';

interface MicroSceneWeatherParticlesProps {
  weather?: TownWeatherSnapshot | null;
}

/** 框内天气粒子 — 雨滴水珠 / 雪天积雪 */
export default function MicroSceneWeatherParticles({ weather }: MicroSceneWeatherParticlesProps) {
  if (!weather || weather.kind === 'clear') return null;

  if (weather.kind === 'rain') {
    return (
      <div className="micro-scene-weather-particles micro-scene-weather-particles--rain" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="micro-scene-rain-drop"
            style={{
              left: `${8 + (i * 6.5) % 88}%`,
              animationDelay: `${(i % 5) * 0.35}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (weather.kind === 'snow') {
    return (
      <div className="micro-scene-weather-particles micro-scene-weather-particles--snow" aria-hidden>
        <span className="micro-scene-snow-sill" />
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="micro-scene-snow-flake"
            style={{ left: `${10 + i * 11}%`, animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </div>
    );
  }

  return null;
}
