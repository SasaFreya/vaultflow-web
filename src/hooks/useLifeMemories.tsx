import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import dayjs from 'dayjs';
import type {
  BuildingType,
  HubLayoutBuildingId,
  HubLayoutMap,
  LifeCityId,
  LifeCityRecord,
  LifeMemory,
  LifeTownMemoriesData,
  MemoryGeo,
  MemoryMood,
  MemorySource,
} from '@/types/life-town';
import { clampHubPosition } from '@/lib/town-hub-layout';
import { clampExplorePosition } from '@/lib/town-explore-layout';
import {
  syncCityUnlocksFromMemories,
  newCustomCityId,
  countMemoriesForCity,
  isCityAccessible,
} from '@/lib/life-city-unlock';
import {
  applyMemoryToCity,
  BUILDING_META,
  createDefaultCity,
  newMemoryId,
} from '@/lib/life-memories-data';
import { checkInMemoryContent } from '@/lib/memory-ai';
import { loadLifeMemoriesData, saveLifeMemoriesData } from '@/lib/life-memories-persistence';
import { refreshDomainGoalStreak } from '@/lib/domain-goal-streak';
import { notifyStreakReward } from '@/lib/eco-streak-reward-bridge';
import { autoSyncMemoriesAfterWrite } from '@/lib/life-memories-sync-remote';
import { onPersonTagConfigUpdated } from '@/lib/eco-data-events';
import { startWebDavBackupScheduler } from '@/lib/webdav-backup-scheduler';

export type MemoryTimeGroup = 'thisMonth' | 'thisYear' | 'earlier';

export interface AddMemoryInput {
  cityId: LifeCityId;
  buildingType: BuildingType;
  content: string;
  date?: string;
  source?: MemorySource;
  imageUrl?: string;
  mood?: MemoryMood;
  tags?: string[];
  linkedTransactionId?: string | null;
  geo?: MemoryGeo;
}

interface LifeMemoriesContextValue {
  ready: boolean;
  data: LifeTownMemoriesData;
  activeCity: LifeCityRecord;
  activeCityId: LifeCityId;
  setActiveCityId: (id: LifeCityId) => void;
  memoriesForActiveCity: LifeMemory[];
  groupedMemories: Record<MemoryTimeGroup, LifeMemory[]>;
  addMemory: (input: AddMemoryInput) => LifeMemory;
  updateMemoryContent: (id: string, content: string) => void;
  checkIn: (buildingType: BuildingType, cityId?: LifeCityId) => LifeMemory;
  deleteMemory: (id: string) => void;
  unlockCity: (id: LifeCityId) => void;
  updateCityName: (id: LifeCityId, name: string) => void;
  setHubBuildingPosition: (cityId: LifeCityId, buildingId: HubLayoutBuildingId, x: number, y: number) => void;
  resetHubLayout: (cityId: LifeCityId) => void;
  setExploreLocationPosition: (cityId: LifeCityId, locationId: string, x: number, y: number) => void;
  resetExploreLayout: (cityId: LifeCityId) => void;
  updateExploreLocationName: (cityId: LifeCityId, buildingType: BuildingType, name: string) => void;
  updateDomainGoals: (cityId: LifeCityId, goals: Partial<Record<BuildingType, number>>) => void;
  reloadFromDisk: () => Promise<void>;
  addCustomCity: (name: string) => LifeCityId | null;
  getCityMemoryCount: (cityId: LifeCityId) => number;
  isCityAccessible: (cityId: LifeCityId) => boolean;
}

const LifeMemoriesContext = createContext<LifeMemoriesContextValue | null>(null);

function groupMemories(memories: LifeMemory[]): Record<MemoryTimeGroup, LifeMemory[]> {
  const now = dayjs();
  const monthStart = now.startOf('month').format('YYYY-MM-DD');
  const yearStart = now.startOf('year').format('YYYY-MM-DD');

  const sorted = [...memories].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );

  return {
    thisMonth: sorted.filter(m => m.date >= monthStart),
    thisYear: sorted.filter(m => m.date >= yearStart && m.date < monthStart),
    earlier: sorted.filter(m => m.date < yearStart),
  };
}

