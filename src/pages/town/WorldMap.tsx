import { useMemo, useState, useRef, useCallback, type RefObject, useEffect, type CSSProperties } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { BuildingType, LifeCityId } from '@/types/life-town';
import type { TownLocation } from '@/types/town';
import type { TownWeatherSnapshot } from '@/lib/town-weather';
import { fetchTownWeather } from '@/lib/town-weather';
import { useTown } from '@/hooks/useTown';
import { useLifeMemories } from '@/hooks/useLifeMemories';
import { useVaultData } from '@/hooks/useVaultData';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { TownPageShell } from '@/components/town/TownNav';
import TownMapBackground from '@/components/town/TownMapBackground';
import ExploreMapControls from '@/components/town/ExploreMapControls';
import ExploreMapPin from '@/components/town/ExploreMapPin';
import ExploreLifeZones from '@/components/town/ExploreLifeZones';
import ExploreEcosystemBar from '@/components/town/ExploreEcosystemBar';
import ExploreRouteRunners from '@/components/town/ExploreRouteRunners';
import ExploreRouteRunnersPixi from '@/components/town/ExploreRouteRunnersPixi';
import ExploreRouteTrailLayer from '@/components/town/ExploreRouteTrailLayer';
import ExploreHandDrawnGround from '@/components/town/ExploreHandDrawnGround';
import ExploreMicroSceneOverlay from '@/components/town/ExploreMicroSceneOverlay';
import ExploreCityFogTransition from '@/components/town/ExploreCityFogTransition';
import ExploreRouteTrailTimeline from '@/components/town/ExploreRouteTrailTimeline';
import ExploreRouteHeatmapLayer from '@/components/town/ExploreRouteHeatmapLayer';
import ExploreHeatmapPixi, {
  loadPixiHeatmapEnabled,
  savePixiHeatmapEnabled,
} from '@/components/town/ExploreHeatmapPixi';
import ExploreUnifiedPixiLayer, {
  loadPixiUnifiedEnabled,
  savePixiUnifiedEnabled,
} from '@/components/town/ExploreUnifiedPixiLayer';
import ExploreHeatDrillPanel from '@/components/town/ExploreHeatDrillPanel';
import { heatZoneToBuilding } from '@/lib/explore-route-heatmap';
import { buildCheckInMemoryPrefill, stashMemoryDraftPrefill } from '@/lib/memory-checkin-prefill';
import TownParticlePixi from '@/components/town/TownParticlePixi';
import ExploreTimelineBar from '@/components/town/ExploreTimelineBar';
import ExploreCrossCityPanel from '@/components/town/ExploreCrossCityPanel';
import ExploreEcoFloatCard from '@/components/town/ExploreEcoFloatCard';
import ExploreEcoAlerts from '@/components/town/ExploreEcoAlerts';
import ExploreGeoMarkers from '@/components/town/ExploreGeoMarkers';
import ExploreMapLayer from '@/components/town/ExploreMapLayer';
import TownParticleCanvas from '@/components/town/TownParticleCanvas';
import { generateBillEchoDraft } from '@/lib/memory-ai';
import { notifyLagAlertsIfNeeded } from '@/lib/eco-lag-notify';
import { notifyPwaEcoIfNeeded } from '@/lib/pwa-eco-notify';
import { playCityTransitionWhoosh, playCityAmbientLoop, stopCityAmbientLoop, loadCityAmbientEnabled } from '@/lib/rpg-sounds';
import {
  loadPixiFpsHudEnabled,
  savePixiFpsHudEnabled,
} from '@/components/town/ExploreRouteRunnersPixi';
import { getTownTimeOfDay } from '@/lib/town-time-of-day';
import {
  buildDomainDetail,
  generateEcoAlerts,
} from '@/lib/explore-ecology-ext';
import {
  getExploreHome,
  getLocationsWithExploreLayout,
  EXPLORE_HOME_ID,
  DEFAULT_EXPLORE_HOME,
  clampExplorePosition,
} from '@/lib/town-explore-layout';
import {
  computeExploreEcosystem,
  computeCityEcosystemSummary,
  computeCrossCityDomainComparison,
  resolveExplorePlaceName,
  separateOverlappingPins,
  LIFE_DOMAIN_META,
  type ExploreTimelinePeriod,
} from '@/lib/explore-ecosystem';
import { resolveExploreMicroScene, buildFallbackMicroScene } from '@/lib/explore-micro-scene';
import { markRouteVisited } from '@/lib/explore-route-trails';
import { getWeatherEcologyEffect } from '@/lib/town-weather-ecology';

