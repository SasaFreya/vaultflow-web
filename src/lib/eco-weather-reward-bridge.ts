let grantFn: ((exp: number, label: string) => void) | null = null;

export function registerWeatherRewardGrant(fn: (exp: number, label: string) => void): void {
  grantFn = fn;
}

export function notifyWeatherMemoryBonus(exp: number, label: string): void {
  if (exp > 0) grantFn?.(exp, label);
}

export function unregisterWeatherRewardGrant(): void {
  grantFn = null;
}
