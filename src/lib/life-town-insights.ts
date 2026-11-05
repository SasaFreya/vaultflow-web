import dayjs from 'dayjs';
import type { CalendarEvent, Transaction } from '@/types';
import type { BuildingType, LifeMemory } from '@/types/life-town';
import { BUILDING_META, BUILDING_TYPES } from '@/lib/life-memories-data';
import {
  computeFinanceBuildingLevels,
  computeFinanceSummaryInRange,
  mergeBuildingStats,
  memoryLevelFromBuilding,
} from '@/lib/life-town-finance';
import type { CityLifeReport, ReportPeriod } from '@/lib/life-town-report';
import { getReportPeriodRange } from '@/lib/life-town-report';
import { formatCurrency } from '@/lib/storage';

export type InsightKind = 'reminder' | 'celebration' | 'finance' | 'wellbeing';

export interface LifeTownInsight {
  id: string;
  kind: InsightKind;
  priority: number;
  emoji: string;
  title: string;
  body: string;
  actionPath?: string;
  actionLabel?: string;
}

export interface LifeTownInsightInput {
  memories: LifeMemory[];
  transactions: Transaction[];
  calendarEvents: CalendarEvent[];
  netWorth: number;
  projectedNetWorth: number;
  period?: ReportPeriod;
  report?: CityLifeReport;
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  餐饮美食: '餐饮',
  交通出行: '交通',
  购物消费: '购物',
  房租水电: '房租',
  娱乐休闲: '娱乐',
  医疗健康: '医疗',
  学习教育: '学习',
  通讯网络: '通讯',
  人情往来: '人情',
  其他支出: '其他',
};

function topExpenseCategory(
  transactions: Transaction[],
  from: string,
  to: string,
): { category: string; amount: number; share: number } | null {
  const expenses = transactions.filter(
    t => t.type === 'expense' && t.date >= from && t.date <= to,
  );
  if (expenses.length === 0) return null;

  const totals = new Map<string, number>();
  let sum = 0;
  expenses.forEach(t => {
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    sum += t.amount;
  });

  let bestCat = '';
  let bestAmt = 0;
  totals.forEach((amt, cat) => {
    if (amt > bestAmt) {
      bestAmt = amt;
      bestCat = cat;
    }
  });

  return { category: bestCat, amount: bestAmt, share: sum > 0 ? bestAmt / sum : 0 };
}

function daysSinceLastMemory(memories: LifeMemory[]): number | null {
  if (memories.length === 0) return null;
  const latest = memories.reduce((a, b) => (a.date >= b.date ? a : b));
  return dayjs().diff(dayjs(latest.date), 'day');
}

function buildingBalanceInsight(
  memories: LifeMemory[],
  transactions: Transaction[],
): LifeTownInsight | null {
  const finance = computeFinanceBuildingLevels(transactions);
  const memoryVisits = (bt: BuildingType) =>
    memories.filter(m => m.buildingType === bt).length;

  const company = mergeBuildingStats(
    memoryLevelFromBuilding(memoryVisits('company')),
    memoryVisits('company'),
    finance.company,
  );
  const gym = mergeBuildingStats(
    memoryLevelFromBuilding(memoryVisits('gym')),
    memoryVisits('gym'),
    finance.gym,
  );

  if (company.effectiveLevel >= 3 && gym.effectiveLevel <= 1) {
    return {
      id: 'balance-gym',
      kind: 'wellbeing',
      priority: 75,
      emoji: '💪',
      title: '工作很满，别忘了运动',
      body: `公司建筑 Lv.${company.effectiveLevel}，健身房只有 Lv.${gym.effectiveLevel}。去小镇打个卡，给体力充充电。`,
      actionPath: '/town/memories',
      actionLabel: '去打卡',
    };
  }

  const library = mergeBuildingStats(
    memoryLevelFromBuilding(memoryVisits('library')),
    memoryVisits('library'),
    finance.library,
  );
  if (memories.length >= 5 && library.effectiveLevel <= 1) {
    return {
      id: 'balance-library',
      kind: 'reminder',
      priority: 60,
      emoji: '📚',
      title: '记录不少，学习回忆偏少',
      body: '图书馆建筑等级较低。下次学习时记一条回忆，让智识值涨起来。',
      actionPath: '/town/memories',
      actionLabel: '记学习',
    };
  }

  return null;
}

function moodInsight(report: CityLifeReport): LifeTownInsight | null {
  const total = report.memoryCount;
  if (total === 0) return null;

  const tiredRatio = report.moodBreakdown.tired / total;
  if (tiredRatio >= 0.4) {
    return {
      id: 'mood-tired',
      kind: 'wellbeing',
      priority: 80,
      emoji: '😴',
      title: `${report.period === 'week' ? '本周' : '本月'}疲惫感偏多`,
      body: `${Math.round(tiredRatio * 100)}% 的回忆标记为疲惫。考虑早点回小窝，或减少加班密度。`,
      actionPath: '/town/memories',
      actionLabel: '记休息',
    };
  }

  const happyRatio = (report.moodBreakdown.happy + report.moodBreakdown.excited) / total;
  if (happyRatio >= 0.5 && total >= 3) {
    return {
      id: 'mood-positive',
      kind: 'celebration',
      priority: 55,
      emoji: '🌈',
      title: '生活状态不错',
      body: `${Math.round(happyRatio * 100)}% 的回忆是开心/兴奋。保持这个节奏。`,
    };
  }

  return null;
}

