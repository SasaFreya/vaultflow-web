import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTown } from '@/hooks/useTown';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { getLocation } from '@/lib/town-data';
import { locationExpMultiplier } from '@/lib/town-utils';
import { TownPageShell } from '@/components/town/TownNav';
import CheckInModal from '@/components/town/CheckInModal';
import MicroSceneStage from '@/components/town/MicroSceneStage';
import type { SceneHotspot } from '@/types/town';
import type { CheckInDuration } from '@/lib/town-checkin';

const CATEGORY_LABEL: Record<string, string> = {
  vocation: '事业',
  body: '健身',
  mind: '学习',
  spirit: '休闲',
};

export default function LocationScene() {
  const { locationId } = useParams<{ locationId: string }>();
  const navigate = useNavigate();
  const { data, comfort, recordCheckIn, recentCheckIns } = useTown();
  const { data: rpg, completeQuest, applyCheckInRewards } = useLifeRPG();

  const [checkInTarget, setCheckInTarget] = useState<SceneHotspot | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const location = useMemo(
    () => (locationId ? getLocation(locationId, data) : undefined),
    [locationId, data],
  );

  if (!location) {
    return (
      <TownPageShell>
        <p style={{ color: 'var(--rpg-text-secondary)' }}>地点不存在</p>
        <Link to="/town/explore">返回外出地图</Link>
      </TownPageShell>
    );
  }

  const mult = locationExpMultiplier(location.category);
  const bonusLabel = `地点 ${mult}x · 舒适 +${Math.round(comfort.bonus * 100)}%`;
  const relatedQuests = rpg.quests.filter(q => !q.completed).slice(0, 3);
  const micro = location.scene.micro;

  const handleConfirmCheckIn = (durationMin: CheckInDuration, note: string) => {
    if (!locationId || !checkInTarget) return;

    const record = recordCheckIn(
      locationId,
      checkInTarget.action,
      checkInTarget.label,
      durationMin,
      note || undefined,
    );
    if (!record) return;

    const result = applyCheckInRewards(location.category, durationMin, comfort.bonus);
    setCheckInTarget(null);
    setToast(result.lines.join(' · '));
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <TownPageShell fullBleed>
      <div
        className="town-location-scene h-full flex flex-col overflow-y-auto"
        style={{ background: `linear-gradient(165deg, ${location.scene.gradient[0]}, ${location.scene.gradient[1]})` }}
      >
        <header className="town-location-header shrink-0 flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/town/explore')}
            className="town-hud-pill town-hud-pill--ghost"
          >
            <ArrowLeft className="w-4 h-4" /> 地图
          </button>
          <h1 className="text-sm font-bold" style={{ color: 'var(--aobi-text, var(--rpg-text))' }}>
            {location.icon} {location.name}
          </h1>
          <span className="text-[10px] px-2 py-1 rounded-full town-map-chip">
            {location.realWorld.distanceKm}km
          </span>
        </header>

        {toast && (
          <div className="mx-4 mt-2 px-4 py-2 rounded-2xl text-xs font-semibold text-center z-30 town-checkin-toast">
            ✨ 打卡成功 · {toast}
          </div>
        )}

        {micro ? (
          <MicroSceneStage
            micro={micro}
            hotspots={location.scene.interactivePoints}
            onHotspot={setCheckInTarget}
          />
        ) : (
          <div className="flex-1 flex flex-wrap items-center justify-center gap-6 p-6 min-h-[280px]">
            {location.scene.interactivePoints.map(point => (
              <button
                key={point.id}
                type="button"
                onClick={() => setCheckInTarget(point)}
                className="town-hotspot-btn group"
              >
                <span className="text-4xl">{point.icon}</span>
                <span className="font-semibold text-sm">{point.name}</span>
                <span className="town-hotspot-tag">{point.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="shrink-0 p-4 space-y-3 pb-8">
          <div className="town-obi-card p-4 mx-3">
            <p className="text-xs font-semibold mb-2">
              📍 {CATEGORY_LABEL[location.category] ?? location.category} · EXP 加成 {mult}x
            </p>
            <p className="text-[10px]" style={{ color: 'var(--aobi-text-secondary, var(--rpg-text-secondary))' }}>
              访问 {location.visitCount} 次
              {location.lastVisited && ` · 上次 ${location.lastVisited}`}
              {' · '}{bonusLabel}
            </p>
          </div>

          {recentCheckIns.length > 0 && (
            <div className="town-obi-card p-4 mx-3">
              <p className="text-xs font-semibold mb-2">最近打卡</p>
              <ul className="space-y-1">
                {recentCheckIns.map(ci => (
                  <li key={ci.id} className="text-[10px]" style={{ color: 'var(--aobi-text-secondary, var(--rpg-text-secondary))' }}>
                    {new Date(ci.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{ci.actionLabel}
                    {ci.durationMin > 0 && ` · ${ci.durationMin}分`}
                    {ci.note && ` · ${ci.note}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {relatedQuests.length > 0 && (
            <div className="town-obi-card p-4 mx-3">
              <p className="text-xs font-semibold mb-2">相关副本</p>
              <ul className="space-y-1">
                {relatedQuests.map(q => (
                  <li key={q.id} className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--aobi-text-secondary, var(--rpg-text-secondary))' }}>{q.title}</span>
                    <button
                      type="button"
                      onClick={() => completeQuest(q.id)}
                      className="btn-aobi-action px-3 py-1 rounded-full text-[10px] font-semibold text-white"
                    >
                      完成
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {checkInTarget && (
          <CheckInModal
            location={location}
            actionLabel={checkInTarget.label}
            hotspotStory={checkInTarget.story}
            onConfirm={handleConfirmCheckIn}
            onClose={() => setCheckInTarget(null)}
          />
        )}
      </div>
    </TownPageShell>
  );
}
