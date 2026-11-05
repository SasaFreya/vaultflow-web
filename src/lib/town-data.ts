import type { ShopItem, TownData, TownLocation, TownRoom } from '@/types/town';
import { uid } from '@/lib/rpg';
import { enrichLocationScene } from '@/lib/town-micro-scenes';

export const GRID_SIZE = 44;

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'sofa_01',
    name: '懒人沙发',
    category: 'furniture',
    subCategory: 'living',
    price: 300,
    comfort: 15,
    size: { width: 2, height: 1 },
    emoji: '🛋️',
    color: '#FF6B9D',
    description: '瘫上去就不想起来的神奇沙发',
  },
  {
    id: 'bookshelf_01',
    name: '实木书架',
    category: 'furniture',
    subCategory: 'study',
    price: 250,
    comfort: 10,
    size: { width: 1, height: 2 },
    emoji: '📚',
    color: '#8B6914',
    description: '每多一本书，智力+1（心理作用）',
  },
  {
    id: 'bed_01',
    name: '云朵大床',
    category: 'furniture',
    subCategory: 'bedroom',
    price: 500,
    comfort: 25,
    size: { width: 2, height: 2 },
    emoji: '🛏️',
    color: '#E8D5FF',
    description: '睡在上面会做美梦',
  },
  {
    id: 'plant_01',
    name: '多肉盆栽',
    category: 'decor',
    price: 50,
    comfort: 5,
    size: { width: 1, height: 1 },
    emoji: '🪴',
    color: '#22C55E',
    description: '不需要浇水也能活的神奇植物',
  },
  {
    id: 'painting_01',
    name: '星空挂画',
    category: 'decor',
    price: 120,
    comfort: 8,
    size: { width: 1, height: 1 },
    emoji: '🖼️',
    color: '#6366F1',
    description: '梵高的梦，你的墙',
  },
  {
    id: 'desk_01',
    name: '学习书桌',
    category: 'furniture',
    subCategory: 'study',
    price: 350,
    comfort: 12,
    size: { width: 2, height: 1 },
    emoji: '🪑',
    color: '#4A90E2',
    description: '专注学习的必备神器',
  },
  {
    id: 'scooter_pink',
    name: '粉色小电驴',
    category: 'vehicle',
    price: 800,
    comfort: 0,
    size: { width: 1, height: 1 },
    emoji: '🛵',
    color: '#FF6B9D',
    description: '通勤神器，堵车不堵心',
    vehicleType: 'bike',
  },
  {
    id: 'car_mini',
    name: '迷你小汽车',
    category: 'vehicle',
    price: 3000,
    comfort: 0,
    size: { width: 2, height: 1 },
    emoji: '🚗',
    color: '#4A90E2',
    description: '遮风挡雨，想去哪就去哪',
    vehicleType: 'car',
    unlockRequirement: { level: 3 },
  },
  {
    id: 'room_study',
    name: '书房扩建包',
    category: 'room',
    price: 1000,
    comfort: 0,
    size: { width: 0, height: 0 },
    emoji: '📖',
    color: '#5BA0F0',
    description: '解锁书房，学习效率翻倍',
    unlockRoom: 'studyRoom',
    unlockRequirement: { level: 5 },
  },
];

