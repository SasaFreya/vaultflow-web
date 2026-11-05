export type TownTimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export function getTownTimeOfDay(date = new Date()): TownTimeOfDay {
  const h = date.getHours();
  if (h >= 6 && h < 9) return 'morning';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

export const TOWN_TIME_GREETING: Record<TownTimeOfDay, string> = {
  morning: '🌅 晨间小镇 · 新的一天开始了',
  day: '☀️ 欢迎回家 · 点击建筑进入功能',
  evening: '🌇 傍晚小镇 · 窗户亮起了暖灯',
  night: '🌙 深夜小镇 · 只有暖灯还亮着',
};
