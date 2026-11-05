import type { Transaction } from '@/types';
import type { BuildingType } from '@/types/life-town';
import { transactionToBuilding } from '@/lib/life-town-finance';

/** 同日 + 建筑类别匹配的流水，用于 v2 自动关联 */
export function suggestLinkedTransactionId(
  transactions: Transaction[],
  date: string,
  buildingType: BuildingType,
): string | null {
  const sameDay = transactions.filter(t => t.date === date);
  if (sameDay.length === 0) return null;

  const categoryMatch = sameDay.find(t => transactionToBuilding(t) === buildingType);
  if (categoryMatch) return categoryMatch.id;

  if (buildingType === 'company') {
    const income = sameDay.find(t => t.type === 'income');
    if (income) return income.id;
  }

  return sameDay[0]?.id ?? null;
}

export function getSameDayTransactions(
  transactions: Transaction[],
  date: string,
  buildingType?: BuildingType,
): Transaction[] {
  const sameDay = transactions.filter(t => t.date === date);
  if (!buildingType) return sameDay;
  const matched = sameDay.filter(t => transactionToBuilding(t) === buildingType);
  return matched.length > 0 ? matched : sameDay;
}

export function findTransactionById(
  transactions: Transaction[],
  id: string | null | undefined,
): Transaction | undefined {
  if (!id) return undefined;
  return transactions.find(t => t.id === id);
}
