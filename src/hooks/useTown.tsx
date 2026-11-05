import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CommuteType, PlacedFurniture, RoomId, ShopCategory, TownCheckInRecord, TownData } from '@/types/town';
import { getShopItem, newInventoryEntry, SHOP_ITEMS } from '@/lib/town-data';
import { loadTownData, saveTownData } from '@/lib/town-persistence';
import { checkCollision, totalComfort } from '@/lib/town-utils';
import { computeCheckInRewards, type CheckInDuration } from '@/lib/town-checkin';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { uid } from '@/lib/rpg';

interface TownContextValue {
  ready: boolean;
  data: TownData;
  comfort: ReturnType<typeof totalComfort>;
  purchaseItem: (itemId: string) => { success: boolean; message: string };
  placeFurniture: (instanceId: string, roomId: RoomId, x: number, y: number) => boolean;
  removeFurniture: (roomId: RoomId, instanceId: string) => void;
  rotateFurniture: (roomId: RoomId, instanceId: string) => void;
  unlockRoom: (roomId: RoomId) => boolean;
  visitLocation: (locationId: string) => void;
  recordCheckIn: (
    locationId: string,
    action: string,
    actionLabel: string,
    durationMin: CheckInDuration,
    note?: string,
  ) => TownCheckInRecord | null;
  recentCheckIns: TownCheckInRecord[];
  setPreferredTransport: (type: CommuteType) => void;
  getUnplacedInventory: (category?: ShopCategory) => InvEntry[];
}

type InvEntry = TownData['inventory'][number];

const TownContext = createContext<TownContextValue | null>(null);

