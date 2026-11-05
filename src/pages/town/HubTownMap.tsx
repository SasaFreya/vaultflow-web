import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVaultData } from '@/hooks/useVaultData';
import { useLifeMemories } from '@/hooks/useLifeMemories';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { useTown } from '@/hooks/useTown';
import { TownPageShell } from '@/components/town/TownNav';
import HubBuilding from '@/components/town/HubBuilding';
import HubTownControls from '@/components/town/HubTownControls';
import TownMapBackground from '@/components/town/TownMapBackground';
import QuickWishModal from '@/components/town/QuickWishModal';
import AssetVolatilityPanel from '@/components/town/AssetVolatilityPanel';
import HubSnapshotToast from '@/components/town/HubSnapshotToast';
import { getTownTimeOfDay, TOWN_TIME_GREETING } from '@/lib/town-time-of-day';
import { formatCurrency, getToday } from '@/lib/storage';
import { getExploreHubWithLayout, getHubBuildingsWithLayout } from '@/lib/town-hub-layout';
import {
  computeExploreEcosystem,
  hubBankEcosystemHint,
  hubWishTreeEcosystemHint,
} from '@/lib/explore-ecosystem';
import {
  hubShopEcosystemHint,
  hubHouseEcosystemHint,
  hubPlazaEcosystemHint,
  hubClockTowerEcosystemHint,
  generateEcoAlerts,
} from '@/lib/explore-ecology-ext';
import { DEFAULT_DOMAIN_GOALS } from '@/lib/domain-timeline';
import { computeDomainGoalsProgress } from '@/lib/life-relation-graph';
import { streakPlazaClass } from '@/lib/domain-goal-streak';
import HubMicroSceneOverlay from '@/components/town/HubMicroSceneOverlay';
import HubTileGround from '@/components/town/HubTileGround';
import TownParticleCanvas from '@/components/town/TownParticleCanvas';
import type { TownWeatherSnapshot } from '@/lib/town-weather';
import { fetchTownWeather } from '@/lib/town-weather';
import { notifyLagAlertsIfNeeded } from '@/lib/eco-lag-notify';
import type { HubLayoutBuildingId, LifeCityId } from '@/types/life-town';
import {
  calcBankLevel,
  calcClockTowerLevel,
  calcDreamHallLevel,
  calcHouseLevel,
  calcPlazaLevel,
  calcShopLevel,
  calcWishTreeLevel,
  type HubBuildingId,
} from '@/lib/town-hub-buildings';
import { loadDreamSpaces } from '@/lib/dream-space-storage';
import HubLagNudge from '@/components/town/HubLagNudge';

