import dayjs from 'dayjs';
import type { BuildingType } from '@/types/life-town';
import type { DomainDetailBill, DomainDetailMemory } from '@/lib/explore-ecology-ext';

export type DomainTimelineKind = 'bill' | 'memory';

export type TimelineViewMode = 'merged' | 'bills' | 'memories';

export interface DomainTimelineItem {
  id: string;
  kind: DomainTimelineKind;
  date: string;
  title: string;
  subtitle?: string;
  lagHint?: string;
  /** 同日有账单/回忆可链但未链 */
  linkable?: boolean;
}

export function buildMergedDomainTimeline(
  memories: DomainDetailMemory[],
  bills: DomainDetailBill[],
): DomainTimelineItem[] {
  const billItems: DomainTimelineItem[] = bills.map(b => ({
    id: `bill-${b.id}`,
    kind: 'bill',
    date: b.date,
    title: `${b.label} ${b.formatted}`,
    subtitle: '账单信号',
  }));

  const memoryItems: DomainTimelineItem[] = memories.map(m => {
    const priorBill = bills
      .filter(b => b.date <= m.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    let lagHint: string | undefined;
    if (priorBill) {
      const lag = dayjs(m.date).diff(dayjs(priorBill.date), 'day');
      if (lag > 0) lagHint = `滞后 ${lag} 天 · 账单在前`;
      else if (lag === 0 && m.linkedAmount == null) lagHint = '同日 · 可链账单';
      else if (m.linkedAmount != null) lagHint = '已链账单';
    }
    return {
      id: `mem-${m.id}`,
      kind: 'memory',
      date: m.date,
      title: m.content.length > 48 ? `${m.content.slice(0, 48)}…` : m.content,
      subtitle: [m.moodEmoji, m.geoLabel ? `📍 ${m.geoLabel}` : null].filter(Boolean).join(' ') || undefined,
      lagHint,
    };
  });

  return [...billItems, ...memoryItems].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return a.kind === 'bill' ? -1 : 1;
  });
}

export function filterTimelineByMode(
  items: DomainTimelineItem[],
  mode: TimelineViewMode,
): DomainTimelineItem[] {
  if (mode === 'bills') return items.filter(i => i.kind === 'bill');
  if (mode === 'memories') return items.filter(i => i.kind === 'memory');
  return items;
}

/** 标记同日可链但未链的条目 */
export function markLinkableTimelinePairs(items: DomainTimelineItem[]): DomainTimelineItem[] {
  const billDates = new Set(items.filter(i => i.kind === 'bill').map(i => i.date));
  return items.map(item => {
    if (item.kind !== 'memory') return item;
    const hasBillSameDay = billDates.has(item.date);
    const alreadyLinked = item.lagHint?.includes('已链');
    return {
      ...item,
      linkable: hasBillSameDay && !alreadyLinked,
    };
  });
}

export const DEFAULT_DOMAIN_GOALS: Record<BuildingType, number> = {
  home: 2,
  company: 3,
  gym: 4,
  library: 3,
  cafe: 2,
};
