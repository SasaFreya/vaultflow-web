import type { AppData, Budget, Goal, VaultSettings } from '@/types';
import { formatCurrency, getCurrentMonth, convertToBase } from '@/lib/storage';

export function computeHealthScore(metrics: {
  emergencyMonths: number;
  debtRatio: number;
  savingsRate: number;
  investmentRatio: number;
}): { score: number; level: 'good' | 'warn' | 'bad' } {
  let score = 0;

  if (metrics.emergencyMonths >= 6) score += 25;
  else if (metrics.emergencyMonths >= 3) score += 18;
  else if (metrics.emergencyMonths > 0) score += Math.min(15, metrics.emergencyMonths * 4);

  if (metrics.debtRatio < 30) score += 25;
  else if (metrics.debtRatio < 50) score += 15;
  else if (metrics.debtRatio < 70) score += 8;

  if (metrics.savingsRate >= 20) score += 25;
  else if (metrics.savingsRate >= 10) score += 15;
  else if (metrics.savingsRate > 0) score += 8;

  if (metrics.investmentRatio >= 20) score += 25;
  else if (metrics.investmentRatio >= 10) score += 15;
  else if (metrics.investmentRatio > 0) score += 8;

  const level = score >= 80 ? 'good' : score >= 50 ? 'warn' : 'bad';
  return { score: Math.min(100, Math.round(score)), level };
}

export function computeMonthlyStats(data: AppData, settings?: VaultSettings) {
  const currentMonth = getCurrentMonth();
  const prevDate = new Date(currentMonth + '-01');
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const transactions = data.transactions.map(t => ({ ...t, amount: settings ? convertToBase(t.amount, data.accounts.find(a => a.id === t.accountId)?.currency ?? 'CNY', settings) : t.amount }));
  const cur = transactions.filter(t => t.date.startsWith(currentMonth));
  const prev = transactions.filter(t => t.date.startsWith(prevMonth));

  const income = cur.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = cur.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevExpense = prev.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const balance = income - expense;

  return { income, expense, balance, savingsRate, prevExpense, currentMonth, prevMonth };
}

export function getOverBudgetLabels(budgets: Budget[]): { category: string; over: number }[] {
  return budgets
    .map(b => ({
      category: b.category,
      over: b.spent - b.monthlyLimit,
    }))
    .filter(x => x.over > 0)
    .sort((a, b) => b.over - a.over)
    .slice(0, 4);
}

export function estimateGoalMonths(goal: Goal, monthlySavings: number): number | null {
  if (goal.completed || goal.targetAmount <= goal.currentAmount) return 0;
  if (monthlySavings <= 0) return null;
  const remaining = goal.targetAmount - goal.currentAmount;
  return Math.ceil(remaining / monthlySavings);
}

export function goalProgressColor(pct: number): string {
  if (pct <= 30) return 'var(--vault-red)';
  if (pct <= 70) return 'var(--vault-yellow)';
  return 'var(--vault-accent)';
}

export function generateInsights(
  data: AppData,
  budgets: Budget[],
  totals: {
    emergencyMonths: number;
    debtRatio: number;
    savingsRate: number;
  },
  monthly: ReturnType<typeof computeMonthlyStats>,
): string[] {
  const insights: string[] = [];
  const currentMonth = getCurrentMonth();

  if (monthly.prevExpense > 0 && monthly.expense > 0) {
    const topCategory = data.transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {});
    const prevByCat = data.transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(monthly.prevMonth))
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {});

    let maxJump = { cat: '', pct: 0 };
    Object.entries(topCategory).forEach(([cat, amt]) => {
      const prev = prevByCat[cat] ?? 0;
      if (prev > 0) {
        const pct = ((amt - prev) / prev) * 100;
        if (pct > maxJump.pct) maxJump = { cat, pct };
      }
    });
    if (maxJump.pct >= 20) {
      insights.push(`本月${maxJump.cat}支出比上月高 ${maxJump.pct.toFixed(0)}%，建议关注`);
    }
  }

  if (totals.emergencyMonths > 0 && totals.emergencyMonths < 3) {
    insights.push(`应急资金可覆盖 ${totals.emergencyMonths.toFixed(1)} 个月支出，建议存到 3 个月`);
  } else if (totals.emergencyMonths >= 6) {
    insights.push(`应急资金充足（${totals.emergencyMonths.toFixed(1)} 个月），财务缓冲良好`);
  }

  const over = getOverBudgetLabels(budgets);
  if (over.length > 0) {
    insights.push(`${over[0].category} 已超支 ${formatCurrency(over[0].over)}`);
  }

  const activeGoal = [...data.goals].sort((a, b) => a.priority - b.priority).find(g => !g.completed);
  if (activeGoal && monthly.balance > 0) {
    const months = estimateGoalMonths(activeGoal, monthly.balance);
    const pct = activeGoal.targetAmount > 0
      ? (activeGoal.currentAmount / activeGoal.targetAmount) * 100
      : 0;
    if (months !== null && months > 0) {
      insights.push(`心愿「${activeGoal.name}」进度 ${pct.toFixed(0)}%，按当前结余速度预计 ${months} 个月后达成`);
    }
  }

  if (insights.length === 0) {
    insights.push('本月收支平稳，继续保持记录习惯');
  }

  return insights.slice(0, 3);
}

export function budgetExecutionRate(budgets: Budget[]): number {
  const totalLimit = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  if (totalLimit <= 0) return 0;
  return (totalSpent / totalLimit) * 100;
}

export function goalCompletionRate(goals: Goal[]): number {
  if (goals.length === 0) return 0;
  return (goals.filter(g => g.completed).length / goals.length) * 100;
}
