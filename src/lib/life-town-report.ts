import dayjs from 'dayjs';
import type { Transaction } from '@/types';
import type {
  BuildingType,
  LifeCityId,
  LifeMemory,
  MemoryMood,
} from '@/types/life-town';
import {
  BUILDING_META,
  BUILDING_TYPES,
  LIFE_CITY_DEFS,
  MOOD_OPTIONS,
} from '@/lib/life-memories-data';
import {
  computeFinanceBuildingLevelsInRange,
  computeFinanceSummaryInRange,
  mergeBuildingStats,
  memoryLevelFromBuilding,
} from '@/lib/life-town-finance';

export type ReportPeriod = 'week' | 'month';

export type MemoryTimeGroup = 'thisMonth' | 'thisYear' | 'earlier';

const GROUP_LABELS_MAP = {
  thisMonth: '本月',
  thisYear: '今年早些时候',
  earlier: '往年',
} as const;

export { GROUP_LABELS_MAP as MEMORY_GROUP_LABELS };

export function groupMemoriesByTime(memories: LifeMemory[]): Record<MemoryTimeGroup, LifeMemory[]> {
  const now = dayjs();
  const monthStart = now.startOf('month').format('YYYY-MM-DD');
  const yearStart = now.startOf('year').format('YYYY-MM-DD');
  const sorted = [...memories].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  return {
    thisMonth: sorted.filter(m => m.date >= monthStart),
    thisYear: sorted.filter(m => m.date >= yearStart && m.date < monthStart),
    earlier: sorted.filter(m => m.date < yearStart),
  };
}

export interface CityLifeReport {
  period: ReportPeriod;
  cityId: LifeCityId;
  cityName: string;
  rangeLabel: string;
  from: string;
  to: string;
  memoryCount: number;
  checkInCount: number;
  expEarned: number;
  dominantMood: MemoryMood;
  moodBreakdown: Record<MemoryMood, number>;
  buildingBreakdown: Record<BuildingType, number>;
  topTags: Array<{ tag: string; count: number }>;
  financeSummary: ReturnType<typeof computeFinanceSummaryInRange>;
  buildingLevels: Record<BuildingType, ReturnType<typeof mergeBuildingStats>>;
  linkedTransactionCount: number;
  highlights: LifeMemory[];
  narrative: string;
}

function emptyMoodBreakdown(): Record<MemoryMood, number> {
  return { happy: 0, calm: 0, excited: 0, tired: 0, neutral: 0 };
}

function emptyBuildingBreakdown(): Record<BuildingType, number> {
  return { home: 0, company: 0, library: 0, gym: 0, cafe: 0 };
}

export function getReportPeriodRange(period: ReportPeriod, ref = dayjs()): {
  from: string;
  to: string;
  label: string;
} {
  if (period === 'week') {
    const start = ref.startOf('week');
    return {
      from: start.format('YYYY-MM-DD'),
      to: ref.format('YYYY-MM-DD'),
      label: `${start.format('M月D日')} – ${ref.format('M月D日')}`,
    };
  }
  return {
    from: ref.startOf('month').format('YYYY-MM-DD'),
    to: ref.format('YYYY-MM-DD'),
    label: ref.format('YYYY年M月'),
  };
}

function countTags(memories: LifeMemory[]): Array<{ tag: string; count: number }> {
  const map = new Map<string, number>();
  memories.forEach(m => {
    m.tags.forEach(tag => map.set(tag, (map.get(tag) ?? 0) + 1));
  });
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function dominantMood(breakdown: Record<MemoryMood, number>): MemoryMood {
  let best: MemoryMood = 'neutral';
  let max = 0;
  (Object.entries(breakdown) as Array<[MemoryMood, number]>).forEach(([mood, n]) => {
    if (n > max) {
      max = n;
      best = mood;
    }
  });
  return best;
}

function buildNarrative(report: Omit<CityLifeReport, 'narrative'>): string {
  const periodWord = report.period === 'week' ? '这周' : '本月';
  const moodLabel = MOOD_OPTIONS.find(m => m.value === report.dominantMood)?.label ?? '一般';
  const topBuilding = BUILDING_TYPES
    .map(bt => ({ bt, n: report.buildingBreakdown[bt] }))
    .sort((a, b) => b.n - a.n)[0];
  const buildingLabel = topBuilding?.n
    ? BUILDING_META[topBuilding.bt].label
    : null;

  const parts: string[] = [
    `${periodWord}在${report.cityName}记录了 ${report.memoryCount} 条回忆`,
  ];
  if (report.checkInCount > 0) parts.push(`其中 ${report.checkInCount} 次打卡`);
  if (buildingLabel) parts.push(`最常去的是${buildingLabel}`);
  parts.push(`整体心情偏${moodLabel}`);
  if (report.financeSummary.incomeAmount > 0) {
    parts.push(`同期收入 ${report.financeSummary.incomeCount} 笔`);
  }
  return parts.join('，') + '。';
}

export function buildCityLifeReport(
  cityId: LifeCityId,
  memories: LifeMemory[],
  transactions: Transaction[],
  period: ReportPeriod,
  ref = dayjs(),
): CityLifeReport {
  const { from, to, label } = getReportPeriodRange(period, ref);
  const cityName = LIFE_CITY_DEFS.find(c => c.id === cityId)?.name ?? cityId;

  const periodMemories = memories
    .filter(m => m.cityId === cityId && m.date >= from && m.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const moodBreakdown = emptyMoodBreakdown();
  const buildingBreakdown = emptyBuildingBreakdown();
  let expEarned = 0;
  let checkInCount = 0;
  let linkedTransactionCount = 0;

  periodMemories.forEach(m => {
    const mood = m.mood ?? 'neutral';
    moodBreakdown[mood] += 1;
    buildingBreakdown[m.buildingType] += 1;
    expEarned += BUILDING_META[m.buildingType].expPerVisit;
    if (m.tags.includes('打卡')) checkInCount += 1;
    if (m.linkedTransactionId) linkedTransactionCount += 1;
  });

  const financeSummary = computeFinanceSummaryInRange(transactions, from, to);
  const financeLevels = computeFinanceBuildingLevelsInRange(transactions, from, to);

  const buildingLevels = {} as CityLifeReport['buildingLevels'];
  BUILDING_TYPES.forEach(bt => {
    const memVisits = periodMemories.filter(m => m.buildingType === bt).length;
    buildingLevels[bt] = mergeBuildingStats(
      memoryLevelFromBuilding(memVisits),
      memVisits,
      financeLevels[bt],
    );
  });

  const base: Omit<CityLifeReport, 'narrative'> = {
    period,
    cityId,
    cityName,
    rangeLabel: label,
    from,
    to,
    memoryCount: periodMemories.length,
    checkInCount,
    expEarned,
    dominantMood: dominantMood(moodBreakdown),
    moodBreakdown,
    buildingBreakdown,
    topTags: countTags(periodMemories),
    financeSummary,
    buildingLevels,
    linkedTransactionCount,
    highlights: periodMemories.slice(0, 3),
  };

  return { ...base, narrative: buildNarrative(base) };
}

export function filterMemoriesByQuery(memories: LifeMemory[], query: string): LifeMemory[] {
  const q = query.trim().toLowerCase();
  if (!q) return memories;
  return memories.filter(m =>
    m.content.toLowerCase().includes(q) ||
    m.tags.some(t => t.toLowerCase().includes(q)) ||
    BUILDING_META[m.buildingType].label.includes(q),
  );
}

export function collectAllTags(memories: LifeMemory[]): string[] {
  const set = new Set<string>();
  memories.forEach(m => m.tags.forEach(t => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
