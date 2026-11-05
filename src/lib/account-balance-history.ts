import type { Account, AccountBalancePoint, AppData } from '@/types';
import { generateId, getToday, normalizeDebtBalance } from '@/lib/storage';

export function accountBalanceSeries(data: AppData, accountId: string): AccountBalancePoint[] {
  const inventory = (data.assetCheckpoints ?? []).flatMap(c => {
    const account = c.accounts.find(a => a.id === accountId);
    return account?.balance === null || !account ? [] : [{
      id: `${c.id}-${accountId}`, accountId, date: c.date, recordedAt: c.createdAt,
      balance: account.balance, currency: account.currency ?? 'CNY', accountType: account.type,
      note: c.note, source: 'inventory' as const,
    }];
  });
  return [...(data.accountBalanceHistory ?? []).filter(p => p.accountId === accountId), ...inventory]
    .sort((a, b) => a.date.localeCompare(b.date) || a.recordedAt.localeCompare(b.recordedAt));
}

export function makeAccountBalancePoint(account: Account, date = getToday(), source: AccountBalancePoint['source'] = 'account-edit'): AccountBalancePoint | null {
  if (account.balance === null) return null;
  if (!Number.isFinite(account.balance)) throw new Error('请输入有效余额');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || date > getToday()) throw new Error('请选择有效日期，不能晚于今天');
  return { id: generateId(), accountId: account.id, date, recordedAt: new Date().toISOString(),
    balance: account.balance, currency: account.currency ?? 'CNY', accountType: account.type, note: account.note ?? '', source };
}

export function recordAccountUpdate(data: AppData, id: string, updates: Partial<Account>, date = getToday()): AppData {
  const account = data.accounts.find(a => a.id === id);
  if (!account) throw new Error('账户不存在');
  const next = { ...account, ...updates, id: account.id,
    balance: normalizeDebtBalance(updates.type ?? account.type, updates.balance !== undefined ? updates.balance : account.balance), updatedAt: getToday() };
  const point = updates.balance !== undefined ? makeAccountBalancePoint(next, date) : null;
  const baseline = point && !accountBalanceSeries(data, id).length ? makeAccountBalancePoint(account, getToday(), 'baseline') : null;
  if (baseline && point && baseline.recordedAt >= point.recordedAt) baseline.recordedAt = new Date(Date.parse(point.recordedAt) - 1).toISOString();
  return { ...data,
    accounts: date < getToday() ? data.accounts : data.accounts.map(a => a.id === id ? next : a),
    accountBalanceHistory: [...(data.accountBalanceHistory ?? []), ...(baseline ? [baseline] : []), ...(point ? [point] : [])],
  };
}
