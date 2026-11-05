import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import MapOverlayPortal from '@/components/town/MapOverlayPortal';
import { HUB_MICRO_SCENES, type HubMicroSceneDef } from '@/lib/hub-micro-scenes';
import type { HubBuildingId } from '@/lib/town-hub-buildings';
import { startMicroSceneAmbient, stopMicroSceneAmbient } from '@/lib/micro-scene-ambient';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { useVaultData } from '@/hooks/useVaultData';
import { formatCurrency } from '@/lib/storage';
import { getTownTimeOfDay } from '@/lib/town-time-of-day';

interface HubMicroSceneOverlayProps {
  buildingId: HubBuildingId;
  level: number;
  anchor?: { x: number; y: number } | null;
  goalCount?: number;
  memoryCount?: number;
  dreamSpaceCount?: number;
  onClose: () => void;
}

function HubSceneBody({
  scene,
  level,
  goalCount = 0,
  memoryCount = 0,
  dreamSpaceCount = 0,
}: {
  scene: HubMicroSceneDef;
  level: number;
  goalCount?: number;
  memoryCount?: number;
  dreamSpaceCount?: number;
}) {
  const { totals, settings } = useVaultData();
  const timeOfDay = getTownTimeOfDay();

  return (
    <div className={`hub-micro-scene-body hub-micro-scene-body--${timeOfDay}`}>
      <p className="hub-micro-scene-story">{scene.story}</p>
      <p className="hub-micro-scene-ambient">{scene.ambient}</p>
      <span className="hub-micro-scene-lv">建筑 Lv.{level}</span>

      {scene.id === 'bank' && (
        <div className="hub-micro-scene-stat-card">
          <p className="hub-micro-scene-stat-label">净资产（本地只读）</p>
          <p className="hub-micro-scene-stat-value">
            {formatCurrency(totals.netWorth, settings.baseCurrency)}
          </p>
          <p className="hub-micro-scene-stat-hint">数据仅存于本机，不会上传</p>
        </div>
      )}
      {scene.id === 'wishTree' && (
        <div className="hub-micro-scene-stat-card">
          <p className="hub-micro-scene-stat-label">进行中的心愿</p>
          <p className="hub-micro-scene-stat-value">{goalCount} 个</p>
        </div>
      )}
      {scene.id === 'house' && (
        <div className="hub-micro-scene-stat-card">
          <p className="hub-micro-scene-stat-label">本城回忆</p>
          <p className="hub-micro-scene-stat-value">{memoryCount} 条</p>
        </div>
      )}
      {scene.id === 'dreamHall' && (
        <div className="hub-micro-scene-stat-card">
          <p className="hub-micro-scene-stat-label">平行空间</p>
          <p className="hub-micro-scene-stat-value">{dreamSpaceCount} 间</p>
        </div>
      )}
    </div>
  );
}

/** 人生小镇建筑框内场景 — 不跳转资产表 */
export default function HubMicroSceneOverlay({
  buildingId,
  level,
  anchor,
  goalCount,
  memoryCount,
  dreamSpaceCount,
  onClose,
}: HubMicroSceneOverlayProps) {
  const { data: rpg } = useLifeRPG();
  const scene = HUB_MICRO_SCENES[buildingId];
  const timeOfDay = getTownTimeOfDay();

  useEffect(() => {
    startMicroSceneAmbient('hub', buildingId, rpg.soundEnabled);
    return () => stopMicroSceneAmbient();
  }, [buildingId, rpg.soundEnabled]);

  return (
    <MapOverlayPortal>
      <motion.div
        className="hub-micro-scene-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-label={`${scene.title}室内场景`}
      >
        <motion.div
          className={`hub-micro-scene-frame hub-micro-scene-frame--${timeOfDay}`}
          style={{
            transformOrigin: anchor ? `${anchor.x}% ${anchor.y}%` : '50% 58%',
            ['--hub-gradient-a' as string]: scene.gradient[0],
            ['--hub-gradient-b' as string]: scene.gradient[1],
          }}
          initial={{ scale: 0.55, y: 28, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 12, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          onClick={e => e.stopPropagation()}
        >
          <header className="hub-micro-scene-header">
            <h2>{scene.icon} {scene.title}</h2>
            <button type="button" onClick={onClose} aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
          </header>
          <HubSceneBody
            scene={scene}
            level={level}
            goalCount={goalCount}
            memoryCount={memoryCount}
            dreamSpaceCount={dreamSpaceCount}
          />
          {scene.fullRoute && (
            <Link to={scene.fullRoute} className="hub-micro-scene-external" onClick={onClose}>
              <ExternalLink className="w-3.5 h-3.5" />
              {scene.fullLabel ?? '打开完整页面'}
            </Link>
          )}
        </motion.div>
      </motion.div>
    </MapOverlayPortal>
  );
}