export function LifeMemoriesProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LifeTownMemoriesData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadLifeMemoriesData().then(d => {
      setData(d);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    return onPersonTagConfigUpdated(() => {
      void loadLifeMemoriesData().then(setData);
    });
  }, []);

  const dataRef = useRef<LifeTownMemoriesData | null>(null);
  dataRef.current = data;

  useEffect(() => {
    if (!ready) return;
    return startWebDavBackupScheduler(() => dataRef.current);
  }, [ready]);

  const persist = useCallback(async (next: LifeTownMemoriesData) => {
    const withStreaks: LifeTownMemoriesData = {
      ...next,
      cities: next.cities.map(c => {
        const prevStreak = c.domainGoalStreakMonths ?? 0;
        const updated = refreshDomainGoalStreak(c, next.memories);
        const newStreak = updated.domainGoalStreakMonths ?? 0;
        const month = updated.lastGoalMonthMet;
        let lastStreakRewardMonth = c.lastStreakRewardMonth;
        if (newStreak > prevStreak && month && lastStreakRewardMonth !== month) {
          notifyStreakReward(newStreak);
          lastStreakRewardMonth = month;
        }
        return { ...c, ...updated, lastStreakRewardMonth };
      }),
    };
    const synced = syncCityUnlocksFromMemories(withStreaks);
    setData(synced);
    await saveLifeMemoriesData(synced);
    void autoSyncMemoriesAfterWrite(synced);
  }, []);

  const setActiveCityId = useCallback(
    (id: LifeCityId) => {
      if (!data) return;
      void persist({ ...data, activeCityId: id });
    },
    [data, persist],
  );

  const unlockCity = useCallback(
    (id: LifeCityId) => {
      if (!data) return;
      const today = new Date().toISOString().slice(0, 10);
      void persist({
        ...data,
        cities: data.cities.map(c =>
          c.id === id ? { ...c, unlockedAt: c.unlockedAt ?? today } : c,
        ),
      });
    },
    [data, persist],
  );

  const updateCityName = useCallback(
    (id: LifeCityId, name: string) => {
      if (!data) return;
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed) return;
      void persist({
        ...data,
        cities: data.cities.map(c => (c.id === id ? { ...c, name: trimmed } : c)),
      });
    },
    [data, persist],
  );

  const setHubBuildingPosition = useCallback(
    (cityId: LifeCityId, buildingId: HubLayoutBuildingId, x: number, y: number) => {
      if (!data) return;
      const pos = clampHubPosition(x, y);
      void persist({
        ...data,
        cities: data.cities.map(c => {
          if (c.id !== cityId) return c;
          const hubLayout: HubLayoutMap = { ...(c.hubLayout ?? {}), [buildingId]: pos };
          return { ...c, hubLayout };
        }),
      });
    },
    [data, persist],
  );

  const resetHubLayout = useCallback(
    (cityId: LifeCityId) => {
      if (!data) return;
      void persist({
        ...data,
        cities: data.cities.map(c =>
          c.id === cityId ? { ...c, hubLayout: undefined } : c,
        ),
      });
    },
    [data, persist],
  );

  const setExploreLocationPosition = useCallback(
    (cityId: LifeCityId, locationId: string, x: number, y: number) => {
      if (!data) return;
      const pos = clampExplorePosition(x, y);
      void persist({
        ...data,
        cities: data.cities.map(c => {
          if (c.id !== cityId) return c;
          const exploreLayout = { ...(c.exploreLayout ?? {}), [locationId]: pos };
          return { ...c, exploreLayout };
        }),
      });
    },
    [data, persist],
  );

  const resetExploreLayout = useCallback(
    (cityId: LifeCityId) => {
      if (!data) return;
      void persist({
        ...data,
        cities: data.cities.map(c =>
          c.id === cityId ? { ...c, exploreLayout: undefined, exploreNames: undefined } : c,
        ),
      });
    },
    [data, persist],
  );

  const updateExploreLocationName = useCallback(
    (cityId: LifeCityId, buildingType: BuildingType, name: string) => {
      if (!data) return;
      const trimmed = name.trim();
      void persist({
        ...data,
        cities: data.cities.map(c => {
          if (c.id !== cityId) return c;
          const exploreNames = { ...(c.exploreNames ?? {}) };
          if (trimmed) exploreNames[buildingType] = trimmed.slice(0, 16);
          else delete exploreNames[buildingType];
          return { ...c, exploreNames };
        }),
      });
    },
    [data, persist],
  );

  const updateDomainGoals = useCallback(
    (cityId: LifeCityId, goals: Partial<Record<BuildingType, number>>) => {
      if (!data) return;
      void persist({
        ...data,
        cities: data.cities.map(c =>
          c.id === cityId ? { ...c, domainGoals: { ...(c.domainGoals ?? {}), ...goals } } : c,
        ),
      });
    },
    [data, persist],
  );

  const reloadFromDisk = useCallback(async () => {
    const fresh = await loadLifeMemoriesData();
    setData(fresh);
  }, []);

  const addCustomCity = useCallback(
    (name: string): LifeCityId | null => {
      if (!data) return null;
      const trimmed = name.trim().slice(0, 24);
      if (!trimmed) return null;
      const id = newCustomCityId();
      const today = new Date().toISOString().slice(0, 10);
      const city = createDefaultCity(id, trimmed, true, true);
      void persist({
        ...data,
        activeCityId: id,
        cities: [...data.cities, { ...city, createdAt: today, unlockedAt: today }],
      });
      return id;
    },
    [data, persist],
  );

  const getCityMemoryCount = useCallback(
    (cityId: LifeCityId) => countMemoriesForCity(data?.memories ?? [], cityId),
    [data?.memories],
  );

  const isCityAccessibleById = useCallback(
    (cityId: LifeCityId) => {
      const city = data?.cities.find(c => c.id === cityId);
      if (!city) return false;
      return isCityAccessible(city, countMemoriesForCity(data?.memories ?? [], cityId));
    },
    [data?.cities, data?.memories],
  );

  const addMemory = useCallback(
    (input: AddMemoryInput): LifeMemory => {
      if (!data) throw new Error('回忆数据未加载');

      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const memory: LifeMemory = {
        id: newMemoryId(),
        cityId: input.cityId,
        buildingType: input.buildingType,
        date,
        content: input.content.trim(),
        source: input.source ?? 'manual',
        imageUrl: input.imageUrl,
        mood: input.mood ?? 'neutral',
        tags: (input.tags ?? []).map(t => t.trim()).filter(Boolean),
        linkedTransactionId: input.linkedTransactionId ?? null,
        geo: input.geo,
        createdAt: new Date().toISOString(),
      };

      if (!memory.content) {
        throw new Error('回忆内容不能为空');
      }

      void persist({
        ...data,
        activeCityId: input.cityId,
        cities: data.cities.map(c =>
          c.id === input.cityId ? applyMemoryToCity(c, memory) : c,
        ),
        memories: [memory, ...data.memories],
      });

      return memory;
    },
    [data, persist],
  );

  const updateMemoryContent = useCallback(
    (id: string, content: string) => {
      if (!data) return;
      const trimmed = content.trim();
      if (!trimmed) return;
      void persist({
        ...data,
        memories: data.memories.map(m => (m.id === id ? { ...m, content: trimmed } : m)),
      });
    },
    [data, persist],
  );

  const checkIn = useCallback(
    (buildingType: BuildingType, cityId?: LifeCityId): LifeMemory => {
      const targetCity = cityId ?? data?.activeCityId ?? 'shenzhen';
      return addMemory({
        cityId: targetCity,
        buildingType,
        content: checkInMemoryContent(buildingType, targetCity),
        mood: 'neutral',
        tags: [BUILDING_META[buildingType].label, '打卡'],
        source: 'manual',
      });
    },
    [addMemory, data?.activeCityId],
  );

  const deleteMemory = useCallback(
    (id: string) => {
      if (!data) return;
      const target = data.memories.find(m => m.id === id);
      if (!target) return;

      const cities = data.cities.map(c => {
        if (c.id !== target.cityId) return c;
        const exp = BUILDING_META[target.buildingType].expPerVisit;
        const building = c.buildings[target.buildingType];
        const visitCount = Math.max(0, building.visitCount - 1);
        return {
          ...c,
          stats: {
            ...c.stats,
            memoryCount: Math.max(0, c.stats.memoryCount - 1),
            totalExp: Math.max(0, c.stats.totalExp - exp),
          },
          buildings: {
            ...c.buildings,
            [target.buildingType]: {
              visitCount,
              level: Math.max(1, Math.floor(visitCount / 5) + 1),
            },
          },
        };
      });

      void persist({
        ...data,
        cities,
        memories: data.memories.filter(m => m.id !== id),
      });
    },
    [data, persist],
  );

  const activeCity = useMemo(() => {
    if (!data) return null;
    return data.cities.find(c => c.id === data.activeCityId) ?? data.cities[0];
  }, [data]);

  const memoriesForActiveCity = useMemo(
    () => data?.memories.filter(m => m.cityId === data.activeCityId) ?? [],
    [data],
  );

  const groupedMemories = useMemo(
    () => groupMemories(memoriesForActiveCity),
    [memoriesForActiveCity],
  );

  const value = useMemo((): LifeMemoriesContextValue | null => {
    if (!data || !activeCity) return null;
    return {
      ready,
      data,
      activeCity,
      activeCityId: data.activeCityId,
      setActiveCityId,
      memoriesForActiveCity,
      groupedMemories,
      addMemory,
      updateMemoryContent,
      checkIn,
      deleteMemory,
      unlockCity,
      updateCityName,
      setHubBuildingPosition,
      resetHubLayout,
      setExploreLocationPosition,
      resetExploreLayout,
      updateExploreLocationName,
      updateDomainGoals,
      reloadFromDisk,
      addCustomCity,
      getCityMemoryCount,
      isCityAccessible: isCityAccessibleById,
    };
  }, [
    ready,
    data,
    activeCity,
    setActiveCityId,
    memoriesForActiveCity,
    groupedMemories,
    addMemory,
    checkIn,
    deleteMemory,
    unlockCity,
    updateCityName,
    setHubBuildingPosition,
    resetHubLayout,
    setExploreLocationPosition,
    resetExploreLayout,
    updateExploreLocationName,
    updateDomainGoals,
    reloadFromDisk,
    addCustomCity,
    getCityMemoryCount,
    isCityAccessibleById,
  ]);

  if (!value) {
    return (
      <div className="rpg-root town-root p-8 text-center text-sm" style={{ color: 'var(--rpg-text-secondary)' }}>
        加载回忆数据…
      </div>
    );
  }

  return <LifeMemoriesContext.Provider value={value}>{children}</LifeMemoriesContext.Provider>;
}

export function useLifeMemories(): LifeMemoriesContextValue {
  const ctx = useContext(LifeMemoriesContext);
  if (!ctx) throw new Error('useLifeMemories must be used within LifeMemoriesProvider');
  return ctx;
}
