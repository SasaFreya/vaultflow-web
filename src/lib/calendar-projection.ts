import dayjs from 'dayjs';
import type { CalendarEvent } from '@/types';
import { getCalendarEventsForMonth } from '@/lib/storage';

/** 日历事件对净资产的金额影响（仅用于预测，不计入实际账本） */
export function calendarEventDelta(event: CalendarEvent): number {
  const amount = event.amount ?? 0;
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (event.type === 'salary') return amount;
  // Debt principal payment changes cash and debt equally. Fees belong to expense events.
  if (event.type === 'expense') return -amount;
  return 0;
}

/** 从指定日期起至 monthEnd 的日历事件净变动 */
export function sumCalendarEventDelta(
  events: CalendarEvent[],
  fromDate: string,
  toDate: string,
): number {
  return events
    .filter(e => e.date >= fromDate && e.date <= toDate)
    .reduce((sum, e) => sum + calendarEventDelta(e), 0);
}

/** 预计净资产 = 当前净资产 + 未来日历事件净额（至月底） */
export function projectNetWorthThroughEndOfMonth(
  currentNetWorth: number,
  allEvents: CalendarEvent[],
  referenceDate = new Date(),
): number {
  const ref = dayjs(referenceDate);
  const today = ref.format('YYYY-MM-DD');
  const monthEnd = ref.endOf('month').format('YYYY-MM-DD');
  const monthStr = ref.format('YYYY-MM');
  const monthEvents = getCalendarEventsForMonth(allEvents, monthStr);
  return currentNetWorth + sumCalendarEventDelta(monthEvents, today, monthEnd);
}

/** 未来 N 天每日预测净资产曲线（用于趋势页扩展） */
export function projectNetWorthCurve(
  currentNetWorth: number,
  allEvents: CalendarEvent[],
  days = 90,
  referenceDate = new Date(),
): { date: string; projectedBalance: number }[] {
  const start = dayjs(referenceDate).startOf('day');
  const end = start.add(days - 1, 'day');
  const months = new Set<string>();
  for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
    months.add(d.format('YYYY-MM'));
  }

  const expanded: CalendarEvent[] = [];
  months.forEach(m => expanded.push(...getCalendarEventsForMonth(allEvents, m)));

  const curve: { date: string; projectedBalance: number }[] = [];
  let balance = currentNetWorth;

  for (let i = 0; i < days; i++) {
    const d = start.add(i, 'day');
    const dateStr = d.format('YYYY-MM-DD');
    expanded
      .filter(e => e.date === dateStr)
      .forEach(e => { balance += calendarEventDelta(e); });
    curve.push({ date: dateStr, projectedBalance: balance });
  }

  return curve;
}

/** 按月聚合的现金流日历预测曲线（趋势页虚线） */
export function projectNetWorthMonthlyTimeline(
  currentNetWorth: number,
  allEvents: CalendarEvent[],
  monthsAhead: number,
  referenceDate = new Date(),
): Array<{ month: string; netWorth: number }> {
  const now = dayjs(referenceDate);
  let running = currentNetWorth;
  const result: Array<{ month: string; netWorth: number }> = [];

  for (let i = 0; i <= monthsAhead; i++) {
    const d = now.add(i, 'month');
    const monthStr = d.format('YYYY-MM');
    const monthEvents = getCalendarEventsForMonth(allEvents, monthStr);
    const from = i === 0 ? now.format('YYYY-MM-DD') : `${monthStr}-01`;
    const to = d.endOf('month').format('YYYY-MM-DD');
    running += sumCalendarEventDelta(monthEvents, from, to);
    result.push({ month: monthStr, netWorth: running });
  }

  return result;
}

/** 解析虚拟重复事件的模板 id */
export function resolveCalendarTemplateId(event: CalendarEvent): string | null {
  if (!event.id.startsWith('virtual-')) return event.id;
  const match = event.id.match(/^virtual-(.+)-(\d{4}-\d{2})$/);
  return match?.[1] ?? null;
}

/** Future calendar projection from an observed balance; today's events are not counted again. */
export function computeCalendarPlanningTimeline(baseNetWorth: number, allEvents: CalendarEvent[], months: number, startDate: string) {
  const start = dayjs(startDate);
  const dates = new Set<string>([startDate]);
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (let i = 0; i < months; i++) {
    const month = start.add(i, 'month');
    const through = month.endOf('month').format('YYYY-MM-DD');
    dates.add(through);
    // Recurrence begins at its template date, rather than existing in all earlier months.
    const eligible = allEvents.filter(e => !e.recurring || e.date <= through);
    for (const event of getCalendarEventsForMonth(eligible, month.format('YYYY-MM'))) {
      if (event.date <= startDate || event.date > through) continue;
      dates.add(event.date);
      eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event]);
    }
  }
  let netWorth = baseNetWorth;
  let income = 0;
  let expense = 0;
  let repayment = 0;
  return [...dates].filter(d => d >= startDate).sort().map(date => {
    const events = eventsByDate.get(date) ?? [];
    for (const event of events) {
      const amount = event.amount ?? 0;
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (event.type === 'salary') income += amount;
      if (event.type === 'expense') expense += amount;
      if (event.type === 'repayment') repayment += amount;
    }
    // Paying debt principal reduces cash and debt equally; it is not a loss of net worth.
    netWorth = baseNetWorth + income - expense;
    return { date, netWorth, income, expense, repayment, cashDelta: income - expense - repayment,
      events: events.map(e => e.title) };
  });
}
