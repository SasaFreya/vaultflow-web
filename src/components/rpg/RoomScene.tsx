import { useState } from 'react';
import { motion } from 'framer-motion';
import type { RoomPanel, CharacterPreset } from '@/types/rpg';
import LoftFurnitureArt, {
  LOFT_FURNITURE_KIND,
  LOFT_FURNITURE_LABEL,
} from '@/components/rpg/LoftFurnitureArt';
import LoftCharacterArt from '@/components/rpg/LoftCharacterArt';

interface FurnitureItem {
  panel: RoomPanel;
  label: string;
  hint: string;
  left: string;
  top: string;
}

const FURNITURE: FurnitureItem[] = [
  { panel: 'quests', label: LOFT_FURNITURE_LABEL.quests, hint: '今日副本', left: '10%', top: '40%' },
  { panel: 'stats', label: LOFT_FURNITURE_LABEL.stats, hint: '成长数据', left: '40%', top: '34%' },
  { panel: 'habits', label: LOFT_FURNITURE_LABEL.habits, hint: '每日养成', left: '66%', top: '42%' },
];

interface RoomSceneProps {
  level: number;
  characterPreset: CharacterPreset;
  activePanel: RoomPanel | null;
  walkTarget?: RoomPanel | null;
  onNavigate: (panel: RoomPanel) => void;
  immersive?: boolean;
}

export default function RoomScene({ characterPreset, activePanel, walkTarget, onNavigate }: RoomSceneProps) {
  const [hovered, setHovered] = useState<RoomPanel | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const walkItem = walkTarget ? FURNITURE.find(f => f.panel === walkTarget) : null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: nx * 8, y: ny * 5 });
  };

  return (
    <div
      className="loft-room-scene relative w-full overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setParallax({ x: 0, y: 0 })}
    >
      <img
        src="/rpg/room-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none loft-room-bg"
        draggable={false}
        style={{ transform: `translate(${parallax.x * 0.3}px, ${parallax.y * 0.3}px) scale(1.04)` }}
      />
      <div className="loft-room-vignette absolute inset-0 pointer-events-none" />

      <motion.div
        className="loft-room-character absolute z-10 flex flex-col items-center pointer-events-none loft-character-walker"
        animate={{
          left: walkItem ? walkItem.left : '50%',
          top: walkItem ? walkItem.top : '62%',
        }}
        transition={{ duration: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
        style={{
          transform: walkItem
            ? 'translate(-50%, -50%)'
            : `translate(calc(-50% + ${parallax.x * 0.15}px), calc(-50% + ${parallax.y * 0.1}px))`,
        }}
      >
        <LoftCharacterArt preset={characterPreset} size={56} pose={walkItem ? 'walk' : 'idle'} />
        <span className="loft-room-character-shadow" aria-hidden />
      </motion.div>

      {FURNITURE.map(item => {
        const active = activePanel === item.panel;
        const hover = hovered === item.panel;
        const lifted = hover || active;
        const kind = LOFT_FURNITURE_KIND[item.panel as keyof typeof LOFT_FURNITURE_KIND];
        const px = parallax.x * (item.panel === 'stats' ? 0.2 : 0.35);
        const py = parallax.y * 0.25;

        return (
          <button
            key={item.panel}
            type="button"
            className="loft-furniture loft-furniture--iso absolute z-20 flex flex-col items-center gap-0 border-0 bg-transparent p-0 cursor-pointer outline-none"
            style={{
              left: item.left,
              top: item.top,
              transform: `translate(${px}px, ${py + (lifted ? -8 : 0)}px) scale(${lifted ? 1.06 : 1})`,
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={() => onNavigate(item.panel)}
            onMouseEnter={() => setHovered(item.panel)}
            onMouseLeave={() => setHovered(null)}
            aria-label={item.label}
          >
            <LoftFurnitureArt kind={kind} size={76} lifted={lifted} />
            <span className={`loft-furniture-label ${active ? 'loft-furniture-label--active' : ''}`}>
              {item.label}
            </span>
            {hover && <span className="loft-furniture-hint">{item.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
