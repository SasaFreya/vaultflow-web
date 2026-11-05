import type { AssetSnapshot } from '@/types';

export interface MonthlyChange {
  month: string;
  netWorth: number;
  changePct: number | null;
}

export interface NetWorthVolatility {
  volatilityPct: number;
  trend: 'up' | 'down' | 'flat';
  latestChangePct: number | null;
  monthly: MonthlyChange[];
}

export function computeNetWorthVolatility(snapshots: AssetSnapshot[]): NetWorthVolatility {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);

  if (sorted.length < 2) {
    return { volatilityPct: 0, trend: 'flat', latestChangePct: null, monthly: [] };
  }

  const monthly: MonthlyChange[] = sorted.map((s, i) => {
    const prev = sorted[i - 1];
    const changePct =
      prev && prev.netWorth !== 0
        ? ((s.netWorth - prev.netWorth) / Math.abs(prev.netWorth)) * 100
        : null;
    return { month: s.date.slice(0, 7), netWorth: s.netWorth, changePct };
  });

  const changes = monthly.map(m => m.changePct).filter((c): c is number => c !== null);
  const avgAbs =
    changes.length > 0 ? changes.reduce((sum, c) => sum + Math.abs(c), 0) / changes.length : 0;

  const latestChangePct = changes.length > 0 ? changes[changes.length - 1] : null;
  let trend: NetWorthVolatility['trend'] = 'flat';
  if (latestChangePct !== null) {
    if (latestChangePct > 0.5) trend = 'up';
    else if (latestChangePct < -0.5) trend = 'down';
  }

  return {
    volatilityPct: Math.round(avgAbs * 10) / 10,
    trend,
    latestChangePct: latestChangePct !== null ? Math.round(latestChangePct * 10) / 10 : null,
    monthly,
  };
}
