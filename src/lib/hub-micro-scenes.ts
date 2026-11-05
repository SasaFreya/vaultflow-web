import type { HubBuildingId } from '@/lib/town-hub-buildings';

export interface HubMicroSceneDef {
  id: HubBuildingId;
  title: string;
  icon: string;
  story: string;
  ambient: string;
  gradient: [string, string];
  /** 完整功能页 — 可选「跳出」入口 */
  fullRoute?: string;
  fullLabel?: string;
}

export const HUB_MICRO_SCENES: Record<HubBuildingId, HubMicroSceneDef> = {
  house: {
    id: 'house',
    title: '人生馆',
    icon: '🏠',
    story: '暖黄灯光下，书架与沙发围成小小的避风港。',
    ambient: '炉火轻噼 · 窗外微风',
    gradient: ['#FFF8E7', '#FFE0B2'],
    fullRoute: '/town/loft',
    fullLabel: '打开完整人生馆',
  },
  bank: {
    id: 'bank',
    title: '银行',
    icon: '🏦',
    story: '金库门后是你的资产概览——数据在本地，安全由你掌控。',
    ambient: '硬币轻响 · 账本翻页',
    gradient: ['#E3F2FD', '#BBDEFB'],
    fullRoute: '/',
    fullLabel: '打开资产大盘',
  },
  wishTree: {
    id: 'wishTree',
    title: '心愿树',
    icon: '🌳',
    story: '枝头挂满小小心愿，风一吹就轻轻摇晃。',
    ambient: '风铃 · 树叶沙沙',
    gradient: ['#E8F5E9', '#C8E6C9'],
    fullRoute: '/goals',
    fullLabel: '管理全部目标',
  },
  clockTower: {
    id: 'clockTower',
    title: '日历塔',
    icon: '📅',
    story: '塔顶钟声提醒你：现金流与日程，都在这座塔里。',
    ambient: '远处钟鸣 · 翻页声',
    gradient: ['#FFF3E0', '#FFE0B2'],
    fullRoute: '/calendar',
    fullLabel: '打开现金流日历',
  },
  shop: {
    id: 'shop',
    title: '杂货铺',
    icon: '🏪',
    story: '货架上摆着主题与偏好，挑一件装点你的小镇。',
    ambient: '门铃叮当 · 木架吱呀',
    gradient: ['#FCE4EC', '#F8BBD0'],
    fullRoute: '/settings',
    fullLabel: '打开设置',
  },
  plaza: {
    id: 'plaza',
    title: '前庭',
    icon: '🌿',
    story: '前庭已并入人生馆，这里是回忆与成长的入口。',
    ambient: '鸟鸣 · 石板路脚步',
    gradient: ['#F1F8E9', '#DCEDC8'],
    fullRoute: '/town/loft',
    fullLabel: '进入人生馆',
  },
  dreamHall: {
    id: 'dreamHall',
    title: '梦想馆',
    icon: '✨',
    story: '玻璃门后是样板间式的平行房间——电竞房、工作室、缝纫房，等你亲手搭出来。',
    ambient: '轻音乐 · 布料沙沙',
    gradient: ['#F3E5F5', '#E1BEE7'],
    fullRoute: '/town/dream',
    fullLabel: '打开梦想空间',
  },
};
