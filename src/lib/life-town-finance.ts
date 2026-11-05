import dayjs from 'dayjs';
import type { Transaction } from '@/types';
import type { BuildingType } from '@/types/life-town';
import { buildingLevelFromVisits } from '@/lib/life-memories-data';

const INCOME_CATEGORIES = new Set(['工资收入', '奖金', '兼职收入', '理财收益', '其他收入']);

export const EXPENSE_CATEGORY_BUILDING: Partial<Record<string, BuildingType>> = {
  餐饮美食: 'cafe',
  娱乐休闲: 'cafe',
  人情往来: 'cafe',
  购物消费: 'cafe',
  学习教育: 'library',
  医疗健康: 'gym',
  房租水电: 'home',
  通讯网络: 'home',
  交通出行: 'home',
};

export interface FinanceBuildingStats {
  activityCount: number;
  totalAmount: number;
  level: number;
}

export type FinanceBuildingMap = Record<BuildingType, FinanceBuildingStats>;

export interface MergedBuildingStats {
  memoryLevel: number;
  memoryVisits: number;
  financeLevel: number;
  financeActivity: number;
  financeAmount: number;
  effectiveLevel: number;
}

/** 平缓曲线：活动越多等级越高，上限 10 */
export function financeLevelFromActivity(count: number): number {
  if (count <= 0) return 1;
  return Math.min(10, 1 + Math.floor(Math.sqrt(count)));
}

function emptyFinanceMap(): FinanceBuildingMap {
  return {
    home: { activityCount: 0, totalAmount: 0, level: 1 },
    company: { activityCount: 0, totalAmount: 0, level: 1 },
    library: { activityCount: 0, totalAmount: 0, level: 1 },
    gym: { activityCount: 0, totalAmount: 0, level: 1 },
    cafe: { activityCount: 0, totalAmount: 0, level: 1 },
  };
}

/** 近 N 天银行/手动流水 → 各建筑财务活跃度（M1 镜像层） */
export function computeFinanceBuildingLevels(
  transactions: Transaction[],
  windowDays = 90,
): FinanceBuildingMap {
  const cutoff = dayjs().subtract(windowDays, 'day').format('YYYY-MM-DD');
  const recent = transactions.filter(t => t.date >= cutoff);
  const map = emptyFinanceMap();

  for (const t of recent) {
    const building = transactionToBuilding(t);
    if (!building) continue;

    map[building].activityCount += 1;
    map[building].totalAmount += t.amount;
  }

  (Object.keys(map) as BuildingType[]).forEach(bt => {
    map[bt].level = financeLevelFromActivity(map[bt].activityCount);
  });

  return map;
}

export function mergeBuildingStats(
  memoryLevel: number,
  memoryVisits: number,
  finance: FinanceBuildingStats,
): MergedBuildingStats {
  return {
    memoryLevel,
    memoryVisits,
    financeLevel: finance.level,
    financeActivity: finance.activityCount,
    financeAmount: finance.totalAmount,
    effectiveLevel: Math.max(memoryLevel, finance.level),
  };
}

export function transactionToBuilding(t: Transaction): BuildingType | null {
  if (t.type === 'income') {
    return INCOME_CATEGORIES.has(t.category) ? 'company' : 'company';
  }
  return EXPENSE_CATEGORY_BUILDING[t.category] ?? null;
}

/** 指定日期区间内的全局收支摘要（报告页用） */
export function computeFinanceSummaryInRange(
  transactions: Transaction[],
  fromDate: string,
  toDate: string,
): { incomeCount: number; incomeAmount: number; expenseCount: number; expenseAmount: number } {
  const inRange = transactions.filter(t => t.date >= fromDate && t.date <= toDate);
  let incomeCount = 0;
  let incomeAmount = 0;
  let expenseCount = 0;
  let expenseAmount = 0;
  for (const t of inRange) {
    if (t.type === 'income') {
      incomeCount += 1;
      incomeAmount += t.amount;
    } else {
      expenseCount += 1;
      expenseAmount += t.amount;
    }
  }
  return { incomeCount, incomeAmount, expenseCount, expenseAmount };
}

/** 指定日期区间 → 各建筑财务活跃度 */
export function computeFinanceBuildingLevelsInRange(
  transactions: Transaction[],
  fromDate: string,
  toDate: string,
): FinanceBuildingMap {
  const inRange = transactions.filter(t => t.date >= fromDate && t.date <= toDate);
  const map = emptyFinanceMap();

  for (const t of inRange) {
    const building = transactionToBuilding(t);
    if (!building) continue;
    map[building].activityCount += 1;
    map[building].totalAmount += t.amount;
  }

  (Object.keys(map) as BuildingType[]).forEach(bt => {
    map[bt].level = financeLevelFromActivity(map[bt].activityCount);
  });

  return map;
}

export function memoryLevelFromBuilding(visitCount: number): number {
  return buildingLevelFromVisits(visitCount);
}