const DEFAULT_LOCATIONS: TownLocation[] = [
  {
    id: 'company',
    name: '公司',
    type: 'work',
    category: 'vocation',
    icon: '🏢',
    position: { x: 72, y: 18 },
    realWorld: { address: '南山区', distanceKm: 5.2 },
    commute: {
      defaultType: 'subway',
      options: [
        { type: 'subway', duration: 35, cost: 6, line: '1号线', stations: 5 },
        { type: 'car', duration: 25, cost: 15, parkingFee: 10 },
        { type: 'bike', duration: 45, cost: 0 },
        { type: 'walk', duration: 120, cost: 0 },
      ],
    },
    scene: {
      gradient: ['#E8F2FC', '#D4E5ED'],
      interactivePoints: [
        { id: 'desk', name: '工位', icon: '💻', action: 'focus', label: '开始专注' },
        { id: 'meeting', name: '会议室', icon: '📊', action: 'team', label: '团队副本' },
        { id: 'coffee', name: '茶水间', icon: '☕', action: 'social', label: '社交任务' },
      ],
    },
    visitCount: 0,
  },
  {
    id: 'gym',
    name: '健身房',
    type: 'fitness',
    category: 'body',
    icon: '🏋️',
    position: { x: 18, y: 72 },
    realWorld: { distanceKm: 1.5 },
    commute: {
      defaultType: 'walk',
      options: [
        { type: 'walk', duration: 15, cost: 0 },
        { type: 'bike', duration: 5, cost: 0 },
      ],
    },
    scene: {
      gradient: ['#FFF5E6', '#FFE4C4'],
      interactivePoints: [
        { id: 'treadmill', name: '跑步机', icon: '🏃', action: 'workout', label: '开始健身' },
        { id: 'weights', name: '哑铃区', icon: '🏋️', action: 'strength', label: '力量训练' },
      ],
    },
    visitCount: 0,
  },
  {
    id: 'library',
    name: '图书馆',
    type: 'study',
    category: 'mind',
    icon: '📚',
    position: { x: 12, y: 28 },
    realWorld: { distanceKm: 2.0 },
    commute: {
      defaultType: 'subway',
      options: [
        { type: 'subway', duration: 20, cost: 3, line: '2号线', stations: 3 },
        { type: 'bike', duration: 12, cost: 0 },
        { type: 'walk', duration: 30, cost: 0 },
      ],
    },
    scene: {
      gradient: ['#F0F8FF', '#E0EFFF'],
      interactivePoints: [
        { id: 'reading', name: '阅读区', icon: '📖', action: 'reading', label: '开始阅读' },
        { id: 'study', name: '自习室', icon: '✍️', action: 'deepStudy', label: '深度学习' },
      ],
    },
    visitCount: 0,
  },
  {
    id: 'cafe',
    name: '咖啡厅',
    type: 'leisure',
    category: 'spirit',
    icon: '☕',
    position: { x: 78, y: 62 },
    realWorld: { distanceKm: 0.8 },
    commute: {
      defaultType: 'walk',
      options: [{ type: 'walk', duration: 8, cost: 0 }],
    },
    scene: {
      gradient: ['#FFF8F0', '#F5E6D3'],
      interactivePoints: [
        { id: 'counter', name: '吧台', icon: '☕', action: 'buyCoffee', label: '买杯咖啡' },
        { id: 'corner', name: '角落座位', icon: '🛋️', action: 'relax', label: '放松休息' },
      ],
    },
    visitCount: 0,
  },
];

const DEFAULT_ROOMS: TownRoom[] = [
  {
    id: 'livingRoom',
    name: '客厅',
    size: { width: 12, height: 8 },
    floorType: 'wood',
    wallColor: '#F5E6D3',
    unlocked: true,
    furniture: [],
  },
  {
    id: 'bedroom',
    name: '卧室',
    size: { width: 10, height: 8 },
    floorType: 'carpet',
    wallColor: '#E8D5E0',
    unlocked: true,
    furniture: [],
  },
  {
    id: 'studyRoom',
    name: '书房',
    size: { width: 8, height: 8 },
    floorType: 'wood',
    wallColor: '#D4E5ED',
    unlocked: false,
    unlockRequirement: { level: 5, gold: 500 },
    furniture: [],
  },
  {
    id: 'yard',
    name: '院子',
    size: { width: 14, height: 10 },
    floorType: 'grass',
    wallColor: '#C8E6C9',
    unlocked: false,
    unlockRequirement: { level: 3, gold: 200 },
    furniture: [],
  },
];

export function createDefaultTownData(): TownData {
  return {
    locations: DEFAULT_LOCATIONS,
    rooms: DEFAULT_ROOMS,
    inventory: [],
    vehicles: [],
    preferredTransport: 'subway',
    hasSubwayPass: true,
    visitLog: {},
    checkIns: [],
  };
}

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(i => i.id === id);
}

export function getLocation(id: string, data: TownData): TownLocation | undefined {
  const loc = data.locations.find(l => l.id === id);
  if (!loc) return undefined;
  return enrichLocationScene(loc);
}

export function newInventoryEntry(itemId: string): { instanceId: string; itemId: string; isPlaced: boolean } {
  return { instanceId: `inv_${uid()}`, itemId, isPlaced: false };
}
