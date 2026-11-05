import type { ForecastEvent, ForecastFrequency } from '@/types';
import { getCurrentMonth } from '@/lib/storage';

export interface ForecastMonthPoint {
  month: string;
  netWorth: number;
  forecastDelta: number;
  isPrediction: boolean;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + n, 1);
}

function eventAppliesInMonth(event: ForecastEvent, month: string): boolean {
  if (!event.enabled) return false;
  const monthStart = `${month}-01`;
  if (event.startDate > monthStart.slice(0, 7) + '-31' && event.startDate.slice(0, 7) > month) return false;
  if (event.startDate.slice(0, 7) > month) return false;
  if (event.endDate && event.endDate.slice(0, 7) < month) return false;

  switch (event.frequency) {
    case 'once':
      return event.startDate.slice(0, 7) === month;
    case 'monthly':
    case 'yearly': {
      if (event.frequency === 'yearly') {
        const startMonth = event.startDate.slice(5, 7);
        return month.slice(5, 7) === startMonth;
      }
      return true;
    }
    case 'weekly':
      return true;
    case 'daily':
      return true;
    default:
      return true;
  }
}

function monthlyAmount(event: ForecastEvent): number {
  const sign = event.type === 'income' ? 1 : -1;
  switch (event.frequency) {
    case 'once':
      return sign * event.amount;
    case 'daily':
      return sign * event.amount * 30;
    case 'weekly':
      return sign * event.amount * 4.33;
    case 'monthly':
      return sign * event.amount;
    case 'yearly':
      return sign * (event.amount / 12);
    default:
      return sign * event.amount;
  }
}

export function computeForecastTimeline(
  baseNetWorth: number,
  events: ForecastEvent[],
  monthsAhead: number,
  startMonth?: string,
): ForecastMonthPoint[] {
  const start = startMonth ?? getCurrentMonth();
  const [y, m] = start.split('-').map(Number);
  const base = new Date(y, m - 1, 1);

  let running = baseNetWorth;
  const points: ForecastMonthPoint[] = [];

  for (let i = 0; i <= monthsAhead; i++) {
    const d = addMonths(base, i);
    const month = monthKey(d);
    const delta = events
      .filter(e => eventAppliesInMonth(e, month))
      .reduce((sum, e) => sum + monthlyAmount(e), 0);

    if (i > 0) running += delta;

    points.push({
      month,
      netWorth: Math.round(running),
      forecastDelta: Math.round(delta),
      isPrediction: i > 0,
    });
  }

  return points;
}

export function totalMonthlyForecastImpact(events: ForecastEvent[]): { income: number; expense: number; net: number } {
  const now = getCurrentMonth();
  const income = events
    .filter(e => e.enabled && e.type === 'income' && eventAppliesInMonth(e, now))
    .reduce((s, e) => s + Math.abs(monthlyAmount(e)), 0);
  const expense = events
    .filter(e => e.enabled && e.type === 'expense' && eventAppliesInMonth(e, now))
    .reduce((s, e) => s + Math.abs(monthlyAmount(e)), 0);
  return { income: Math.round(income), expense: Math.round(expense), net: Math.round(income - expense) };
}

export function buildActualMonthlyNet(
  transactions: { date: string; amount: number; type: 'income' | 'expense' }[],
): Record<string, number> {
  const map: Record<string, number> = {};
  transactions.forEach(t => {
    const month = t.date.slice(0, 7);
    const delta = t.type === 'income' ? t.amount : -t.amount;
    map[month] = (map[month] ?? 0) + delta;
  });
  return map;
}

/** 粗描预测 + 已发生月份用账单校准 */
export function computeCalibratedForecastTimeline(
  baseNetWorth: number,
  events: ForecastEvent[],
  actualMonthlyNet: Record<string, number>,
  monthsAhead: number,
  startMonth?: string,
): ForecastMonthPoint[] {
  const start = startMonth ?? getCurrentMonth();
  const raw = computeForecastTimeline(baseNetWorth, events, monthsAhead, start);
  const now = getCurrentMonth();

  let running = baseNetWorth;
  return raw.map((point, i) => {
    const actual = actualMonthlyNet[point.month];
    const isPast = point.month <= now;

    if (isPast && actual !== undefined) {
      if (i > 0) running += actual;
      return {
        month: point.month,
        netWorth: Math.round(running),
        forecastDelta: Math.round(actual),
        isPrediction: false,
      };
    }

    if (i > 0) running += point.forecastDelta;
    return {
      ...point,
      netWorth: Math.round(running),
      isPrediction: point.month > now,
    };
  });
}

export const FORECAST_FREQUENCY_LABELS: Record<ForecastFrequency, string> = {
  once: '一次性',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
};

/** Calendar-accurate cash flow; annual events are paid in full, weekly events recur from their start day. */
export function plannedCashFlow(events: ForecastEvent[], fromExclusive: string, through: string): { income: number; expense: number } {
  let income = 0;
  let expense = 0;
  const [fy, fm, fd] = fromExclusive.split('-').map(Number);
  const [ty, tm, td] = through.split('-').map(Number);
  const end = Date.UTC(ty, tm - 1, td);
  for (let time = Date.UTC(fy, fm - 1, fd) + 86400000; time <= end; time += 86400000) {
    const date = new Date(time);
    const key = date.toISOString().slice(0, 10);
    const day = date.getUTCDate();
    const month = date.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
    for (const e of events) {
      if (!e.enabled || !Number.isFinite(e.amount) || e.amount <= 0 || key < e.startDate || (e.endDate && key > e.endDate)) continue;
      const [y, m, d] = e.startDate.split('-').map(Number);
      const occurs = e.frequency === 'daily' ||
        (e.frequency === 'once' && key === e.startDate) ||
        (e.frequency === 'weekly' && (time - Date.UTC(y, m - 1, d)) % (7 * 86400000) === 0) ||
        (e.frequency === 'monthly' && day === Math.min(d, daysInMonth)) ||
        (e.frequency === 'yearly' && month === m - 1 && day === Math.min(d, daysInMonth));
      if (occurs) { if (e.type === 'income') income += e.amount; else expense += e.amount; }
    }
  }
  return { income, expense };
}

export function computePlanningTimeline(baseNetWorth: number, events: ForecastEvent[], monthsAhead: number, startDate: string) {
  const [year, month] = startDate.split('-').map(Number);
  let running = baseNetWorth;
  let previous = startDate;
  const points = [{ date: startDate, netWorth: baseNetWorth, income: 0, expense: 0 }];
  for (let i = 0; i < monthsAhead; i++) {
    const end = new Date(Date.UTC(year, month + i, 0)).toISOString().slice(0, 10);
    if (end <= previous) continue;
    const flow = plannedCashFlow(events, previous, end);
    running += flow.income - flow.expense;
    points.push({ date: end, netWorth: running, ...flow });
    previous = end;
  }
  return points;
}