interface DraggablePinProps {
  id: string;
  x: number;
  y: number;
  zIndex?: number;
  layoutMode: boolean;
  bounce?: boolean;
  highlighted?: boolean;
  canvasRef: RefObject<HTMLElement | null>;
  onPositionChange?: (id: string, x: number, y: number) => void;
  onClick?: () => void;
  children: React.ReactNode;
}

function DraggablePin({
  id,
  x,
  y,
  zIndex = 40,
  layoutMode,
  bounce,
  highlighted,
  canvasRef,
  onPositionChange,
  onClick,
  children,
}: DraggablePinProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = () => {
    if (!layoutMode || !canvasRef.current || !nodeRef.current || !onPositionChange) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const node = nodeRef.current.getBoundingClientRect();
    const cx = node.left + node.width / 2;
    const cy = node.top + node.height / 2;
    const pos = clampExplorePosition(
      ((cx - canvas.left) / canvas.width) * 100,
      ((cy - canvas.top) / canvas.height) * 100,
    );
    onPositionChange(id, pos.x, pos.y);
  };

  return (
    <motion.div
      ref={nodeRef}
      key={`${id}-${x.toFixed(1)}-${y.toFixed(1)}`}
      className={`explore-map-pin-wrap ${layoutMode ? 'explore-map-pin-wrap--layout' : ''} ${bounce ? 'explore-map-pin-wrap--bounce' : ''} ${highlighted ? 'explore-map-pin-wrap--highlight' : ''}`}
      style={{ left: `${x}%`, top: `${y}%`, zIndex: layoutMode ? 50 : zIndex }}
      initial={false}
      animate={{ x: 0, y: 0 }}
      transition={{ duration: 0 }}
      drag={layoutMode}
      dragMomentum={false}
      dragElastic={0.08}
      dragConstraints={canvasRef}
      onDragEnd={handleDragEnd}
      whileHover={layoutMode ? undefined : { scale: 1.05, y: -4 }}
      whileTap={layoutMode ? undefined : { scale: 0.97 }}
    >
      <button
        type="button"
        className="explore-map-pin-hit"
        onClick={e => {
          if (layoutMode) return;
          e.stopPropagation();
          onClick?.();
        }}
        tabIndex={layoutMode ? -1 : 0}
        style={layoutMode ? { pointerEvents: 'none' } : undefined}
      >
        {children}
      </button>
      {layoutMode && <span className="hub-building-drag-hint" aria-hidden>⠿</span>}
    </motion.div>
  );
}

