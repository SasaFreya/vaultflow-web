export type CommuteType = 'subway' | 'car' | 'bike' | 'walk';
export type LocationCategory = 'vocation' | 'body' | 'mind' | 'spirit';
export type ShopCategory = 'furniture' | 'decor' | 'vehicle' | 'outfit' | 'room';
export type ComfortLevel = 'sparse' | 'cozy' | 'warm' | 'luxurious' | 'palace';
export type RoomId = 'livingRoom' | 'bedroom' | 'studyRoom' | 'yard';

export interface MapPosition {
  x: number;
  y: number;
}

export interface CommuteOption {
  type: CommuteType;
  duration: number;
  cost: number;
  line?: string;
  stations?: number;
  parkingFee?: number;
}

export interface SceneHotspot {
  id: string;
  name: string;
  icon: string;
  action: string;
  label: string;
  /** 微叙事：点击前展示的一行故事 */
  story?: string;
  /** 微场景内布局（百分比） */
  layout?: { x: number; y: number };
}

export interface SceneProp {
  id: string;
  emoji: string;
  label: string;
  x: number;
  y: number;
  rotate?: number;
}

export interface LocationMicroScene {
  story: string;
  ambient: string;
  props: SceneProp[];
}

export interface TownLocation {
  id: string;
  name: string;
  type: string;
  category: LocationCategory;
  icon: string;
  position: MapPosition;
  realWorld: {
    address?: string;
    distanceKm: number;
  };
  commute: {
    defaultType: CommuteType;
    options: CommuteOption[];
  };
  scene: {
    gradient: [string, string];
    interactivePoints: SceneHotspot[];
    micro?: LocationMicroScene;
  };
  visitCount: number;
  lastVisited?: string;
}

export interface PlacedFurniture {
  instanceId: string;
  itemId: string;
  position: { x: number; y: number };
  rotation: 0 | 90 | 180 | 270;
}

export interface TownRoom {
  id: RoomId;
  name: string;
  size: { width: number; height: number };
  floorType: string;
  wallColor: string;
  unlocked: boolean;
  unlockRequirement?: { level: number; gold: number };
  furniture: PlacedFurniture[];
}

export interface OwnedVehicle {
  id: string;
  itemId: string;
  name: string;
  type: 'car' | 'bike';
  emoji: string;
  isParked: boolean;
  parkLocation: 'garage' | 'driveway' | 'yard';
}

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  subCategory?: string;
  price: number;
  comfort: number;
  size: { width: number; height: number };
  emoji: string;
  color: string;
  description: string;
  unlockRequirement?: { level: number };
  vehicleType?: 'car' | 'bike';
  unlockRoom?: RoomId;
}

export interface InventoryEntry {
  instanceId: string;
  itemId: string;
  isPlaced: boolean;
  placedIn?: RoomId;
}

export interface TownCheckInRecord {
  id: string;
  locationId: string;
  locationName: string;
  category: LocationCategory;
  action: string;
  actionLabel: string;
  durationMin: number;
  note?: string;
  timestamp: string;
  rewards: {
    exp: number;
    gold: number;
  };
}

export interface TownData {
  locations: TownLocation[];
  rooms: TownRoom[];
  inventory: InventoryEntry[];
  vehicles: OwnedVehicle[];
  preferredTransport: CommuteType;
  hasSubwayPass: boolean;
  visitLog: Record<string, string[]>;
  checkIns: TownCheckInRecord[];
}

export interface ComfortInfo {
  total: number;
  level: ComfortLevel;
  label: string;
  bonus: number;
}
