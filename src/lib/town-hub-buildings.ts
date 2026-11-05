export type HubBuildingId =
  | 'house'
  | 'bank'
  | 'wishTree'
  | 'clockTower'
  | 'shop'
  | 'plaza'
  | 'dreamHall';

export type HubBuildingDepth = 'far' | 'mid' | 'near' | 'front';

export interface HubBuildingDef {
  id: HubBuildingId | 'explore';
  name: string;
  subtitle: string;
  emoji: string;
  route: string;
  x: number;
  y: number;
  size: 'lg' | 'md' | 'sm';
  depth: HubBuildingDepth;
  /** 额外缩放，形成近大远小 / 广场更大 */
  scaleBoost?: number;
  /** 轻微倾斜，增加有机感 */
  rotate?: number;
}

export const DEPTH_META: Record<HubBuildingDepth, { scale: number; opacity: number; zIndex: number }> = {
  far: { scale: 0.88, opacity: 0.9, zIndex: 8 },
  mid: { scale: 0.96, opacity: 0.95, zIndex: 12 },
  near: { scale: 1.0, opacity: 1, zIndex: 16 },
  front: { scale: 1.04, opacity: 1, zIndex: 20 },
};

export const HUB_BUILDINGS: HubBuildingDef[] = [
  {
    id: 'plaza',
    name: '前庭',
    subtitle: '已并入人生馆',
    emoji: '🌿',
    route: '/town/loft',
    x: 50,
    y: 19,
    size: 'sm',
    depth: 'far',
    scaleBoost: 0.88,
  },
  {
    id: 'clockTower',
    name: '日历塔',
    subtitle: '现金流 · 提醒',
    emoji: '📅',
    route: '/calendar',
    x: 76,
    y: 31,
    size: 'sm',
    depth: 'mid',
    scaleBoost: 0.92,
  },
  {
    id: 'shop',
    name: '杂货铺',
    subtitle: '设置 · 主题',
    emoji: '🏪',
    route: '/settings',
    x: 18,
    y: 47,
    size: 'sm',
    depth: 'mid',
    scaleBoost: 0.9,
    rotate: -3,
  },
  {
    id: 'bank',
    name: '银行',
    subtitle: '资产 · 流水',
    emoji: '🏦',
    route: '/',
    x: 68,
    y: 44,
    size: 'md',
    depth: 'mid',
    scaleBoost: 1.14,
  },
  {
    id: 'wishTree',
    name: '心愿树',
    subtitle: '梦想 · 目标',
    emoji: '🌳',
    route: '/goals',
    x: 26,
    y: 40,
    size: 'md',
    depth: 'near',
    scaleBoost: 1.06,
    rotate: -2,
  },
  {
    id: 'dreamHall',
    name: '梦想馆',
    subtitle: '平行空间 · 样板间',
    emoji: '✨',
    route: '/town/dream',
    x: 38,
    y: 62,
    size: 'md',
    depth: 'near',
    scaleBoost: 1.02,
    rotate: 2,
  },
  {
    id: 'house',
    name: '人生馆',
    subtitle: '回忆 · 小屋 · 成长',
    emoji: '🏠',
    route: '/town/loft',
    x: 54,
    y: 54,
    size: 'lg',
    depth: 'near',
    scaleBoost: 1.08,
  },
];

export const EXPLORE_HUB: HubBuildingDef = {
  id: 'explore',
  name: '外出地图',
  subtitle: '健身房 · 图书馆',
  emoji: '🗺️',
  route: '/town/explore',
  x: 50,
  y: 74,
  size: 'md',
  depth: 'front',
};

export function calcHouseLevel(memoryCount: number): number {
  if (memoryCount >= 100) return 4;
  if (memoryCount >= 50) return 3;
  if (memoryCount >= 10) return 2;
  return 1;
}

export function calcBankLevel(netWorth: number): number {
  if (netWorth >= 500_000) return 4;
  if (netWorth >= 100_000) return 3;
  if (netWorth >= 10_000) return 2;
  return 1;
}

export function calcWishTreeLevel(activeGoals: number): number {
  if (activeGoals >= 7) return 4;
  if (activeGoals >= 4) return 3;
  if (activeGoals >= 1) return 2;
  return 1;
}

export function calcClockTowerLevel(streakDays: number): number {
  if (streakDays >= 30) return 4;
  if (streakDays >= 7) return 3;
  if (streakDays >= 1) return 2;
  return 1;
}

export function calcShopLevel(_themeCount = 1): number {
  return 1;
}

export function calcPlazaLevel(rpgLevel: number): number {
  if (rpgLevel >= 10) return 4;
  if (rpgLevel >= 5) return 3;
  if (rpgLevel >= 2) return 2;
  return 1;
}

export function calcDreamHallLevel(dreamSpaceCount: number): number {
  if (dreamSpaceCount >= 5) return 4;
  if (dreamSpaceCount >= 3) return 3;
  if (dreamSpaceCount >= 1) return 2;
  return 1;
}

export function getBuildingScale(building: HubBuildingDef): number {
  const depth = DEPTH_META[building.depth];
  return depth.scale * (building.scaleBoost ?? 1);
}
