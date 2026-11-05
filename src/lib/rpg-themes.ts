import type { RPGThemeId } from '@/types/rpg';

export interface RPGThemeMeta {
  id: RPGThemeId;
  label: string;
  emoji: string;
}

export const RPG_THEMES: RPGThemeMeta[] = [
  { id: 'classic', label: '蓝白经典', emoji: '🌙' },
  { id: 'cyberpunk', label: '赛博朋克', emoji: '🌃' },
  { id: 'pixel', label: '像素 RPG', emoji: '👾' },
  { id: 'obi', label: '粉白', emoji: '🌸' },
];

export const DEFAULT_RPG_THEME: RPGThemeId = 'obi';