export function generateLifeTownInsights(input: LifeTownInsightInput): LifeTownInsight[] {
  const period = input.period ?? 'month';
  const { from, to } = getReportPeriodRange(period);
  const insights: LifeTownInsight[] = [];

  const gap = daysSinceLastMemory(input.memories);
  if (gap === null) {
    insights.push({
      id: 'memory-start',
      kind: 'reminder',
      priority: 90,
      emoji: '📝',
      title: '人生小镇等你第一条回忆',
      body: '记录一条今天的小事，城市就会慢慢活起来。',
      actionPath: '/town/memories',
      actionLabel: '开始记录',
    });
  } else if (gap >= 3) {
    insights.push({
      id: 'memory-gap',
      kind: 'reminder',
      priority: 85,
      emoji: '⏰',
      title: `已经 ${gap} 天没记回忆了`,
      body: '不用写长文，一键打卡或拍张照片就够。',
      actionPath: '/town/memories',
      actionLabel: '记下今天',
    });
  }

  if (input.report && input.report.memoryCount >= 5) {
    insights.push({
      id: 'memory-streak',
      kind: 'celebration',
      priority: 50,
      emoji: '✨',
      title: `${input.report.period === 'week' ? '本周' : '本月'}已记录 ${input.report.memoryCount} 条`,
      body: `获得 ${input.report.expEarned} EXP，${input.report.checkInCount} 次打卡。坚持记录，报告会越来越准。`,
      actionPath: '/town/memories/report',
      actionLabel: '看报告',
    });
  }

  const mood = input.report ? moodInsight(input.report) : null;
  if (mood) insights.push(mood);

  const balance = buildingBalanceInsight(input.memories, input.transactions);
  if (balance) insights.push(balance);

  const topExpense = topExpenseCategory(input.transactions, from, to);
  if (topExpense && topExpense.share >= 0.35) {
    const label = EXPENSE_CATEGORY_LABELS[topExpense.category] ?? topExpense.category;
    insights.push({
      id: 'expense-top',
      kind: 'finance',
      priority: 70,
      emoji: '💳',
      title: `${label}占支出 ${Math.round(topExpense.share * 100)}%`,
      body: `${period === 'week' ? '本周' : '本月'}${label} ${formatCurrency(topExpense.amount)}。可在记账页查看明细。`,
      actionPath: '/transactions',
      actionLabel: '看流水',
    });
  }

  const finance = computeFinanceSummaryInRange(input.transactions, from, to);
  const netFlow = finance.incomeAmount - finance.expenseAmount;
  if (finance.expenseCount > 0 && netFlow < 0) {
    insights.push({
      id: 'finance-deficit',
      kind: 'finance',
      priority: 72,
      emoji: '📉',
      title: `${period === 'week' ? '本周' : '本月'}支出大于收入`,
      body: `结余 ${formatCurrency(netFlow)}。检查现金流日历里的未来还款/工资节点。`,
      actionPath: '/calendar',
      actionLabel: '看日历',
    });
  } else if (netFlow > 0 && finance.incomeCount > 0) {
    insights.push({
      id: 'finance-surplus',
      kind: 'celebration',
      priority: 45,
      emoji: '📈',
      title: `${period === 'week' ? '本周' : '本月'}有正结余`,
      body: `约 ${formatCurrency(netFlow)}。可以往心愿目标挪一点。`,
      actionPath: '/goals',
      actionLabel: '看目标',
    });
  }

  const projectedDelta = input.projectedNetWorth - input.netWorth;
  if (Math.abs(projectedDelta) >= 100) {
    insights.push({
      id: 'projected-nw',
      kind: 'finance',
      priority: 65,
      emoji: projectedDelta >= 0 ? '🔮' : '⚠️',
      title: projectedDelta >= 0 ? '月底净资产预计上升' : '月底净资产预计下降',
      body: `基于现金流日历，预计变动 ${formatCurrency(projectedDelta)}（当前 ${formatCurrency(input.netWorth)} → ${formatCurrency(input.projectedNetWorth)}）。`,
      actionPath: '/calendar',
      actionLabel: '调整日历',
    });
  }

  if (input.report) {
    const quietBuildings = BUILDING_TYPES.filter(bt => input.report!.buildingBreakdown[bt] === 0);
    if (input.report.memoryCount >= 2 && quietBuildings.length >= 3) {
      insights.push({
        id: 'explore-buildings',
        kind: 'reminder',
        priority: 40,
        emoji: '🗺️',
        title: '生活场景还可以更丰富',
        body: `本周期 ${quietBuildings.map(bt => BUILDING_META[bt].label).join('、')} 还没有记录。`,
        actionPath: '/town/memories',
        actionLabel: '去记录',
      });
    }
  }

  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}
