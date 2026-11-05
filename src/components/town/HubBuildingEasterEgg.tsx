import { motion } from 'framer-motion';
import type { HubBuildingDef } from '@/lib/town-hub-buildings';
import type { RPGThemeId } from '@/types/rpg';

interface HubBuildingEasterEggProps {
  building: HubBuildingDef;
  theme: RPGThemeId;
  onObiFairyClick: () => void;
  onCyberStreamClick: () => void;
  onPixelSaveClick: () => void;
}

const FAIRY_SPOTS = [
  { x: -28, y: -18, delay: 0 },
  { x: 32, y: -8, delay: 0.6 },
  { x: -8, y: -32, delay: 1.2 },
];

export default function HubBuildingEasterEgg({
  building,
  theme,
  onObiFairyClick,
  onCyberStreamClick,
  onPixelSaveClick,
}: HubBuildingEasterEggProps) {
  if (theme === 'obi' && building.id === 'wishTree') {
    return (
      <div className="hub-egg-layer hub-egg-layer--fairies" aria-hidden>
        {FAIRY_SPOTS.map((spot, i) => (
          <motion.button
            key={i}
            type="button"
            className="hub-egg-fairy"
            style={{ left: `calc(50% + ${spot.x}px)`, top: `${spot.y}px` }}
            animate={{ y: [0, -6, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: spot.delay, ease: 'easeInOut' }}
            onClick={e => {
              e.stopPropagation();
              onObiFairyClick();
            }}
            aria-label="点击精灵快速许愿"
            title="精灵 · 快速许愿"
          />
        ))}
      </div>
    );
  }

  if (theme === 'cyberpunk' && building.id === 'bank') {
    return (
      <button
        type="button"
        className="hub-egg-layer hub-egg-layer--matrix"
        onClick={e => {
          e.stopPropagation();
          onCyberStreamClick();
        }}
        aria-label="查看资产波动分析"
        title="数据流 · 资产波动"
      >
        <span className="hub-egg-matrix-col hub-egg-matrix-col--1">0101</span>
        <span className="hub-egg-matrix-col hub-egg-matrix-col--2">¥Δ</span>
        <span className="hub-egg-matrix-col hub-egg-matrix-col--3">1100</span>
      </button>
    );
  }

  if (theme === 'pixel' && building.id === 'house') {
    return (
      <button
        type="button"
        className="hub-egg-layer hub-egg-layer--savepoint"
        onClick={e => {
          e.stopPropagation();
          onPixelSaveClick();
        }}
        aria-label="保存今日人生快照"
        title="存档点 · 人生快照"
      >
        <span className="hub-egg-savepoint-ring" />
        <span className="hub-egg-savepoint-core">💾</span>
      </button>
    );
  }

  return null;
}
