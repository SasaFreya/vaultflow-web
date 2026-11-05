import dayjs from 'dayjs';
import type { BuildingType, LifeCityRecord, LifeMemory, MemoryMood } from '@/types/life-town';
import type { Transaction } from '@/types';
import { MOOD_OPTIONS } from '@/lib/life-memories-data';
import {
  computeFinanceBuildingLevels,
  computeFinanceBuildingLevelsInRange,
  mergeBuildingStats,
  memoryLevelFromBuilding,
  transactionToBuilding,
} from '@/lib/life-town-finance';
import { formatCurrency } from '@/lib/storage';
import type { HubLayoutPosition } from '@/types/life-town';
import { clampExplorePosition } from '@/lib/town-explore-layout';

export type ExploreVitality = 'dormant' | 'emerging' | 'active' | 'vivid';
export type ExploreTimelinePeriod = 'week' | 'month';
export type DomainTrend = 'growing' | 'stable' | 'dormant';

const EXPENSE_LABELS: Record<string, string> = {
  餐饮美食: '餐饮',
  交通出行: '交通',
  购物消费: '购物',
  房租水电: '房租',
  娱乐休闲: '娱乐',
  医疗健康: '医疗',
  学习教育: '学习',
  通讯网络: '通讯',
  人情往来: '人情',
};

/** 人生域 — 把地点从「游戏 POI」读成生态节点 */
export const LIFE_DOMAIN_META: Record<
  BuildingType,
  { label: string; tagline: string; hue: string; defaultPlaceName: string }
> = {
  home: { label: '根域', tagline: '生活基底', hue: 'rgba(255, 183, 197, 0.14)', defaultPlaceName: '我的小窝' },
  company: { label: '职域', tagline: '工作与收入', hue: 'rgba(25, 118, 210, 0.1)', defaultPlaceName: '公司' },
  gym: { label: '身域', tagline: '身体与健康', hue: 'rgba(245, 124, 0, 0.1)', defaultPlaceName: '健身房' },
  library: { label: '心域', tagline: '学习与思考', hue: 'rgba(56, 142, 60, 0.1)', defaultPlaceName: '图书馆' },
  cafe: { label: '社域', tagline: '社交与消费', hue: 'rgba(141, 110, 99, 0.1)', defaultPlaceName: '咖啡厅' },
};

export interface RecentBillPreview {
  label: string;
  amount: number;
  date: string;
  formatted: string;
}

export interface ExploreNodeEcosystem {
  buildingType: BuildingType;
  memoryCount: number;
  memoryAnchorCount: number;
  linkedBillCount: number;
  financeActivity: number;
  financeAmount: number;
  effectiveLevel: number;
  latestEcho: string | null;
  latestDate: string | null;
  latestMood: MemoryMood | null;
  moodEmoji: string | null;
  vitality: ExploreVitality;
  recentBills: RecentBillPreview[];
  trend: DomainTrend;
}

export interface CrossCityDomainCompare {
  buildingType: BuildingType;
  domainLabel: string;
  cities: Array<{ cityId: string; cityName: string; memoryCount: number; financeActivity: number; vitality: ExploreVitality }>;
}

const ALL_BUILDINGS: BuildingType[] = ['home', 'company', 'library', 'gym', 'cafe'];

function periodRange(period: ExploreTimelinePeriod): { from: string; to: string; prevFrom: string; prevTo: string } {
  const to = dayjs().format('YYYY-MM-DD');
  if (period === 'week') {
    const from = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
    const prevTo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
    const prevFrom = dayjs().subtract(13, 'day').format('YYYY-MM-DD');
    return { from, to, prevFrom, prevTo };
  }
  const from = dayjs().startOf('month').format('YYYY-MM-DD');
  const prevTo = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
  const prevFrom = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
  return { from, to, prevFrom, prevTo };
}

function truncateEcho(content: string, max = 26): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

function computeVitality(
  memoryCount: number,
  financeActivity: number,
  linkedBillCount: number,
): ExploreVitality {
  const score = memoryCount * 2 + financeActivity + linkedBillCount;
  if (score === 0) return 'dormant';
  if (score < 4) return 'emerging';
  if (score < 10) return 'active';
  return 'vivid';
}

function computeTrend(
  currentScore: number,
  previousScore: number,
): DomainTrend {
  if (currentScore === 0 && previousScore === 0) return 'dormant';
  if (currentScore > previousScore) return 'growing';
  if (currentScore === previousScore && currentScore > 0) return 'stable';
  if (currentScore === 0) return 'dormant';
  return 'stable';
}

function recentBillsForBuilding(
  transactions: Transaction[],
  buildingType: BuildingType,
  limit = 2,
): RecentBillPreview[] {
  return transactions
    .filter(t => transactionToBuilding(t) === buildingType)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map(t => {
      const label = t.type === 'income' ? '收入' : (EXPENSE_LABELS[t.category] ?? t.category);
      return {
        label,
        amount: t.amount,
        date: t.date,
        formatted: `${label} ${formatCurrency(t.amount)}`,
      };
    });
}

export function resolveExplorePlaceName(
  buildingType: BuildingType,
  fallbackName: string,
  exploreNames?: Partial<Record<BuildingType, string>>,
): string {
  const custom = exploreNames?.[buildingType]?.trim();
  if (custom) return custom;
  return fallbackName || LIFE_DOMAIN_META[buildingType].defaultPlaceName;
}

