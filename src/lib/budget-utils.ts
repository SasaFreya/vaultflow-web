import type { Budget, BudgetPeriod } from '@/types';

export function toMonthlyEquivalent(amount: number, period: BudgetPeriod = 'monthly'): number {
  switch (period) {
    case 'daily': return Math.round(amount * 30 * 100) / 100;
    case 'weekly': return Math.round(amount * 4.33 * 100) / 100;
    case 'monthly':
    default: return amount;
  }
}

export function periodLabel(period: BudgetPeriod = 'monthly'): string {
  switch (period) {
    case 'daily': return '日';
    case 'weekly': return '周';
    case 'monthly': return '月';
    default: return '月';
  }
}

export function isBudgetActive(budget: Budget, dateStr: string): boolean {
  if (budget.startDate && dateStr < budget.startDate) return false;
  if (budget.endDate && dateStr > budget.endDate) return false;
  return true;
}

export function normalizeBudget(budget: Budget): Budget {
  const period = budget.period ?? 'monthly';
  const amount = budget.amount ?? budget.monthlyLimit;
  return {
    ...budget,
    period,
    amount,
    monthlyLimit: toMonthlyEquivalent(amount, period),
    alertThreshold: budget.alertThreshold ?? 0.8,
  };
}

export function budgetStatus(spent: number, limit: number, threshold = 0.8): 'under' | 'near' | 'over' {
  if (limit <= 0) return 'under';
  const ratio = spent / limit;
  if (ratio >= 1) return 'over';
  if (ratio >= threshold) return 'near';
  return 'under';
}