export default function HubTownMap() {
  const navigate = useNavigate();
  const { totals, data, settings } = useVaultData();
  const {
    memoriesForActiveCity,
    addMemory,
    activeCityId,
    activeCity,
    data: memoriesData,
    setActiveCityId,
    updateCityName,
    setHubBuildingPosition,
    resetHubLayout,
    addCustomCity,
    isCityAccessible,
  } = useLifeMemories();
  const { levelInfo, data: rpg } = useLifeRPG();
  const { data: town } = useTown();

  const hubEcosystem = useMemo(
    () =>
      computeExploreEcosystem(
        activeCityId,
        activeCity,
        memoriesData.memories,
        data.transactions,
      ),
    [activeCityId, activeCity, memoriesData.memories, data.transactions],
  );

  const ecoAlerts = useMemo(
    () => generateEcoAlerts(activeCityId, activeCity, memoriesData.memories, data.transactions),
    [activeCityId, activeCity, memoriesData.memories, data.transactions],
  );

  const houseStreakClass = streakPlazaClass(activeCity.domainGoalStreakMonths);
  const [streakPulse, setStreakPulse] = useState(false);
  const prevStreakRef = useRef(activeCity.domainGoalStreakMonths ?? 0);

  useEffect(() => {
    const cur = activeCity.domainGoalStreakMonths ?? 0;
    if (cur > prevStreakRef.current) {
      setStreakPulse(true);
      const t = window.setTimeout(() => setStreakPulse(false), 2200);
      prevStreakRef.current = cur;
      return () => window.clearTimeout(t);
    }
    prevStreakRef.current = cur;
  }, [activeCity.domainGoalStreakMonths]);

  const hubEcosystemHints = useMemo(
    () => {
      const goalsProgress = computeDomainGoalsProgress(
        activeCityId,
        memoriesData.memories,
        activeCity.domainGoals ?? DEFAULT_DOMAIN_GOALS,
      );
      return {
        bank: hubBankEcosystemHint(hubEcosystem),
        wishTree: hubWishTreeEcosystemHint(hubEcosystem, memoriesForActiveCity.length),
        shop: hubShopEcosystemHint(hubEcosystem),
        house: hubHouseEcosystemHint(
          memoriesForActiveCity.length,
          hubEcosystem,
          goalsProgress.pct,
          activeCity.domainGoalStreakMonths,
        ),
        plaza: hubPlazaEcosystemHint(hubEcosystem, goalsProgress.pct),
        clockTower: hubClockTowerEcosystemHint(hubEcosystem),
      };
    },
    [hubEcosystem, memoriesForActiveCity.length, activeCityId, memoriesData.memories, activeCity.domainGoals, activeCity.domainGoalStreakMonths],
  );

  useEffect(() => {
    void notifyLagAlertsIfNeeded(ecoAlerts);
  }, [ecoAlerts]);

  useEffect(() => {
    void fetchTownWeather(activeCityId).then(setWeather);
  }, [activeCityId]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [wishOpen, setWishOpen] = useState(false);
  const [volatilityOpen, setVolatilityOpen] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [layoutEdit, setLayoutEdit] = useState(false);
  const [hubScene, setHubScene] = useState<{
    id: HubBuildingId;
    anchor: { x: number; y: number };
  } | null>(null);
  const [weather, setWeather] = useState<TownWeatherSnapshot | null>(null);

  const timeOfDay = getTownTimeOfDay();
  const hubLayout = activeCity.hubLayout;

  const hubBuildings = useMemo(
    () => getHubBuildingsWithLayout(hubLayout),
    [hubLayout],
  );

  const exploreHub = useMemo(
    () => getExploreHubWithLayout(hubLayout),
    [hubLayout],
  );

  const levels = useMemo(() => {
    const activeGoals = data.goals.filter(g => !g.completed).length;
    const checkInDays = new Set((town.checkIns ?? []).map(c => c.timestamp.slice(0, 10))).size;
    const dreamSpaceCount = loadDreamSpaces().spaces.length;
    return {
      house: calcHouseLevel(memoriesForActiveCity.length),
      bank: calcBankLevel(totals.netWorth),
      wishTree: calcWishTreeLevel(activeGoals),
      clockTower: calcClockTowerLevel(checkInDays),
      shop: calcShopLevel(1),
      plaza: calcPlazaLevel(levelInfo.level),
      dreamHall: calcDreamHallLevel(dreamSpaceCount),
    };
  }, [memoriesForActiveCity.length, totals.netWorth, data.goals, town.checkIns, levelInfo.level, hubScene]);

  const badges = useMemo(() => {
    const pendingGoals = data.goals.filter(g => !g.completed).length;
    const dreamSpaceCount = loadDreamSpaces().spaces.length;
    return {
      house: 0,
      bank: 0,
      wishTree: pendingGoals,
      clockTower: 0,
      shop: 0,
      plaza: 0,
      dreamHall: dreamSpaceCount > 0 ? 1 : 0,
    } satisfies Record<HubBuildingId, number>;
  }, [data.goals, hubScene]);

  const handleSnapshot = useCallback(() => {
    const activeGoals = data.goals.filter(g => !g.completed).length;
    const checkInDays = new Set((town.checkIns ?? []).map(c => c.timestamp.slice(0, 10))).size;
    const today = getToday();

    addMemory({
      cityId: activeCityId,
      buildingType: 'home',
      content: [
        `📼 ${today} 人生快照 · ${activeCity.name}`,
        `粮仓储备 ${formatCurrency(totals.netWorth, settings.baseCurrency)}`,
        `进行中心愿 ${activeGoals} 个 · 人生回忆 ${memoriesForActiveCity.length} 条`,
        `连续打卡 ${checkInDays} 天 · RPG Lv.${levelInfo.level}`,
      ].join('\n'),
      date: today,
      source: 'manual',
      mood: 'calm',
      tags: ['快照', '存档点'],
    });

    setSnapshotToast('📼 今日人生快照已写入人生馆时间轴');
    window.setTimeout(() => setSnapshotToast(null), 2800);
  }, [
    activeCity.name,
    activeCityId,
    addMemory,
    data.goals,
    settings.baseCurrency,
    levelInfo.level,
    memoriesForActiveCity.length,
    town.checkIns,
    totals.netWorth,
  ]);

  const handleCitySwitch = useCallback(
    (id: LifeCityId) => {
      if (!isCityAccessible(id)) {
        setSnapshotToast('🔒 在此城市写下 1 条回忆后即可解锁 · 去人生馆');
        window.setTimeout(() => setSnapshotToast(null), 3200);
        return;
      }
      setActiveCityId(id);
      setLayoutEdit(false);
    },
    [isCityAccessible, setActiveCityId],
  );

  const handleAddCity = useCallback(
    (name: string) => {
      addCustomCity(name);
      setLayoutEdit(false);
    },
    [addCustomCity],
  );

  const handleOpenHubScene = useCallback(
    (buildingId: HubLayoutBuildingId, anchor: { x: number; y: number }) => {
      if (buildingId === 'explore') {
        navigate('/town/explore');
        return;
      }
      setHubScene({ id: buildingId as HubBuildingId, anchor });
    },
    [navigate],
  );

  const handlePositionChange = useCallback(
    (buildingId: HubLayoutBuildingId, x: number, y: number) => {
      setHubBuildingPosition(activeCityId, buildingId, x, y);
    },
    [activeCityId, setHubBuildingPosition],
  );

  const eggHandlers = {
    onQuickWish: () => setWishOpen(true),
    onVolatility: () => setVolatilityOpen(true),
    onSnapshot: handleSnapshot,
  };

  const legendText = layoutEdit
    ? '拖拽建筑到喜欢的位置 · 每个城市的布局独立保存'
    : rpg.theme === 'obi'
      ? '点击心愿树精灵 · 快速许愿'
      : rpg.theme === 'cyberpunk'
        ? '点击银行数据流 · 查看资产波动'
        : rpg.theme === 'pixel'
          ? '点击人生馆存档点 · 保存今日快照'
          : '建筑等级随你的真实数据成长';

  return (
    <TownPageShell fullBleed minimalHud locationName={activeCity.name}>
      <div
        ref={canvasRef}
        className={`hub-town-canvas relative w-full h-full min-h-[480px] select-none ${layoutEdit ? 'hub-town-canvas--layout-edit' : ''} ${weather?.kind === 'rain' ? 'hub-town-canvas--rain' : ''} ${weather?.kind === 'snow' ? 'hub-town-canvas--snow' : ''}`}
        data-town-time={timeOfDay}
        data-rpg-theme={rpg.theme}
        data-weather={weather?.kind ?? 'clear'}
      >
        <TownMapBackground timeOfDay={timeOfDay} />
        <HubTileGround />
        <TownParticleCanvas scene="hub-smoke" active />
        <TownParticleCanvas
          scene={weather?.kind === 'rain' ? 'rain' : timeOfDay === 'night' ? 'explore-fireflies' : 'explore-leaves'}
          active={weather?.kind === 'rain' || timeOfDay === 'night'}
        />

        <HubLagNudge
          alerts={ecoAlerts}
          onOpenDomain={bt => navigate(`/town/explore?building=${bt}`)}
          onAiEcho={bt => navigate(`/town/explore?building=${bt}&aiEcho=1`)}
        />

        <HubTownControls
          cities={memoriesData.cities}
          memories={memoriesData.memories}
          activeCityId={activeCityId}
          activeCityName={activeCity.name}
          layoutEdit={layoutEdit}
          weather={weather}
          onLayoutEditChange={setLayoutEdit}
          onCitySwitch={handleCitySwitch}
          onRename={name => updateCityName(activeCityId, name)}
          onResetLayout={() => resetHubLayout(activeCityId)}
          onAddCity={handleAddCity}
          onLockedCityClick={name => {
            setSnapshotToast(`🔒 ${name}：去人生馆写 1 条回忆即可解锁`);
            window.setTimeout(() => setSnapshotToast(null), 3200);
          }}
        />

        <p className="hub-town-welcome">
          {layoutEdit ? '📐 布局编辑中' : TOWN_TIME_GREETING[timeOfDay]}
        </p>

        {hubBuildings.map(b => (
          <HubBuilding
            key={`${activeCityId}-${b.id}-${b.x}-${b.y}`}
            building={b}
            level={levels[b.id as HubBuildingId]}
            badge={badges[b.id as HubBuildingId]}
            layoutMode={layoutEdit}
            canvasRef={canvasRef}
            onPositionChange={handlePositionChange}
            ecosystemHint={
              ['bank', 'wishTree', 'shop', 'house', 'plaza', 'clockTower'].includes(b.id)
                ? hubEcosystemHints[b.id as keyof typeof hubEcosystemHints]
                : undefined
            }
            extraClassName={b.id === 'house' ? houseStreakClass : undefined}
            streakMonths={b.id === 'house' ? activeCity.domainGoalStreakMonths : undefined}
            streakPulse={b.id === 'house' ? streakPulse : undefined}
            {...eggHandlers}
            onOpenScene={handleOpenHubScene}
          />
        ))}

        <HubBuilding
          key={`${activeCityId}-explore-${exploreHub.x}-${exploreHub.y}`}
          building={exploreHub}
          level={2}
          layoutMode={layoutEdit}
          canvasRef={canvasRef}
          onPositionChange={handlePositionChange}
          onOpenScene={handleOpenHubScene}
          {...eggHandlers}
        />

        {hubScene && (
          <HubMicroSceneOverlay
            buildingId={hubScene.id}
            level={levels[hubScene.id] ?? 1}
            anchor={hubScene.anchor}
            goalCount={data.goals.filter(g => !g.completed).length}
            memoryCount={memoriesForActiveCity.length}
            dreamSpaceCount={loadDreamSpaces().spaces.length}
            onClose={() => setHubScene(null)}
          />
        )}

        <div className="hub-town-legend">
          <span>{layoutEdit ? legendText : `${legendText} · 点击建筑进入框内场景`}</span>
        </div>

        <QuickWishModal open={wishOpen} onClose={() => setWishOpen(false)} />
        <AssetVolatilityPanel open={volatilityOpen} onClose={() => setVolatilityOpen(false)} />
        <HubSnapshotToast message={snapshotToast} />
      </div>
    </TownPageShell>
  );
}
