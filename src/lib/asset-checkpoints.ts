import type { Account, AppData, AssetCheckpoint, VaultSettings } from '@/types';
import { calculateTotals, convertToBase, generateId, getToday, normalizeAccount } from '@/lib/storage';

export function createCheckpoint(data: AppData, accounts: Account[], settings: VaultSettings, note: string, date = getToday()): AssetCheckpoint {
  const missing = accounts.filter(a => a.balance === null || !Number.isFinite(a.balance));
  if (!accounts.length || missing.length) throw new Error(missing.length ? `请补全余额：${missing.map(a => a.name).join('、')}。实际余额为 0 才填 0，未知余额不能按零计算。` : '请先添加账户');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || date > getToday()) throw new Error('请选择有效的盘点日期，不能晚于今天');
  const normalized = accounts.map(normalizeAccount);
  const previous = data.assetCheckpoints?.filter(c => c.date <= date).at(-1);
  const existing = data.assetCheckpoints?.at(-1);
  if (existing && existing.baseCurrency !== settings.baseCurrency) {
    throw new Error('请将基准币种切回上次盘点的币种，再保存盘点，以保持节点可比较');
  }
  const captured = new Set(previous?.transactionIds ?? []);
  const interval = previous ? data.transactions.filter(t => t.date <= date &&
    (t.date > previous.date || (t.date === previous.date && !captured.has(t.id)))) : [];
  let income = 0;
  let expense = 0;
  for (const t of interval) {
    const amount = convertToBase(t.amount, data.accounts.find(a => a.id === t.accountId)?.currency ?? 'CNY', settings);
    if (t.type === 'income') income += amount;
    else expense += amount;
  }
  const totals = calculateTotals({ ...data, accounts: normalized }, settings);
  return {
    id: generateId(), date, createdAt: new Date().toISOString(), note: note.trim(),
    accounts: normalized.map(a => ({ ...a })), baseCurrency: settings.baseCurrency,
    exchangeRates: { ...settings.exchangeRates }, transactionIds: data.transactions.filter(t => date === getToday() || t.date <= date).map(t => t.id),
    balanceApplied: date === getToday(),
    previousId: previous?.id, intervalIncome: income, intervalExpense: expense,
    unexplainedChange: previous ? totals.netWorth - previous.netWorth - income + expense : null,
    totalAssets: totals.totalAssets, totalDebt: totals.totalDebt, netWorth: totals.netWorth,
    liquidAssets: totals.liquidAssets, investmentAssets: totals.investmentAssets,
  };
}

/** Once an inventory absorbs a transaction, deleting its ledger record must not undo the observed balance. */
export function shouldReverseTransaction(data: AppData, transactionId: string): boolean {
  const tx = data.transactions.find(t => t.id === transactionId);
  return !!tx && tx.source !== 'csv' && !(data.assetCheckpoints?.filter(c => c.balanceApplied !== false).at(-1)?.transactionIds.includes(transactionId));
}


export function addCheckpoint(data: AppData, accounts: Account[], settings: VaultSettings, note: string, date = getToday()): AppData {
  const checkpoint = createCheckpoint(data, accounts, settings, note, date);
  return {
    ...data,
    accounts: checkpoint.balanceApplied ? checkpoint.accounts.map(a => ({ ...a })) : data.accounts,
    assetCheckpoints: [...(data.assetCheckpoints ?? []), checkpoint].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
  };
}

/** Shared period view for trends and analysis. Late-entered ledger records do not rewrite saved nodes. */
export function compareCheckpoints(data: AppData, start: AssetCheckpoint, end: AssetCheckpoint) {
  if (start.baseCurrency !== end.baseCurrency) return null;
  const startIds = new Set(start.transactionIds);
  const endIds = new Set(end.transactionIds);
  const accounts = new Map([...data.accounts, ...start.accounts, ...end.accounts].map(a => [a.id, a]));
  const settings = { baseCurrency: end.baseCurrency, exchangeRates: end.exchangeRates } as VaultSettings;
  const categoryMap = new Map<string, number>();
  let income = 0;
  let expense = 0;
  const transactions = data.transactions.filter(t => t.date <= end.date &&
    (t.date > start.date || (t.date === start.date && !startIds.has(t.id))) &&
    (start.date !== end.date || endIds.has(t.id)));
  for (const t of transactions) {
    const amount = convertToBase(t.amount, accounts.get(t.accountId)?.currency ?? 'CNY', settings);
    if (t.type === 'income') income += amount;
    else { expense += amount; categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + amount); }
  }
  const change = end.netWorth - start.netWorth;
  return { change, income, expense, savings: income - expense, unexplained: change - income + expense,
    transactionCount: transactions.length,
    categories: [...categoryMap].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
  };
}
