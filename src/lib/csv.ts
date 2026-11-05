import Papa from 'papaparse';
import type { Account, AppData, CurrencyCode } from '@/types';
import { generateId, getToday, normalizeDebtBalance, validateAppData } from '@/lib/storage';

const TYPE_MAP: Record<string, Account['type']> = {
  cash: 'cash',
  现金: 'cash',
  储蓄: 'cash',
  investment: 'investment',
  投资: 'investment',
  debt: 'debt',
  负债: 'debt',
  信用卡: 'debt',
  fixed: 'fixed',
  固定资产: 'fixed',
  其他: 'cash',
};

const CURRENCY_SET = new Set<CurrencyCode>(['CNY', 'USD', 'HKD', 'EUR', 'JPY']);

export function exportAccountsCsv(accounts: Account[]): string {
  const rows = accounts.map(a => ({
    名称: a.name,
    类型: a.type,
    余额: a.balance ?? '',
    币种: a.currency ?? 'CNY',
    颜色: a.color ?? '',
    备注: a.note ?? '',
  }));
  return Papa.unparse(rows);
}

export function exportTransactionsCsv(data: AppData): string {
  const accountMap = new Map(data.accounts.map(a => [a.id, a.name]));
  const rows = data.transactions.map(t => ({
    日期: t.date,
    类型: t.type === 'income' ? '收入' : '支出',
    分类: t.category,
    金额: t.amount,
    账户: accountMap.get(t.accountId) ?? t.accountId,
    备注: t.description,
  }));
  return Papa.unparse(rows);
}

export function importAccountsCsv(
  csv: string,
  existing: Account[],
  mode: 'merge' | 'overwrite',
): { success: boolean; accounts: Account[]; errors: string[] } {
  const errors: string[] = [];
  let parsed: Record<string, string>[];

  try {
    const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    if (result.errors.length > 0) {
      errors.push(result.errors[0]?.message ?? 'CSV 解析失败');
      return { success: false, accounts: existing, errors };
    }
    parsed = result.data;
  } catch {
    return { success: false, accounts: existing, errors: ['CSV 格式无效'] };
  }

  const imported: Account[] = [];
  parsed.forEach((row, i) => {
    const name = String(row['名称'] ?? row.name ?? row.Name ?? '').trim();
    if (!name) {
      errors.push(`第 ${i + 2} 行：缺少账户名称`);
      return;
    }

    const typeRaw = String(row['类型'] ?? row.type ?? row.Type ?? 'cash').trim().toLowerCase();
    const type = TYPE_MAP[typeRaw] ?? 'cash';

    const balanceRaw = String(row['余额'] ?? row.balance ?? row.Balance ?? '').trim();
    let balance: number | null = null;
    if (balanceRaw !== '') {
      const num = parseFloat(balanceRaw.replace(/[,¥￥$]/g, ''));
      if (Number.isNaN(num)) errors.push(`第 ${i + 2} 行：余额无效`);
      else balance = normalizeDebtBalance(type, num);
    }

    const currencyRaw = String(row['币种'] ?? row.currency ?? 'CNY').trim().toUpperCase() as CurrencyCode;
    const currency = CURRENCY_SET.has(currencyRaw) ? currencyRaw : 'CNY';

    imported.push({
      id: generateId(),
      name,
      type,
      balance,
      currency,
      color: String(row['颜色'] ?? row.color ?? '#6366F1').trim() || '#6366F1',
      note: String(row['备注'] ?? row.note ?? '').trim(),
      sortOrder: imported.length,
      createdAt: getToday(),
      updatedAt: getToday(),
    });
  });

  if (errors.length > 0 && imported.length === 0) {
    return { success: false, accounts: existing, errors };
  }

  if (mode === 'overwrite') {
    return { success: true, accounts: imported, errors };
  }

  const existingNames = new Set(existing.map(a => a.name));
  const merged = [...existing];
  imported.forEach(acc => {
    if (existingNames.has(acc.name)) return;
    merged.push({ ...acc, sortOrder: merged.length });
    existingNames.add(acc.name);
  });

  return { success: true, accounts: merged, errors };
}

export function importDataJsonMerge(json: string, current: AppData): { success: boolean; errors: string[]; data?: AppData } {
  try {
    const parsed = JSON.parse(json);
    const result = validateAppData(parsed);
    if (!result.success || !result.data) {
      return { success: false, errors: result.errors };
    }

    const incoming = result.data;
    const currentCheckpoints = current.assetCheckpoints ?? [];
    const incomingCheckpoints = incoming.assetCheckpoints ?? [];
    const shared = Math.min(currentCheckpoints.length, incomingCheckpoints.length);
    for (let i = 0; i < shared; i++) {
      if (JSON.stringify(currentCheckpoints[i]) !== JSON.stringify(incomingCheckpoints[i])) {
        return { success: false, errors: ['两份备份的盘点历史存在分歧，无法自动合并；请分别保存备份，再选择覆盖恢复所需版本'] };
      }
    }
    const appendUnique = <T extends { id: string }>(existing: T[], imported: T[]): T[] => {
      const merged = new Map(existing.map(item => [item.id, item]));
      for (const item of imported) {
        const old = merged.get(item.id);
        if (old && JSON.stringify(old) !== JSON.stringify(item)) throw new Error('存在同一 ID 的不同记录，请选择覆盖恢复或先核对备份');
        merged.set(item.id, item);
      }
      return [...merged.values()];
    };
    // Account IDs identify ledger links; names alone are not a safe merge key.
    const merged: AppData = {
      ...current,
      accounts: appendUnique(current.accounts, incoming.accounts),
      transactions: appendUnique(current.transactions, incoming.transactions),
      budgets: appendUnique(current.budgets, incoming.budgets),
      goals: appendUnique(current.goals, incoming.goals),
      calendarEvents: appendUnique(current.calendarEvents, incoming.calendarEvents),
      forecastEvents: appendUnique(current.forecastEvents ?? [], incoming.forecastEvents ?? []),
      accountBalanceHistory: appendUnique(current.accountBalanceHistory ?? [], incoming.accountBalanceHistory ?? []),
      assetCheckpoints: incomingCheckpoints.length > currentCheckpoints.length ? incomingCheckpoints : currentCheckpoints,
      legacyAssetSnapshots: [...new Map([...(current.legacyAssetSnapshots ?? []), ...(incoming.legacyAssetSnapshots ?? [])].map(s => [JSON.stringify(s), s])).values()],
    };
    return { success: true, errors: [], data: merged };
  } catch (e) {
    return { success: false, errors: [e instanceof Error ? e.message : 'JSON 解析失败'] };
  }
}
