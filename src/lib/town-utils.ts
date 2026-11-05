import type { ComfortInfo, PlacedFurniture, ShopItem, TownRoom } from '@/types/town';
import { getShopItem } from '@/lib/town-data';

export function getComfortLevel(total: number): ComfortInfo {
  if (total < 20) return { total, level: 'sparse', label: '简陋', bonus: 0 };
  if (total < 50) return { total, level: 'cozy', label: '温馨', bonus: 0.05 };
  if (total < 100) return { total, level: 'warm', label: '舒适', bonus: 0.1 };
  if (total < 200) return { total, level: 'luxurious', label: '豪华', bonus: 0.15 };
  return { total, level: 'palace', label: '宫殿', bonus: 0.2 };
}

export function roomComfort(room: TownRoom): number {
  return room.furniture.reduce((sum, f) => sum + (getShopItem(f.itemId)?.comfort ?? 0), 0);
}

export function totalComfort(rooms: TownRoom[]): ComfortInfo {
  const total = rooms.filter(r => r.unlocked).reduce((sum, r) => sum + roomComfort(r), 0);
  return getComfortLevel(total);
}

export function applyComfortBonus(baseExp: number, bonus: number): number {
  return Math.floor(baseExp * (1 + bonus));
}

export function locationExpMultiplier(category: string): number {
  const map: Record<string, number> = {
    vocation: 1.5,
    body: 2.0,
    mind: 1.8,
    spirit: 1.3,
  };
  return map[category] ?? 1;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getItemRect(furn: PlacedFurniture, item: ShopItem): Rect {
  const w = furn.rotation === 90 || furn.rotation === 270 ? item.size.height : item.size.width;
  const h = furn.rotation === 90 || furn.rotation === 270 ? item.size.width : item.size.height;
  return { x: furn.position.x, y: furn.position.y, w, h };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function checkCollision(
  newItem: PlacedFurniture,
  existing: PlacedFurniture[],
  room: TownRoom,
): boolean {
  const item = getShopItem(newItem.itemId);
  if (!item || item.size.width === 0) return true;

  const newRect = getItemRect(newItem, item);
  if (newRect.x + newRect.w > room.size.width || newRect.y + newRect.h > room.size.height) {
    return true;
  }
  if (newRect.x < 0 || newRect.y < 0) return true;

  for (const ex of existing) {
    if (ex.instanceId === newItem.instanceId) continue;
    const exItem = getShopItem(ex.itemId);
    if (!exItem) continue;
    if (rectsOverlap(newRect, getItemRect(ex, exItem))) return true;
  }
  return false;
}

export const COMMUTE_META: Record<string, { emoji: string; label: string; stroke: string; dash?: string }> = {
  subway: { emoji: '🚇', label: '地铁', stroke: '#4A90E2' },
  car: { emoji: '🚗', label: '开车', stroke: '#64748B' },
  bike: { emoji: '🚲', label: '骑行', stroke: '#22C55E', dash: '6 4' },
  walk: { emoji: '🚶', label: '步行', stroke: '#94A3B8', dash: '4 4' },
};

export function routeLengthPercent(distanceKm: number): number {
  return Math.min(48, Math.max(12, distanceKm * 4));
}
