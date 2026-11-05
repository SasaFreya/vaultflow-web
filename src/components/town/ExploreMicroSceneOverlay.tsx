import { useRef, useState, useEffect } from 'react';
import { BarChart3, Camera, PenLine, Sparkles, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MicroSceneStage from '@/components/town/MicroSceneStage';
import MicroSceneMemorySheet from '@/components/town/MicroSceneMemorySheet';
import MicroSceneIllustrationLayer from '@/components/town/MicroSceneIllustrationLayer';
import MicroScenePhotoWall from '@/components/town/MicroScenePhotoWall';
import MicroSceneWeatherParticles from '@/components/town/MicroSceneWeatherParticles';
import MapOverlayPortal from '@/components/town/MapOverlayPortal';
import CheckInModal from '@/components/town/CheckInModal';
import type { ExploreMicroSceneView } from '@/lib/explore-micro-scene';
import type { SceneHotspot } from '@/types/town';
import type { CheckInDuration } from '@/lib/town-checkin';
import { useTown } from '@/hooks/useTown';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { useLifeMemories } from '@/hooks/useLifeMemories';
import { useVaultData } from '@/hooks/useVaultData';
import { getLocation } from '@/lib/town-data';
import { locationExpMultiplier } from '@/lib/town-utils';
import { buildCheckInMemoryPrefill, stashMemoryDraftPrefill } from '@/lib/memory-checkin-prefill';
import { getWeatherEcologyEffect } from '@/lib/town-weather-ecology';
import type { TownWeatherSnapshot } from '@/lib/town-weather';
import type { LocationCategory } from '@/types/town';
import type { TownTimeOfDay } from '@/lib/town-time-of-day';
import { getCharacterPreset } from '@/lib/rpg-characters';
import {
  generateMicroSceneWallpaper,
  getCachedMicroSceneWallpaper,
} from '@/lib/micro-scene-aigc';
import { startMicroSceneAmbient, stopMicroSceneAmbient } from '@/lib/micro-scene-ambient';
import { parseGymCsv } from '@/lib/import-gym-csv';

const CATEGORY_LABEL: Record<string, string> = {
  vocation: '事业',
  body: '健身',
  mind: '学习',
  spirit: '休闲',
  home: '小窝',
};

interface ExploreMicroSceneOverlayProps {
  scene: ExploreMicroSceneView;
  comfortBonus: number;
  weather?: TownWeatherSnapshot | null;
  timeOfDay?: TownTimeOfDay;
  anchor?: { x: number; y: number } | null;
  onClose: () => void;
  onOpenDrawer: () => void;
}

/** 地图内框式微场景 — Portal 浮层，不离开游戏 */
export default function ExploreMicroSceneOverlay({
  scene,
  comfortBonus,
  weather,
  timeOfDay = 'day',
  anchor,
  onClose,
  onOpenDrawer,
}: ExploreMicroSceneOverlayProps) {
  const { data: townData, recordCheckIn, comfort } = useTown();
  const { checkIn: memoryCheckIn, activeCityId, addMemory, data: lifeData } = useLifeMemories();
  const { applyCheckInRewards, data: rpg } = useLifeRPG();
  const { settings } = useVaultData();
  const [checkInTarget, setCheckInTarget] = useState<SceneHotspot | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composePrefill, setComposePrefill] = useState<ReturnType<typeof buildCheckInMemoryPrefill> | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [wallpaper, setWallpaper] = useState<string | null>(() =>
    getCachedMicroSceneWallpaper(scene.buildingType),
  );
  const [aigcBusy, setAigcBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const domainMemories = lifeData.memories.filter(
    m => m.cityId === activeCityId && m.buildingType === scene.buildingType,
  );

  useEffect(() => {
    startMicroSceneAmbient('explore', scene.buildingType, rpg.soundEnabled);
    return () => stopMicroSceneAmbient();
  }, [scene.buildingType, rpg.soundEnabled]);

  const category = scene.category === 'home' ? 'spirit' : scene.category;
  const mult = locationExpMultiplier(category as LocationCategory);
  const weatherFx = getWeatherEcologyEffect(weather, scene.buildingType);
  const bonusLabel = `地点 ${mult}x · 舒适 +${Math.round(comfort.bonus * 100)}%${weatherFx.expBonusPct > 0 ? ` · 天气 +${weatherFx.expBonusPct}%` : ''}`;

  const frameStyle = anchor
    ? ({
        ['--scene-origin-x' as string]: `${anchor.x}%`,
        ['--scene-origin-y' as string]: `${anchor.y}%`,
      } as React.CSSProperties)
    : undefined;

  const openCompose = (hotspot?: SceneHotspot, durationMin?: number) => {
    const point = hotspot ?? scene.hotspots[0];
    if (!point) return;
    setComposePrefill(buildCheckInMemoryPrefill(scene.buildingType, scene.name, point, durationMin));
    setShowCompose(true);
  };

  const handleHotspot = (point: SceneHotspot) => {
    if (scene.buildingType === 'home') {
      if (point.action === 'journal') {
        openCompose(point);
        return;
      }
      stashMemoryDraftPrefill(buildCheckInMemoryPrefill(scene.buildingType, scene.name, point));
      memoryCheckIn('home');
      setToast('在家休息 · 可点「写回忆」补充');
      setTimeout(() => setToast(null), 3200);
      return;
    }
    setCheckInTarget(point);
  };

  const checkInLocation =
    scene.buildingType === 'home' ? null : getLocation(scene.buildingType, townData);

  const handleConfirmCheckIn = (durationMin: CheckInDuration, note: string) => {
    if (!checkInTarget) return;
    const locationId = scene.buildingType;
    const record = recordCheckIn(
      locationId,
      checkInTarget.action,
      checkInTarget.label,
      durationMin,
      note || undefined,
    );
    if (!record) return;
    const result = applyCheckInRewards(
      category as LocationCategory,
      durationMin,
      comfortBonus,
      weatherFx.expBonusPct,
    );
    const prefill = buildCheckInMemoryPrefill(
      scene.buildingType,
      scene.name,
      checkInTarget,
      durationMin,
    );
    stashMemoryDraftPrefill(prefill);
    setComposePrefill(prefill);
    setCheckInTarget(null);
    setToast(`${result.lines.join(' · ')} · 可写回忆`);
    setTimeout(() => setToast(null), 3200);
  };

  const handleAigcWallpaper = async () => {
    setAigcBusy(true);
    const url = await generateMicroSceneWallpaper(scene.buildingType, settings.ai ?? {});
    if (url) setWallpaper(url);
    else setToast('AIGC 需配置百炼 API Key，已使用手绘插画');
    setAigcBusy(false);
  };

  return (
    <MapOverlayPortal>
      <AnimatePresence>
        <motion.div
          className="explore-micro-scene-overlay explore-micro-scene-overlay--framed explore-micro-scene-overlay--portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label={`${scene.name} 室内场景`}
          onClick={onClose}
        >
          <motion.div
            className={`explore-micro-scene-frame explore-micro-scene-frame--${timeOfDay}`}
            style={{
              ...frameStyle,
              transformOrigin: anchor ? `${anchor.x}% ${anchor.y}%` : '50% 62%',
              ['--scene-gradient-a' as string]: scene.gradient[0],
              ['--scene-gradient-b' as string]: scene.gradient[1],
            }}
            initial={{ scale: 0.55, y: 32, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.88, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            onClick={e => e.stopPropagation()}
          >
            <header className="explore-micro-scene-frame-header">
              <h2 className="explore-micro-scene-title">
                {scene.icon} {scene.name}
              </h2>
              <span className="explore-micro-scene-frame-badge">
                {CATEGORY_LABEL[scene.category] ?? scene.category}
              </span>
              <button type="button" className="explore-micro-scene-frame-close" onClick={onClose} aria-label="关闭">
                <X className="w-4 h-4" />
              </button>
            </header>

            {toast && (
              <div className="explore-micro-scene-toast">
                <p>✨ {toast}</p>
                <button type="button" className="town-hud-pill town-hud-pill--ghost text-[10px]" onClick={() => openCompose()}>
                  写回忆 →
                </button>
              </div>
            )}

            {weatherFx.hint && <p className="explore-micro-scene-weather-hint">{weatherFx.hint}</p>}

            <div className="explore-micro-scene-frame-stage">
              <MicroSceneIllustrationLayer
                buildingType={scene.buildingType}
                timeOfDay={timeOfDay}
                wallpaperUrl={wallpaper}
              />
              <MicroSceneWeatherParticles weather={weather} />
              <MicroSceneStage
                micro={scene.micro}
                hotspots={scene.hotspots}
                characterPreset={getCharacterPreset(rpg.selectedCharacterId)}
                characterTheme={rpg.theme}
                onHotspot={handleHotspot}
              />
            </div>

            <MicroScenePhotoWall memories={domainMemories} />

            <p className="explore-micro-scene-meta">{bonusLabel}</p>

            <div className="explore-micro-scene-action-rail">
              <button type="button" className="explore-micro-scene-rail-btn" onClick={() => photoRef.current?.click()}>
                <Camera className="w-3.5 h-3.5" /> 拍下今天
              </button>
              <button type="button" className="explore-micro-scene-rail-btn" onClick={() => openCompose()}>
                <PenLine className="w-3.5 h-3.5" /> 写回忆
              </button>
              <button
                type="button"
                className="explore-micro-scene-rail-btn explore-micro-scene-rail-btn--ghost"
                disabled={aigcBusy}
                onClick={() => void handleAigcWallpaper()}
              >
                <Sparkles className="w-3.5 h-3.5" /> {aigcBusy ? '生成中' : 'AIGC 壁纸'}
              </button>
              <button type="button" className="explore-micro-scene-rail-btn explore-micro-scene-rail-btn--ghost" onClick={onOpenDrawer}>
                <BarChart3 className="w-3.5 h-3.5" /> 生态数据
              </button>
              {scene.buildingType === 'gym' && (
                <button
                  type="button"
                  className="explore-micro-scene-rail-btn explore-micro-scene-rail-btn--ghost"
                  onClick={() => csvRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" /> 导入打卡
                </button>
              )}
            </div>

            <input
              ref={csvRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const drafts = parseGymCsv(String(reader.result), activeCityId).slice(0, 5);
                  if (drafts.length === 0) {
                    setToast('CSV 无有效行 · 需含 date 列');
                    return;
                  }
                  drafts.forEach(d =>
                    addMemory({
                      cityId: d.cityId,
                      buildingType: d.buildingType,
                      content: d.content,
                      date: d.date,
                      mood: d.mood,
                      tags: d.tags,
                      source: 'manual',
                    }),
                  );
                  setToast(`已导入 ${drafts.length} 条健身回忆草稿`);
                  setTimeout(() => setToast(null), 2800);
                };
                reader.readAsText(file);
              }}
            />

            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0] ?? null;
                if (file) {
                  setPendingPhoto(file);
                  openCompose();
                }
                e.target.value = '';
              }}
            />
          </motion.div>

          {showCompose && (
            <div className="explore-micro-scene-compose-layer" onClick={e => e.stopPropagation()}>
              <MicroSceneMemorySheet
                buildingType={scene.buildingType}
                placeName={scene.name}
                initialContent={composePrefill?.content}
                initialMood={composePrefill?.mood}
                initialTags={composePrefill?.tags}
                initialPhotoFile={pendingPhoto}
                onClose={() => {
                  setShowCompose(false);
                  setPendingPhoto(null);
                }}
                onSaved={msg => {
                  setShowCompose(false);
                  setPendingPhoto(null);
                  setToast(msg);
                  setTimeout(() => setToast(null), 2500);
                }}
              />
            </div>
          )}

          {checkInTarget && checkInLocation && (
            <div className="explore-micro-scene-checkin-layer" onClick={e => e.stopPropagation()}>
              <CheckInModal
                location={checkInLocation}
                actionLabel={checkInTarget.label}
                hotspotStory={checkInTarget.story}
                onConfirm={handleConfirmCheckIn}
                onClose={() => setCheckInTarget(null)}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </MapOverlayPortal>
  );
}
