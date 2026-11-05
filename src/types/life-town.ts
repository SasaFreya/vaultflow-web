/** 预设城市 id；自定义城市为 `town-*` */
export type PresetCityId = 'shenzhen' | 'beijing' | 'shanghai';
export type LifeCityId = string;

/** Hub 小镇建筑在地图上的自定义坐标（百分比） */
export type HubLayoutBuildingId =
  | 'house'
  | 'bank'
  | 'wishTree'
  | 'clockTower'
  | 'shop'
  | 'plaza'
  | 'explore'
  | 'dreamHall';

export interface HubLayoutPosition {
  x: number;
  y: number;
}

export type HubLayoutMap = Partial<Record<HubLayoutBuildingId, HubLayoutPosition>>;

export type BuildingType = 'gym' | 'library' | 'company' | 'cafe' | 'home';

export type MemorySource = 'ai_chat' | 'manual' | 'photo';

export type MemoryMood = 'happy' | 'calm' | 'excited' | 'tired' | 'neutral';

export interface LifeBuildingStats {
  level: number;
  visitCount: number;
}

export interface LifeCityRecord {
  id: LifeCityId;
  name: string;
  /** 用户手动创建的小镇 */
  isCustom?: boolean;
  createdAt?: string;
  coverImage?: string;
  unlockedAt?: string;
  /** 该城市 Hub 小镇建筑布局（按城市独立保存） */
  hubLayout?: HubLayoutMap;
  /** 外出地图地点坐标（按城市独立保存） */
  exploreLayout?: Partial<Record<string, HubLayoutPosition>>;
  /** 外出地图地点本地化名称（按城市独立） */
  exploreNames?: Partial<Record<BuildingType, string>>;
  /** 各生活域月度回忆目标条数 */
  domainGoals?: Partial<Record<BuildingType, number>>;
  /** 连续月目标达标月数 */
  domainGoalStreakMonths?: number;
  /** 最近一次月目标达标的 YYYY-MM */
  lastGoalMonthMet?: string;
  /** 已发放 streak 奖励的月份 */
  lastStreakRewardMonth?: string;
  stats: {
    memoryCount: number;
    totalExp: number;
    currentMood?: MemoryMood;
    lastVisit?: string;
  };
  buildings: Record<BuildingType, LifeBuildingStats>;
}

export interface LifeMemory {
  id: string;
  cityId: LifeCityId;
  buildingType: BuildingType;
  date: string;
  content: string;
  source: MemorySource;
  imageUrl?: string;
  mood?: MemoryMood;
  tags: string[];
  linkedTransactionId?: string | null;
  /** 可选地理锚点（照片 EXIF / 浏览器定位 / 手动） */
  geo?: MemoryGeo;
  createdAt: string;
}

export interface MemoryGeo {
  lat: number;
  lng: number;
  source: 'exif' | 'browser' | 'manual';
  label?: string;
}

export interface PersonTagConfig {
  customTags: string[];
  excludedTags: string[];
}

export interface LifeTownMemoriesData {
  version: 1;
  activeCityId: LifeCityId;
  cities: LifeCityRecord[];
  memories: LifeMemory[];
  personTagConfig?: PersonTagConfig;
}