export function separateOverlappingPins(
  positions: Record<string, HubLayoutPosition>,
  minDistance = 11,
): Record<string, HubLayoutPosition> {
  const ids = Object.keys(positions);
  const result: Record<string, HubLayoutPosition> = {};
  ids.forEach(id => {
    result[id] = { ...positions[id] };
  });

  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        const a = result[idA];
        const b = result[idB];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= minDistance || dist < 0.01) continue;
        const push = (minDistance - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        result[idA] = clampExplorePosition(a.x - nx * push, a.y - ny * push);
        result[idB] = clampExplorePosition(b.x + nx * push, b.y + ny * push);
      }
    }
  }
  return result;
}

export function computeExploreEcosystem(
  cityId: string,
  city: LifeCityRecord,
  memories: LifeMemory[],
  transactions: Transaction[],
  period: ExploreTimelinePeriod = 'month',
): Record<BuildingType, ExploreNodeEcosystem> {
  const cityMemories = memories.filter(m => m.cityId === cityId);
  const { from, to, prevFrom, prevTo } = periodRange(period);
  const financeLevels = computeFinanceBuildingLevelsInRange(transactions, from, to);
  const prevFinanceLevels = computeFinanceBuildingLevelsInRange(transactions, prevFrom, prevTo);
  const result = {} as Record<BuildingType, ExploreNodeEcosystem>;

  for (const bt of ALL_BUILDINGS) {
    const bMemories = cityMemories
      .filter(m => m.buildingType === bt)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const periodMemories = bMemories.filter(m => m.date >= from && m.date <= to);
    const prevPeriodMemories = bMemories.filter(m => m.date >= prevFrom && m.date <= prevTo);
    const latest = bMemories[0];
    const linkedBillCount = bMemories.filter(m => m.linkedTransactionId).length;
    const memBuilding = city.buildings[bt];
    const merged = mergeBuildingStats(
      memoryLevelFromBuilding(memBuilding.visitCount),
      memBuilding.visitCount,
      financeLevels[bt],
    );
    const mood = latest?.mood ?? null;
    const currentScore = periodMemories.length * 2 + financeLevels[bt].activityCount;
    const previousScore = prevPeriodMemories.length * 2 + prevFinanceLevels[bt].activityCount;

    result[bt] = {
      buildingType: bt,
      memoryCount: bMemories.length,
      memoryAnchorCount: bMemories.length,
      linkedBillCount,
      financeActivity: merged.financeActivity,
      financeAmount: merged.financeAmount,
      effectiveLevel: merged.effectiveLevel,
      latestEcho: latest ? truncateEcho(latest.content) : null,
      latestDate: latest?.date ?? null,
      latestMood: mood,
      moodEmoji: mood ? (MOOD_OPTIONS.find(m => m.value === mood)?.emoji ?? null) : null,
      vitality: computeVitality(bMemories.length, financeLevels[bt].activityCount, linkedBillCount),
      recentBills: recentBillsForBuilding(transactions, bt),
      trend: computeTrend(currentScore, previousScore),
    };
  }

  return result;
}

export function computeCityEcosystemSummary(
  ecosystem: Record<BuildingType, ExploreNodeEcosystem>,
) {
  const nodes = Object.values(ecosystem);
  return {
    totalMemories: nodes.reduce((s, n) => s + n.memoryCount, 0),
    linkedBills: nodes.reduce((s, n) => s + n.linkedBillCount, 0),
    financeSignals: nodes.reduce((s, n) => s + n.financeActivity, 0),
    activeDomains: nodes.filter(n => n.vitality !== 'dormant').length,
    growingDomains: nodes.filter(n => n.trend === 'growing').length,
    dormantDomains: nodes.filter(n => n.trend === 'dormant').length,
  };
}

export function computeCrossCityDomainComparison(
  cities: LifeCityRecord[],
  memories: LifeMemory[],
  transactions: Transaction[],
  domains: BuildingType[] = ['company', 'cafe'],
): CrossCityDomainCompare[] {
  return domains.map(buildingType => ({
    buildingType,
    domainLabel: LIFE_DOMAIN_META[buildingType].label,
    cities: cities
      .filter(c => c.unlockedAt)
      .map(city => {
        const eco = computeExploreEcosystem(city.id, city, memories, transactions);
        const node = eco[buildingType];
        return {
          cityId: city.id,
          cityName: city.name,
          memoryCount: node.memoryCount,
          financeActivity: node.financeActivity,
          vitality: node.vitality,
        };
      }),
  }));
}

/** Hub 银行：汇总账单镜像 */
export function hubBankEcosystemHint(ecosystem: Record<BuildingType, ExploreNodeEcosystem>): string {
  const signals = ALL_BUILDINGS.reduce((s, bt) => s + ecosystem[bt].financeActivity, 0);
  const top = [...ALL_BUILDINGS].sort((a, b) => ecosystem[b].financeActivity - ecosystem[a].financeActivity)[0];
  return `账单信号 ${signals} 笔 · ${LIFE_DOMAIN_META[top].label}最活跃`;
}

/** Hub 许愿树：汇总回忆与域生长 */
export function hubWishTreeEcosystemHint(
  ecosystem: Record<BuildingType, ExploreNodeEcosystem>,
  memoryCount: number,
): string {
  const growing = ALL_BUILDINGS.filter(bt => ecosystem[bt].trend === 'growing').length;
  return `回忆 ${memoryCount} 条 · ${growing} 域在生长`;
}

export { computeFinanceBuildingLevels };
