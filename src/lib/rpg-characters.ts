import type { CharacterPreset } from '@/types/rpg';

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'char_default',
    name: '小蓝',
    emoji: '👧',
    skinColor: '#FFB6C1',
    bodyColor: '#4A90E2',
    hairColor: '#2C2C2C',
  },
  {
    id: 'char_boy',
    name: '小阳',
    emoji: '👦',
    skinColor: '#FFDAB9',
    bodyColor: '#5BA0F0',
    hairColor: '#3D2914',
  },
  {
    id: 'char_pink',
    name: '小粉',
    emoji: '🌸',
    skinColor: '#FFE0EC',
    bodyColor: '#FF6B9D',
    hairColor: '#FF69B4',
  },
  {
    id: 'char_mint',
    name: '小绿',
    emoji: '🌿',
    skinColor: '#FFE0D0',
    bodyColor: '#4ECDC4',
    hairColor: '#2D5016',
  },
  {
    id: 'char_robot',
    name: '机械酱',
    emoji: '🤖',
    skinColor: '#C0C0C0',
    bodyColor: '#6366F1',
    hairColor: '#94A3B8',
  },
  {
    id: 'char_cat',
    name: '猫娘',
    emoji: '🐱',
    skinColor: '#FFE4C4',
    bodyColor: '#F59E0B',
    hairColor: '#FF8C00',
  },
];

export const DEFAULT_CHARACTER_ID = 'char_default';

export function getCharacterPreset(id: string): CharacterPreset {
  return CHARACTER_PRESETS.find(c => c.id === id) ?? CHARACTER_PRESETS[0];
}