export function TownProvider({ children }: { children: ReactNode }) {
  const { levelInfo, spendGold } = useLifeRPG();
  const [data, setData] = useState<TownData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadTownData().then(d => {
      setData(d);
      setReady(true);
    });
  }, []);

  const persist = useCallback(async (next: TownData) => {
    setData(next);
    await saveTownData(next);
  }, []);

  const comfort = useMemo(() => totalComfort(data?.rooms ?? []), [data?.rooms]);

  const purchaseItem = useCallback(
    (itemId: string): { success: boolean; message: string } => {
      if (!data) return { success: false, message: '加载中…' };
      const item = getShopItem(itemId);
      if (!item) return { success: false, message: '商品不存在' };

      if (item.unlockRequirement && levelInfo.level < item.unlockRequirement.level) {
        return { success: false, message: `需要 Lv.${item.unlockRequirement.level}` };
      }

      if (item.category === 'vehicle') {
        if (data.vehicles.some(v => v.itemId === itemId)) {
          return { success: false, message: '已拥有该交通工具' };
        }
      }

      if (!spendGold(item.price)) {
        return { success: false, message: '金币不足' };
      }

      if (item.category === 'room' && item.unlockRoom) {
        const rooms = data.rooms.map(r =>
          r.id === item.unlockRoom ? { ...r, unlocked: true } : r,
        );
        void persist({ ...data, rooms });
        return { success: true, message: `已解锁${rooms.find(r => r.id === item.unlockRoom)?.name}！` };
      }

      if (item.category === 'vehicle' && item.vehicleType) {
        const vehicle = {
          id: `veh_${uid()}`,
          itemId,
          name: item.name,
          type: item.vehicleType,
          emoji: item.emoji,
          isParked: true,
          parkLocation: item.vehicleType === 'car' ? ('garage' as const) : ('yard' as const),
        };
        void persist({ ...data, vehicles: [...data.vehicles, vehicle] });
        return { success: true, message: `${item.name} 已停进院子！` };
      }

      const entry = newInventoryEntry(itemId);
      void persist({ ...data, inventory: [...data.inventory, entry] });
      return { success: true, message: `${item.name} 已放入背包！` };
    },
    [data, levelInfo.level, persist, spendGold],
  );

  const placeFurniture = useCallback(
    (instanceId: string, roomId: RoomId, x: number, y: number): boolean => {
      if (!data) return false;
      const entry = data.inventory.find(i => i.instanceId === instanceId);
      if (!entry) return false;

      const room = data.rooms.find(r => r.id === roomId);
      if (!room?.unlocked) return false;

      const placed: PlacedFurniture = {
        instanceId,
        itemId: entry.itemId,
        position: { x, y },
        rotation: 0,
      };

      if (checkCollision(placed, room.furniture, room)) return false;

      const rooms = data.rooms.map(r =>
        r.id === roomId ? { ...r, furniture: [...r.furniture, placed] } : r,
      );
      const inventory = data.inventory.map(i =>
        i.instanceId === instanceId ? { ...i, isPlaced: true, placedIn: roomId } : i,
      );
      void persist({ ...data, rooms, inventory });
      return true;
    },
    [data, persist],
  );

  const removeFurniture = useCallback(
    (roomId: RoomId, instanceId: string) => {
      if (!data) return;
      const rooms = data.rooms.map(r =>
        r.id === roomId
          ? { ...r, furniture: r.furniture.filter(f => f.instanceId !== instanceId) }
          : r,
      );
      const inventory = data.inventory.map(i =>
        i.instanceId === instanceId ? { ...i, isPlaced: false, placedIn: undefined } : i,
      );
      void persist({ ...data, rooms, inventory });
    },
    [data, persist],
  );

  const rotateFurniture = useCallback(
    (roomId: RoomId, instanceId: string) => {
      if (!data) return;
      const room = data.rooms.find(r => r.id === roomId);
      if (!room) return;

      const updated = room.furniture.map(f => {
        if (f.instanceId !== instanceId) return f;
        const nextRot = ((f.rotation + 90) % 360) as PlacedFurniture['rotation'];
        return { ...f, rotation: nextRot };
      });

      const target = updated.find(f => f.instanceId === instanceId)!;
      const others = updated.filter(f => f.instanceId !== instanceId);
      if (checkCollision(target, others, room)) return;

      const rooms = data.rooms.map(r =>
        r.id === roomId ? { ...r, furniture: updated } : r,
      );
      void persist({ ...data, rooms });
    },
    [data, persist],
  );

  const unlockRoom = useCallback(
    (roomId: RoomId): boolean => {
      if (!data) return false;
      const room = data.rooms.find(r => r.id === roomId);
      if (!room || room.unlocked || !room.unlockRequirement) return false;
      if (levelInfo.level < room.unlockRequirement.level) return false;
      if (!spendGold(room.unlockRequirement.gold)) return false;

      const rooms = data.rooms.map(r =>
        r.id === roomId ? { ...r, unlocked: true } : r,
      );
      void persist({ ...data, rooms });
      return true;
    },
    [data, levelInfo.level, persist, spendGold],
  );

  const visitLocation = useCallback(
    (locationId: string) => {
      if (!data) return;
      const today = new Date().toISOString().slice(0, 10);
      const locations = data.locations.map(l =>
        l.id === locationId
          ? { ...l, visitCount: l.visitCount + 1, lastVisited: today }
          : l,
      );
      const log = { ...data.visitLog };
      log[locationId] = [...(log[locationId] ?? []), today].slice(-30);
      void persist({ ...data, locations, visitLog: log });
    },
    [data, persist],
  );

  const recordCheckIn = useCallback(
    (
      locationId: string,
      action: string,
      actionLabel: string,
      durationMin: CheckInDuration,
      note?: string,
    ): TownCheckInRecord | null => {
      if (!data) return null;
      const location = data.locations.find(l => l.id === locationId);
      if (!location) return null;

      const base = computeCheckInRewards(location.category, durationMin);
      const record: TownCheckInRecord = {
        id: `ci_${uid()}`,
        locationId,
        locationName: location.name,
        category: location.category,
        action,
        actionLabel,
        durationMin,
        note: note || undefined,
        timestamp: new Date().toISOString(),
        rewards: { exp: base.exp, gold: base.gold },
      };

      const today = new Date().toISOString().slice(0, 10);
      const locations = data.locations.map(l =>
        l.id === locationId
          ? { ...l, visitCount: l.visitCount + 1, lastVisited: today }
          : l,
      );
      const log = { ...data.visitLog };
      log[locationId] = [...(log[locationId] ?? []), today].slice(-30);

      void persist({
        ...data,
        locations,
        visitLog: log,
        checkIns: [record, ...data.checkIns].slice(0, 200),
      });

      return record;
    },
    [data, persist],
  );

  const recentCheckIns = useMemo(
    () => (data?.checkIns ?? []).slice(0, 5),
    [data?.checkIns],
  );

  const setPreferredTransport = useCallback(
    (type: CommuteType) => {
      if (!data) return;
      void persist({ ...data, preferredTransport: type });
    },
    [data, persist],
  );

  const getUnplacedInventory = useCallback(
    (category?: ShopCategory): InvEntry[] => {
      if (!data) return [];
      return data.inventory.filter(i => {
        if (i.isPlaced) return false;
        const item = getShopItem(i.itemId);
        if (!item) return false;
        if (category && item.category !== category) return false;
        return item.category === 'furniture' || item.category === 'decor';
      });
    },
    [data],
  );

  if (!data) {
    return (
      <div className="min-h-[200px] flex items-center justify-center" style={{ color: 'var(--rpg-text-secondary, var(--vault-text-secondary))' }}>
        <p className="text-sm animate-pulse">加载小镇…</p>
      </div>
    );
  }

  return (
    <TownContext.Provider
      value={{
        ready,
        data,
        comfort,
        purchaseItem,
        placeFurniture,
        removeFurniture,
        rotateFurniture,
        unlockRoom,
        visitLocation,
        recordCheckIn,
        recentCheckIns,
        setPreferredTransport,
        getUnplacedInventory,
      }}
    >
      {children}
    </TownContext.Provider>
  );
}

export function useTown() {
  const ctx = useContext(TownContext);
  if (!ctx) throw new Error('useTown must be used within TownProvider');
  return ctx;
}

export { SHOP_ITEMS };
