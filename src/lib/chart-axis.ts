import type { ChartAxisUnit } from '@/types';

export const CHART_AXIS_OPTIONS: { value: ChartAxisUnit; label: string; divisor: number; suffix: string }[] = [
  { value: '1k', label: '千', divisor: 1000, suffix: 'k' },
  { value: '10k', label: '万', divisor: 10000, suffix: '万' },
  { value: '100k', label: '十万', divisor: 100000, suffix: '十万' },
  { value: '1m', label: '百万', divisor: 1000000, suffix: '百万' },
];

export function formatAxisValue(value: number, unit: ChartAxisUnit = '10k'): string {
  const opt = CHART_AXIS_OPTIONS.find(o => o.value === unit) ?? CHART_AXIS_OPTIONS[1];
  const scaled = value / opt.divisor;
  if (opt.value === '1k') return `¥${scaled >= 1 ? scaled.toFixed(0) : scaled.toFixed(1)}${opt.suffix}`;
  return `¥${scaled.toFixed(scaled >= 10 ? 0 : 1)}${opt.suffix}`;
}
