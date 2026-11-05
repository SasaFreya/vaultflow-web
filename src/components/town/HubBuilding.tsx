import { useState, useRef, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { HubBuildingDef } from '@/lib/town-hub-buildings';
import { DEPTH_META, getBuildingScale } from '@/lib/town-hub-buildings';
import type { HubLayoutBuildingId } from '@/types/life-town';
import { clampHubPosition } from '@/lib/town-hub-layout';
import HubBuildingArt from '@/components/town/HubBuildingArt';
import HubBuildingEasterEgg from '@/components/town/HubBuildingEasterEgg';
import { useLifeRPG } from '@/hooks/useLifeRPG';

interface HubBuildingProps {
  building: HubBuildingDef;
  level: number;
  badge?: number;
  layoutMode?: boolean;
  canvasRef?: RefObject<HTMLElement | null>;
  onPositionChange?: (buildingId: HubLayoutBuildingId, x: number, y: number) => void;
  onQuickWish?: () => void;
  onVolatility?: () => void;
  onSnapshot?: () => void;
  ecosystemHint?: string;
  extraClassName?: string;
  streakMonths?: number;
  streakPulse?: boolean;
  onOpenScene?: (buildingId: HubLayoutBuildingId, anchor: { x: number; y: number }) => void;
}

const SIZE_CLASS = {
  lg: 'hub-building--lg',
  md: 'hub-building--md',
  sm: 'hub-building--sm',
};

const THEME_MORPH = {
  initial: { scale: 0.55, opacity: 0, rotate: -6 },
  animate: { scale: 1, opacity: 1, rotate: 0 },
  exit: { scale: 0.55, opacity: 0, rotate: 6 },
  transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
};

export default function HubBuilding({
  building,
  level,
  badge = 0,
  layoutMode = false,
  canvasRef,
  onPositionChange,
  onQuickWish,
  onVolatility,
  onSnapshot,
  ecosystemHint,
  extraClassName,
  streakMonths,
  streakPulse,
  onOpenScene,
}: HubBuildingProps) {
  const navigate = useNavigate();
  const { data: rpg } = useLifeRPG();
  const [hovered, setHovered] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const depth = DEPTH_META[building.depth];
  const baseScale = getBuildingScale(building);
  const rotate = building.rotate ?? 0;
  const layoutZ = layoutMode ? 40 : depth.zIndex;

  const handleDragEnd = () => {
    if (!layoutMode || !canvasRef?.current || !nodeRef.current || !onPositionChange) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const node = nodeRef.current.getBoundingClientRect();
    const cx = node.left + node.width / 2;
    const cy = node.top + node.height / 2;
    const { x, y } = clampHubPosition(
      ((cx - canvas.left) / canvas.width) * 100,
      ((cy - canvas.top) / canvas.height) * 100,
    );
    onPositionChange(building.id as HubLayoutBuildingId, x, y);
  };

  return (
    <motion.div
      ref={nodeRef}
      className={`hub-building group hub-building--${building.id} ${SIZE_CLASS[building.size]} ${badge > 0 ? 'hub-building--has-badge' : ''} ${layoutMode ? 'hub-building--layout-mode' : ''} ${streakPulse ? 'hub-building--streak-pulse' : ''} ${extraClassName ?? ''}`}
      style={{
        left: `${building.x}%`,
        top: `${building.y}%`,
        zIndex: layoutZ,
        opacity: depth.opacity,
        rotate,
      }}
      initial={false}
      drag={layoutMode}
      dragMomentum={false}
      dragElastic={0.08}
      dragConstraints={canvasRef}
      onDragEnd={handleDragEnd}
      whileHover={layoutMode ? undefined : { scale: baseScale * 1.1, y: -10 }}
      whileTap={layoutMode ? undefined : { scale: baseScale * 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      onHoverStart={() => !layoutMode && setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {layoutMode && <span className="hub-building-drag-hint" aria-hidden>⠿</span>}

      <button
        type="button"
        className="hub-building-hit"
        onClick={() => {
          if (layoutMode) return;
          if (building.id !== 'explore' && onOpenScene) {
            onOpenScene(building.id as HubLayoutBuildingId, { x: building.x, y: building.y });
            return;
          }
          navigate(building.route);
        }}
        aria-label={`${building.name} Lv.${level}`}
        tabIndex={layoutMode ? -1 : 0}
        style={layoutMode ? { pointerEvents: 'none' } : undefined}
      >
        <div className="hub-building-visual">
          <AnimatePresence>
            {hovered && !layoutMode && (
              <motion.div
                className="hub-building-bubble"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
              >
                <p className="hub-building-bubble-title">{building.name}</p>
                <p className="hub-building-bubble-sub">
                  {ecosystemHint ?? building.subtitle}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={rpg.theme}
              className="hub-building-art-wrap"
              {...THEME_MORPH}
            >
              <HubBuildingArt buildingId={building.id} level={level} theme={rpg.theme} streakMonths={streakMonths} />
            </motion.div>
          </AnimatePresence>

          {building.id === 'house' && !layoutMode && (
            <div className="hub-building-smoke" aria-hidden>
              <span /><span /><span />
            </div>
          )}

          {level >= 4 && <span className="hub-building-spark" aria-hidden>✨</span>}
          {badge > 0 && (
            <span className="hub-building-badge">{badge > 99 ? '99+' : badge}</span>
          )}
        </div>
      </button>

      {!layoutMode && (
        <HubBuildingEasterEgg
          building={building}
          theme={rpg.theme}
          onObiFairyClick={() => onQuickWish?.()}
          onCyberStreamClick={() => onVolatility?.()}
          onPixelSaveClick={() => onSnapshot?.()}
        />
      )}

      <span className="hub-building-name">{building.name}</span>
      <span className="hub-building-sub">{building.subtitle}</span>
      <span className="hub-building-lv">Lv.{level}</span>
    </motion.div>
  );
}
