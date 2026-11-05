/** 连接 useLifeMemories 与 useLifeRPG 的 streak 奖励桥 */
let grantFn: ((streakMonths: number) => void) | null = null;

export function registerStreakRewardGrant(fn: (streakMonths: number) => void): void {
  grantFn = fn;
}

export function notifyStreakReward(streakMonths: number): void {
  grantFn?.(streakMonths);
}

export function unregisterStreakRewardGrant(): void {
  grantFn = null;
}

/** 连续达标月数 → EXP / 金币 */
export function streakRewardAmount(streakMonths: number): { exp: number; gold: number } {
  return {
    exp: 12 + streakMonths * 8,
    gold: 5 + streakMonths * 4,
  };
}