export default function WorldMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLDivElement>(null);
  const { data: townData, comfort } = useTown();
  const { data: vaultData, settings } = useVaultData();
  const { data: rpg } = useLifeRPG();
  const {
    activeCity,
    activeCityId,
    data: lifeData,
    setActiveCityId,
    isCityAccessible,
    setExploreLocationPosition,
    resetExploreLayout,
    updateExploreLocationName,
  } = useLifeMemories();

  const [layoutEdit, setLayoutEdit] = useState(false);
  const [timelinePeriod, setTimelinePeriod] = useState<ExploreTimelinePeriod>('month');
  const [drawerBuilding, setDrawerBuilding] = useState<BuildingType | null>(null);
  const [sceneBuilding, setSceneBuilding] = useState<BuildingType | null>(null);
  const [pinBounceId, setPinBounceId] = useState<string | null>(null);
  const [sceneAnchor, setSceneAnchor] = useState<{ x: number; y: number } | null>(null);
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
  const [pendingAiEcho, setPendingAiEcho] = useState<BuildingType | null>(null);
  const [trailRefresh, setTrailRefresh] = useState(0);
  const [fogTransition, setFogTransition] = useState<{ active: boolean; name: string }>({
    active: false,
    name: '',
  });
  const [showFpsHud, setShowFpsHud] = useState(() => loadPixiFpsHudEnabled());
  const [pixiHeatmap, setPixiHeatmap] = useState(() => loadPixiHeatmapEnabled());
  const [pixiUnified, setPixiUnified] = useState(() => loadPixiUnifiedEnabled());
  const [heatDrillZone, setHeatDrillZone] = useState<string | null>(null);
  const [pixiFps, setPixiFps] = useState(0);
  const [aiEchoLoading, setAiEchoLoading] = useState(false);
  const [showMapLayer, setShowMapLayer] = useState(false);
  const [weather, setWeather] = useState<TownWeatherSnapshot | null>(null);
  const handleAiEchoRef = useRef<(buildingType: BuildingType) => Promise<void>>(async () => {});

  const timeOfDay = getTownTimeOfDay();
  const exploreLayout = activeCity.exploreLayout;
  const exploreNames = activeCity.exploreNames;

  const rawLocations = useMemo(
    () => getLocationsWithExploreLayout(townData.locations, exploreLayout),
    [townData.locations, exploreLayout],
  );

  const home = getExploreHome(exploreLayout);

  const separatedPositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {
      [EXPLORE_HOME_ID]: home,
    };
    rawLocations.forEach(loc => {
      map[loc.id] = loc.position;
    });
    return separateOverlappingPins(map);
  }, [home, rawLocations]);

  const locations = useMemo(
    () =>
      rawLocations.map(loc => ({
        ...loc,
        position: separatedPositions[loc.id] ?? loc.position,
      })),
    [rawLocations, separatedPositions],
  );

  const resolvedHome = separatedPositions[EXPLORE_HOME_ID] ?? home;

  const ecosystem = useMemo(
    () =>
      computeExploreEcosystem(
        activeCityId,
        activeCity,
        lifeData.memories,
        vaultData.transactions,
        timelinePeriod,
      ),
    [activeCityId, activeCity, lifeData.memories, vaultData.transactions, timelinePeriod],
  );

  const summary = useMemo(() => computeCityEcosystemSummary(ecosystem), [ecosystem]);

  const crossCity = useMemo(
    () => computeCrossCityDomainComparison(lifeData.cities, lifeData.memories, vaultData.transactions),
    [lifeData.cities, lifeData.memories, vaultData.transactions],
  );

  const ecoAlerts = useMemo(
    () => generateEcoAlerts(activeCityId, activeCity, lifeData.memories, vaultData.transactions),
    [activeCityId, activeCity, lifeData.memories, vaultData.transactions],
  );

  const drawerDetail = useMemo(() => {
    if (!drawerBuilding) return null;
    const fallback =
      drawerBuilding === 'home'
        ? '我的小窝'
        : townData.locations.find(l => l.id === drawerBuilding)?.name ?? LIFE_DOMAIN_META[drawerBuilding].defaultPlaceName;
    const placeName = resolveExplorePlaceName(drawerBuilding, fallback, exploreNames);
    return buildDomainDetail(
      drawerBuilding,
      placeName,
      activeCityId,
      lifeData.memories,
      vaultData.transactions,
      activeCity,
      ecosystem,
    );
  }, [
    drawerBuilding,
    activeCityId,
    activeCity,
    lifeData.memories,
    vaultData.transactions,
    ecosystem,
    exploreNames,
    townData.locations,
  ]);

  const vitalityByBuilding = useMemo(
    () =>
      Object.fromEntries(
        Object.values(ecosystem).map(n => [n.buildingType, n.vitality]),
      ) as Partial<Record<BuildingType, (typeof ecosystem)['home']['vitality']>>,
    [ecosystem],
  );

  const hasGeoLayer = useMemo(
    () => lifeData.memories.some(m => m.cityId === activeCityId && m.geo),
    [lifeData.memories, activeCityId],
  );

  const openDomainDrawer = useCallback((buildingType: BuildingType) => {
    if (layoutEdit) return;
    setDrawerBuilding(buildingType);
  }, [layoutEdit]);

  const openMicroScene = useCallback(
    (buildingType: BuildingType, anchor?: { x: number; y: number }) => {
      if (layoutEdit) return;
      markRouteVisited(activeCityId, buildingType === 'home' ? EXPLORE_HOME_ID : buildingType);
      setTrailRefresh(v => v + 1);
      setDrawerBuilding(null);
      setSceneBuilding(buildingType);
      setPinBounceId(buildingType === 'home' ? EXPLORE_HOME_ID : buildingType);
      if (anchor) setSceneAnchor(anchor);
      window.setTimeout(() => setPinBounceId(null), 520);
    },
    [layoutEdit, activeCityId],
  );

  const microSceneView = useMemo(() => {
    if (!sceneBuilding) return null;
    const fallback =
      sceneBuilding === 'home'
        ? '我的小窝'
        : townData.locations.find(l => l.id === sceneBuilding)?.name ??
          LIFE_DOMAIN_META[sceneBuilding].defaultPlaceName;
    return (
      resolveExploreMicroScene(
        sceneBuilding,
        townData,
        resolveExplorePlaceName(sceneBuilding, fallback, exploreNames),
      ) ?? buildFallbackMicroScene(sceneBuilding, fallback)
    );
  }, [sceneBuilding, townData, exploreNames]);

  const handleCitySwitch = useCallback(
    (id: LifeCityId) => {
      if (id === activeCityId) return;
      const city = lifeData.cities.find(c => c.id === id);
      stopCityAmbientLoop();
      playCityTransitionWhoosh(rpg.soundEnabled);
      playCityAmbientLoop(loadCityAmbientEnabled(), rpg.soundEnabled, id);
      setFogTransition({ active: true, name: city?.name ?? '' });
      window.setTimeout(() => {
        setActiveCityId(id);
        window.setTimeout(() => setFogTransition({ active: false, name: '' }), 850);
      }, 380);
    },
    [activeCityId, lifeData.cities, setActiveCityId, rpg.soundEnabled],
  );

  useEffect(() => () => stopCityAmbientLoop(), []);

  useEffect(() => {
    const api = window.electronAPI as typeof window.electronAPI & {
      onWeatherSceneNavigate?: (cb: (d: { buildingType: BuildingType }) => void) => () => void;
    };
    if (!api?.onWeatherSceneNavigate) return;
    return api.onWeatherSceneNavigate(({ buildingType }) =>
      openMicroScene(buildingType as BuildingType),
    );
  }, [openMicroScene]);

  const handlePinClick = useCallback(
    (buildingType: BuildingType, pinId: string, x: number, y: number) => {
      setDrawerBuilding(null);
      setHighlightedPinId(null);
      openMicroScene(buildingType, { x, y });
      setPinBounceId(pinId);
    },
    [openMicroScene],
  );

  useEffect(() => {
    const onWeatherScene = (e: Event) => {
      const building = (e as CustomEvent<{ buildingType: BuildingType }>).detail.buildingType;
      openMicroScene(building);
      const prefill = buildCheckInMemoryPrefill(
        building,
        LIFE_DOMAIN_META[building].defaultPlaceName,
        {
          id: 'weather-push',
          name: '天气',
          icon: '🌤️',
          action: 'relax',
          label: '天气推送',
          story: '从天气提醒进入',
        },
      );
      stashMemoryDraftPrefill(prefill);
    };
    window.addEventListener('vaultflow-weather-scene', onWeatherScene);
    return () => window.removeEventListener('vaultflow-weather-scene', onWeatherScene);
  }, [openMicroScene]);

  const weatherHint = useMemo(() => {
    if (!weather) return null;
    const gymFx = getWeatherEcologyEffect(weather, 'gym');
    const libFx = getWeatherEcologyEffect(weather, 'library');
    return gymFx.hint ?? libFx.hint ?? null;
  }, [weather]);

  const particleScene =
    weather?.kind === 'rain'
      ? null
      : timeOfDay === 'night'
        ? ('explore-fireflies' as const)
        : ('explore-leaves' as const);

  const composeFromDrawer = useCallback(
    (buildingType: BuildingType) => {
      setDrawerBuilding(null);
      openMicroScene(buildingType);
    },
    [openMicroScene],
  );

  const handleAiEcho = useCallback(
    async (buildingType: BuildingType) => {
      if (aiEchoLoading) return;
      const detail =
        drawerDetail?.buildingType === buildingType
          ? drawerDetail
          : buildDomainDetail(
              buildingType,
              buildingType === 'home'
                ? '我的小窝'
                : townData.locations.find(l => l.id === buildingType)?.name ??
                    LIFE_DOMAIN_META[buildingType].defaultPlaceName,
              activeCityId,
              lifeData.memories,
              vaultData.transactions,
              activeCity,
              ecosystem,
            );
      if (detail.bills.length === 0) return;
      setAiEchoLoading(true);
      try {
        const draft = await generateBillEchoDraft(
          {
            cityId: activeCityId,
            buildingType,
            bills: detail.bills.map(b => ({
              label: b.label,
              amount: b.amount,
              date: b.date,
            })),
          },
          settings.ai,
        );
        sessionStorage.setItem(
          'memory_draft_prefill',
          JSON.stringify({
            buildingType,
            content: draft.content,
            mood: draft.mood,
            tags: draft.tags,
            date: detail.bills[0]?.date,
            source: 'ai_chat',
          }),
        );
        setDrawerBuilding(null);
        navigate(`/town/loft?tab=memories&building=${buildingType}&compose=1`);
      } catch {
        /* AI 不可用时静默失败，用户可在回忆页手动写 */
      } finally {
        setAiEchoLoading(false);
      }
    },
    [drawerDetail, aiEchoLoading, activeCityId, settings.ai, navigate, townData.locations, lifeData.memories, vaultData.transactions, activeCity, ecosystem],
  );

  handleAiEchoRef.current = handleAiEcho;

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data = e.data as { type?: string; buildingType?: BuildingType };
      if (data?.type === 'vaultflow-weather-scene' && data.buildingType) {
        openMicroScene(data.buildingType);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
  }, [openMicroScene]);

  useEffect(() => {
    void fetchTownWeather(activeCityId).then(setWeather);
  }, [activeCityId]);

  useEffect(() => {
    const bt = searchParams.get('building');
    if (!bt || !(['home', 'company', 'library', 'gym', 'cafe'] as BuildingType[]).includes(bt as BuildingType)) return;
    const building = bt as BuildingType;
    setDrawerBuilding(null);
    openMicroScene(building);
    if (searchParams.get('aiEcho') === '1') {
      setPendingAiEcho(building);
    }
    navigate('/town/explore', { replace: true });
  }, [searchParams, openMicroScene, navigate]);

  useEffect(() => {
    if (!pendingAiEcho || sceneBuilding !== pendingAiEcho) return;
    const bt = pendingAiEcho;
    setPendingAiEcho(null);
    void handleAiEchoRef.current(bt);
  }, [pendingAiEcho, sceneBuilding]);

  useEffect(() => {
    void notifyLagAlertsIfNeeded(ecoAlerts);
    void notifyPwaEcoIfNeeded(ecoAlerts, weather);
  }, [ecoAlerts, weather]);

  const mapZoomStyle = useMemo(() => {
    if (!sceneBuilding || !sceneAnchor) return undefined;
    return {
      ['--map-zoom-x' as string]: `${sceneAnchor.x}%`,
      ['--map-zoom-y' as string]: `${sceneAnchor.y}%`,
    } as CSSProperties;
  }, [sceneBuilding, sceneAnchor]);

  const handleAlertClick = useCallback(
    (buildingType: BuildingType, action?: 'ai_echo') => {
      setDrawerBuilding(null);
      openMicroScene(buildingType);
      if (action === 'ai_echo') {
        setPendingAiEcho(buildingType);
      }
    },
    [openMicroScene],
  );

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => {
      setExploreLocationPosition(activeCityId, id, x, y);
    },
    [activeCityId, setExploreLocationPosition],
  );

  const handleRecenterHome = useCallback(() => {
    setExploreLocationPosition(
      activeCityId,
      EXPLORE_HOME_ID,
      DEFAULT_EXPLORE_HOME.x,
      DEFAULT_EXPLORE_HOME.y,
    );
  }, [activeCityId, setExploreLocationPosition]);

  const renderLocationPin = (loc: TownLocation) => {
    const bt = loc.id as BuildingType;
    const displayName = resolveExplorePlaceName(bt, loc.name, exploreNames);
    const weatherDormant =
      weather?.kind === 'snow' && bt === 'gym' && getWeatherEcologyEffect(weather, 'gym').dormantOverride;
    return (
      <DraggablePin
        key={`${activeCityId}-${loc.id}-${loc.position.x}-${loc.position.y}`}
        id={loc.id}
        x={loc.position.x}
        y={loc.position.y}
        bounce={pinBounceId === loc.id}
        highlighted={highlightedPinId === loc.id}
        layoutMode={layoutEdit}
        canvasRef={canvasRef}
        onPositionChange={handlePositionChange}
        onClick={() => handlePinClick(bt, loc.id, loc.position.x, loc.position.y)}
      >
        <ExploreMapPin
          name={displayName}
          category={loc.category}
          buildingType={bt}
          ecosystem={ecosystem[bt]}
          theme={rpg.theme}
          layoutEdit={layoutEdit}
          weatherDormant={weatherDormant}
          highlighted={highlightedPinId === loc.id}
          onRename={n => updateExploreLocationName(activeCityId, bt, n)}
        />
      </DraggablePin>
    );
  };

  return (
    <TownPageShell fullBleed minimalHud locationName={`${activeCity.name} · 人生生态`}>
      <div
        ref={canvasRef}
        className={`explore-map-canvas hub-town-canvas explore-map-canvas--fixed relative w-full h-full min-h-[480px] select-none ${layoutEdit ? 'hub-town-canvas--layout-edit' : ''} ${weather?.kind === 'rain' ? 'hub-town-canvas--rain hub-town-canvas--rain-night' : ''} ${weather?.kind === 'snow' ? 'hub-town-canvas--snow' : ''}`}
        data-town-time={timeOfDay}
        data-rpg-theme={rpg.theme}
        data-weather={weather?.kind ?? 'clear'}
      >
        {timeOfDay === 'night' && weather?.kind === 'rain' && (
          <div className="explore-rain-streetlights" aria-hidden>
            <span className="explore-streetlamp explore-streetlamp--a" />
            <span className="explore-streetlamp explore-streetlamp--b" />
            <span className="explore-streetlamp explore-streetlamp--c" />
            <span className="explore-streetlamp-ground explore-streetlamp-ground--a" />
            <span className="explore-streetlamp-ground explore-streetlamp-ground--b" />
          </div>
        )}

        <div
          className={`explore-map-viewport ${sceneBuilding ? 'explore-map-viewport--zoomed' : ''}`}
          style={mapZoomStyle}
        >
        <TownMapBackground timeOfDay={timeOfDay} />
        <ExploreHandDrawnGround cityId={activeCityId} timeOfDay={timeOfDay} />
        {!pixiUnified && !pixiHeatmap && (
          <ExploreRouteHeatmapLayer
            cityId={activeCityId}
            refreshKey={trailRefresh}
            onZoneClick={id => setHeatDrillZone(id)}
          />
        )}
        {!pixiUnified && (
          <ExploreHeatmapPixi
            cityId={activeCityId}
            refreshKey={trailRefresh}
            active={pixiHeatmap}
          />
        )}
        <ExploreUnifiedPixiLayer
          cityId={activeCityId}
          refreshKey={trailRefresh}
          active={pixiUnified}
          particleKind={
            weather?.kind === 'rain'
              ? 'none'
              : timeOfDay === 'night'
                ? 'fireflies'
                : 'leaves'
          }
          home={resolvedHome}
          locations={locations}
          preferredTransport={townData.preferredTransport}
          hasVehicle={townData.vehicles.length > 0}
          showFpsHud={showFpsHud}
          onFpsUpdate={setPixiFps}
          onRouteVisited={() => setTrailRefresh(v => v + 1)}
        />
        {weather?.kind === 'rain' && (
          <TownParticleCanvas scene="rain" active />
        )}
        {particleScene && !pixiUnified && (
          <TownParticlePixi scene={particleScene} active />
        )}

        <ExploreMapLayer cityId={activeCityId} enabled={showMapLayer && hasGeoLayer} />

        <ExploreLifeZones vitalityByBuilding={vitalityByBuilding} />

        <ExploreRouteTrailLayer
          cityId={activeCityId}
          home={resolvedHome}
          locations={locations}
          refreshKey={trailRefresh}
        />

        <ExploreRouteRunners
          home={resolvedHome}
          locations={locations}
          preferredTransport={townData.preferredTransport}
          hasVehicle={townData.vehicles.length > 0}
          layoutEdit={layoutEdit}
        />

        <ExploreRouteRunnersPixi
          cityId={activeCityId}
          home={resolvedHome}
          locations={locations}
          preferredTransport={townData.preferredTransport}
          hasVehicle={townData.vehicles.length > 0}
          layoutEdit={layoutEdit || pixiUnified}
          showFpsHud={showFpsHud}
          onFpsUpdate={setPixiFps}
          onRouteVisited={() => setTrailRefresh(v => v + 1)}
        />

        <DraggablePin
          id={EXPLORE_HOME_ID}
          x={resolvedHome.x}
          y={resolvedHome.y}
          zIndex={22}
          bounce={pinBounceId === EXPLORE_HOME_ID}
          highlighted={highlightedPinId === EXPLORE_HOME_ID}
          layoutMode={layoutEdit}
          canvasRef={canvasRef}
          onPositionChange={handlePositionChange}
          onClick={() => handlePinClick('home', EXPLORE_HOME_ID, resolvedHome.x, resolvedHome.y)}
        >
          <ExploreMapPin
            name={resolveExplorePlaceName('home', '我的小窝', exploreNames)}
            category="spirit"
            buildingType="home"
            ecosystem={ecosystem.home}
            theme={rpg.theme}
            isHome
            highlighted={highlightedPinId === EXPLORE_HOME_ID}
            layoutEdit={layoutEdit}
            onRename={n => updateExploreLocationName(activeCityId, 'home', n)}
          />
        </DraggablePin>

        {locations.map(renderLocationPin)}

        <ExploreGeoMarkers
          cityId={activeCityId}
          memories={lifeData.memories}
          positions={separatedPositions}
        />
        </div>

        <ExploreRouteTrailTimeline
          cityId={activeCityId}
          cityName={activeCity.name}
          refreshKey={trailRefresh}
        />

        {weatherHint && (
          <p className="explore-weather-ecology-hint">{weatherHint}</p>
        )}

        <ExploreCityFogTransition active={fogTransition.active} cityName={fogTransition.name} />

        <ExploreMapControls
          cityName={activeCity.name}
          cities={lifeData.cities}
          memories={lifeData.memories}
          activeCityId={activeCityId}
          layoutEdit={layoutEdit}
          comfortLabel={comfort.label}
          comfortBonus={comfort.bonus}
          hasSubwayPass={townData.hasSubwayPass}
          isCityAccessible={isCityAccessible}
          onCitySwitch={handleCitySwitch}
          onLayoutEditChange={setLayoutEdit}
          onResetLayout={() => resetExploreLayout(activeCityId)}
          onRecenterHome={handleRecenterHome}
          hasGeoLayer={hasGeoLayer}
          showMapLayer={showMapLayer}
          onMapLayerToggle={() => setShowMapLayer(v => !v)}
        />

        <ExploreEcoAlerts alerts={ecoAlerts} onAlertClick={handleAlertClick} />

        <ExploreEcosystemBar
          cityName={activeCity.name}
          totalMemories={summary.totalMemories}
          linkedBills={summary.linkedBills}
          financeSignals={summary.financeSignals}
          activeDomains={summary.activeDomains}
        />

        <ExploreTimelineBar
          period={timelinePeriod}
          growingDomains={summary.growingDomains}
          dormantDomains={summary.dormantDomains}
          onPeriodChange={setTimelinePeriod}
        />

        <ExploreCrossCityPanel comparisons={crossCity} />

        <div className="town-map-legend explore-map-legend">
          <span>💭 自述回忆</span>
          <span>📊 账单镜像</span>
          <span>🔗 链账单</span>
          <span>🌱 生长 / 💤 休眠</span>
          <button
            type="button"
            className="explore-map-legend-link explore-map-fps-toggle"
            onClick={() => {
              const next = !pixiUnified;
              setPixiUnified(next);
              savePixiUnifiedEnabled(next);
              if (next) {
                setPixiHeatmap(false);
                savePixiHeatmapEnabled(false);
              }
            }}
          >
            {pixiUnified ? 'Pixi 全场景' : '分层渲染'}
          </button>
          <button
            type="button"
            className="explore-map-legend-link explore-map-fps-toggle"
            onClick={() => {
              const next = !showFpsHud;
              setShowFpsHud(next);
              savePixiFpsHudEnabled(next);
            }}
          >
            {showFpsHud ? `Pixi ${pixiFps} FPS` : 'Pixi FPS'}
          </button>
          <Link to="/town/memories/report" className="explore-map-legend-link">
            生态报告 →
          </Link>
        </div>

        <p className="explore-map-hint">
          {layoutEdit
            ? '拖拽布局 · 点击名称可改本地化名 · 重叠会自动弹开'
            : '点击生活域进入室内微场景 · 生态数据在场景内按钮 · v1.0.0-beta.1'}
        </p>

        {heatDrillZone && (
          <ExploreHeatDrillPanel
            locationId={heatDrillZone}
            memories={lifeData.memories.filter(
              m => m.cityId === activeCityId && m.buildingType === heatZoneToBuilding(heatDrillZone),
            )}
            onClose={() => setHeatDrillZone(null)}
            onOpenScene={() => {
              const bt = heatZoneToBuilding(heatDrillZone);
              if (bt) openMicroScene(bt);
              setHeatDrillZone(null);
            }}
          />
        )}

        {sceneBuilding && microSceneView && (
          <ExploreMicroSceneOverlay
            scene={microSceneView}
            comfortBonus={comfort.bonus}
            weather={weather}
            timeOfDay={timeOfDay}
            anchor={sceneAnchor}
            onClose={() => {
              setSceneBuilding(null);
              setSceneAnchor(null);
            }}
            onOpenDrawer={() => {
              const bt = sceneBuilding;
              setSceneBuilding(null);
              setSceneAnchor(null);
              openDomainDrawer(bt);
            }}
          />
        )}

        <ExploreEcoFloatCard
          open={drawerBuilding != null && sceneBuilding == null}
          detail={drawerDetail}
          onClose={() => setDrawerBuilding(null)}
          onCompose={composeFromDrawer}
          onAiEcho={handleAiEcho}
          aiEchoLoading={aiEchoLoading}
          onTimelineItemClick={(bt, _memoryId) => {
            setDrawerBuilding(null);
            const pinId = bt === 'home' ? EXPLORE_HOME_ID : bt;
            const pos =
              bt === 'home'
                ? resolvedHome
                : locations.find(l => l.id === bt)?.position ?? { x: 50, y: 50 };
            setHighlightedPinId(pinId);
            openMicroScene(bt, pos);
            window.setTimeout(() => setHighlightedPinId(null), 2400);
          }}
        />
      </div>
    </TownPageShell>
  );
}
