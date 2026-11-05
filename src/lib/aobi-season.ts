export type AobiSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export function getAobiSeason(date = new Date()): AobiSeason {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export const SEASON_GREETING: Record<AobiSeason, string> = {
  spring: '🌸 春日苏醒 · 适合种下新心愿',
  summer: '☀️ 夏日深耕 · 记得给目标浇浇水',
  autumn: '🍂 秋日收获 · 看看粮仓储备',
  winter: '❄️ 冬日沉淀 · 回小镇烤火休息',
};
