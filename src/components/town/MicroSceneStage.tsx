import { useRef, useState, useCallback } from 'react';
import LoftCharacterArt from '@/components/rpg/LoftCharacterArt';
import type { CharacterPreset } from '@/types/rpg';
import type { SceneHotspot, LocationMicroScene } from '@/types/town';

interface MicroSceneStageProps {
  micro: LocationMicroScene;
  hotspots: SceneHotspot[];
  onHotspot: (point: SceneHotspot) => void;
  characterPreset?: CharacterPreset;
  characterTheme?: string;
}

/** 地板 / 家具 / 前景三层视差 */
export default function MicroSceneStage({
  micro,
  hotspots,
  onHotspot,
  characterPreset,
  characterTheme = 'obi',
}: MicroSceneStageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ bg: 0, mid: 0, front: 0 });
  const [charPos, setCharPos] = useState({ x: 12, y: 85 });
  const [walking, setWalking] = useState(false);
  const walkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moveCharacterTo = useCallback((x: number, y: number) => {
    setWalking(true);
    setCharPos({ x: Math.max(8, x - 8), y: Math.min(88, y + 4) });
    if (walkTimer.current) clearTimeout(walkTimer.current);
    walkTimer.current = setTimeout(() => setWalking(false), 600);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ratio = el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1);
    setParallax({ bg: ratio * 6, mid: ratio * 14, front: ratio * -10 });
    setWalking(true);
    if (walkTimer.current) clearTimeout(walkTimer.current);
    walkTimer.current = setTimeout(() => setWalking(false), 400);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="micro-scene-stage micro-scene-stage--layered flex-1 min-h-[min(52vh,420px)] relative mx-3 mb-2 rounded-[28px] overflow-y-auto overflow-x-hidden"
      onScroll={onScroll}
    >
      <div
        className="micro-scene-layer micro-scene-layer--floor"
        style={{ transform: `translateY(${parallax.bg}px)` }}
      >
        <div className="micro-scene-floor" aria-hidden />
      </div>

      <div
        className="micro-scene-layer micro-scene-layer--mid"
        style={{ transform: `translateY(${parallax.mid}px)` }}
      >
        <div className="micro-scene-story">
          <p className="micro-scene-story-text">{micro.story}</p>
          <p className="micro-scene-ambient">{micro.ambient}</p>
        </div>

        {micro.props.map((prop, i) => (
          <div
            key={prop.id}
            className="micro-scene-prop pointer-events-none"
            style={{
              left: `${prop.x}%`,
              top: `${prop.y}%`,
              transform: `translate(-50%, -50%) rotate(${prop.rotate ?? 0}deg)`,
              animationDelay: `${i * 0.15}s`,
            }}
            title={prop.label}
          >
            <span className="micro-scene-prop-emoji">{prop.emoji}</span>
            <span className="micro-scene-prop-label">{prop.label}</span>
          </div>
        ))}
      </div>

      <div
        className="micro-scene-layer micro-scene-layer--front"
        style={{ transform: `translateY(${parallax.front}px)` }}
      >
        {hotspots.map((point, i) => {
          const x = point.layout?.x ?? 50;
          const y = point.layout?.y ?? 50;
          return (
            <button
              key={point.id}
              type="button"
              onClick={() => {
                moveCharacterTo(x, y);
                onHotspot(point);
              }}
              className="micro-scene-hotspot group"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div className="micro-scene-hotspot-glow" aria-hidden />
              <span className="micro-scene-hotspot-icon">{point.icon}</span>
              <span className="micro-scene-hotspot-name">{point.name}</span>
              {point.story && (
                <span className="micro-scene-hotspot-story">{point.story}</span>
              )}
              <span className="town-hotspot-tag micro-scene-hotspot-cta">{point.label}</span>
            </button>
          );
        })}
        {characterPreset && (
          <div
            className={`micro-scene-character-silhouette micro-scene-character-silhouette--${characterTheme} ${walking ? 'micro-scene-character-silhouette--walk' : ''}`}
            style={{ left: `${charPos.x}%`, top: `${charPos.y}%` }}
            aria-hidden
          >
            <LoftCharacterArt preset={characterPreset} size={72} pose={walking ? 'walk' : 'idle'} />
          </div>
        )}
        <div className="micro-scene-parallax-spacer" aria-hidden />
      </div>
    </div>
  );
}
