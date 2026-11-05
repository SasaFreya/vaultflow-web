export type MapSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export function getMapSeason(date = new Date()): MapSeason {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export const MAP_SEASON_LABEL: Record<MapSeason, string> = {
  spring: '春樱',
  summer: '夏蝉',
  autumn: '秋枫',
  winter: '冬雪',
};
