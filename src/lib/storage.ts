import type { AppData, Account, Transaction, Budget, Goal, CalendarEvent, AssetSnapshot, MonthlyBudget, VaultSettings, CurrencyCode } from '@/types';
import { normalizeBudget } from '@/lib/budget-utils';

const STORAGE_KEY = 'vaultflow_data';

// Generate a random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Format currency; null/undefined shows placeholder
export function formatBalance(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '--';
  return formatCurrency(amount);
}

export function formatCurrency(amount: number, currency: CurrencyCode = 'CNY'): string {
  const locale = currency === 'CNY' ? 'zh-CN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBalanceInBase(
  amount: number | null | undefined,
  accountCurrency: CurrencyCode | undefined,
  settings: VaultSettings,
): string {
  if (amount === null || amount === undefined) return '--';
  const base = convertToBase(amount, accountCurrency ?? 'CNY', settings);
  return formatCurrency(base, settings.baseCurrency);
}

export function convertToBase(amount: number, currency: CurrencyCode, settings: VaultSettings): number {
  if (currency === settings.baseCurrency) return amount;
  const fromRate = settings.exchangeRates[currency] ?? 1;
  const toRate = settings.exchangeRates[settings.baseCurrency] ?? 1;
  return (amount * fromRate) / toRate;
}

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'CNY', label: '人民币', symbol: '¥' },
  { code: 'USD', label: '美元', symbol: '$' },
  { code: 'HKD', label: '港币', symbol: 'HK$' },
  { code: 'EUR', label: '欧元', symbol: '€' },
  { code: 'JPY', label: '日元', symbol: '¥' },
];

export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function normalizeAccount(account: Account, index: number): Account {
  return {
    ...account,
    currency: account.currency ?? 'CNY',
    sortOrder: account.sortOrder ?? index,
    balance: normalizeDebtBalance(account.type, account.balance),
  };
}

// Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-CN').format(num);
}

// Get current date string
export function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Get current month string (YYYY-MM)
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Empty initial data (first launch)
export function createEmptyAppData(): AppData {
  return {
    accounts: [],
    transactions: [],
    budgets: [
      { id: generateId(), category: '餐饮美食', monthlyLimit: 1500, icon: 'Utensils', color: '#EF4444', spent: 0 },
      { id: generateId(), category: '交通出行', monthlyLimit: 500, icon: 'Bus', color: '#F59E0B', spent: 0 },
      { id: generateId(), category: '购物消费', monthlyLimit: 1000, icon: 'ShoppingBag', color: '#6366F1', spent: 0 },
      { id: generateId(), category: '房租水电', monthlyLimit: 2500, icon: 'Home', color: '#8B5CF6', spent: 0 },
      { id: generateId(), category: '娱乐休闲', monthlyLimit: 800, icon: 'Gamepad2', color: '#EC4899', spent: 0 },
      { id: generateId(), category: '医疗健康', monthlyLimit: 500, icon: 'Heart', color: '#10B981', spent: 0 },
    ],
    goals: [],
    calendarEvents: [],
    assetSnapshots: [],
    monthlyData: [],
    forecastEvents: [],
  };
}

export function isEmptyState(data: AppData): boolean {
  return data.accounts.length === 0;
}

// Demo data (optional, via settings)
function createDemoData(): AppData {
  const now = new Date();
  const currentMonth = getCurrentMonth();

  const accounts: Account[] = [
    { id: generateId(), name: '工商银行', type: 'cash', balance: 45000, icon: 'Landmark', color: '#EF4444', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '招商银行', type: 'cash', balance: 32000, icon: 'Landmark', color: '#F59E0B', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '微信零钱', type: 'cash', balance: 8500, icon: 'Wallet', color: '#10B981', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '支付宝余额', type: 'cash', balance: 12300, icon: 'CreditCard', color: '#6366F1', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '股票账户', type: 'investment', balance: 98163, icon: 'TrendingUp', color: '#EF4444', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '基金定投', type: 'investment', balance: 147414, icon: 'BarChart3', color: '#6366F1', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '债券投资', type: 'investment', balance: 103325, icon: 'Shield', color: '#10B981', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '公积金', type: 'fixed', balance: 336515, icon: 'Building2', color: '#F59E0B', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '花呗', type: 'debt', balance: -5946, icon: 'AlertCircle', color: '#EF4444', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '借呗', type: 'debt', balance: -1166, icon: 'AlertTriangle', color: '#F59E0B', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '车贷', type: 'debt', balance: -48866, icon: 'Car', color: '#6366F1', createdAt: getToday(), updatedAt: getToday() },
    { id: generateId(), name: '房贷', type: 'debt', balance: -28651, icon: 'Home', color: '#EF4444', createdAt: getToday(), updatedAt: getToday() },
  ];

  // Generate transactions for the last 6 months
  const transactions: Transaction[] = [];
  const categories = {
    income: ['工资收入', '奖金', '理财收益', '兼职收入', '其他收入'],
    expense: ['餐饮美食', '交通出行', '购物消费', '房租水电', '娱乐休闲', '医疗健康', '学习教育', '通讯网络', '人情往来', '其他支出'],
  };

  for (let m = 5; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    // Income transactions
    transactions.push({
      id: generateId(),
      date: `${monthStr}-05`,
      amount: 18000 + Math.random() * 2000,
      type: 'income',
      category: '工资收入',
      accountId: accounts[0].id,
      description: '月度工资',
      createdAt: `${monthStr}-05`,
      source: 'manual',
    });

    if (Math.random() > 0.5) {
      transactions.push({
        id: generateId(),
        date: `${monthStr}-${15 + Math.floor(Math.random() * 10)}`,
        amount: 500 + Math.random() * 1500,
        type: 'income',
        category: '理财收益',
        accountId: accounts[4].id,
        description: '基金/股票收益',
        createdAt: `${monthStr}-15`,
        source: 'manual',
      });
    }

    // Expense transactions - about 20-30 per month
    const expenseCount = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < expenseCount; i++) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const category = categories.expense[Math.floor(Math.random() * categories.expense.length)];
      let amount = 20 + Math.random() * 300;
      if (category === '房租水电') amount = 2000 + Math.random() * 500;
      if (category === '购物消费') amount = 100 + Math.random() * 800;

      transactions.push({
        id: generateId(),
        date: `${monthStr}-${String(day).padStart(2, '0')}`,
        amount,
        type: 'expense',
        category,
        accountId: accounts[Math.floor(Math.random() * 4)].id,
        description: `${category}支出`,
        createdAt: `${monthStr}-${String(day).padStart(2, '0')}`,
        source: 'manual',
      });
    }
  }

  const budgets: Budget[] = [
    { id: generateId(), category: '餐饮美食', monthlyLimit: 1500, icon: 'Utensils', color: '#EF4444', spent: 0 },
    { id: generateId(), category: '交通出行', monthlyLimit: 500, icon: 'Bus', color: '#F59E0B', spent: 0 },
    { id: generateId(), category: '购物消费', monthlyLimit: 1000, icon: 'ShoppingBag', color: '#6366F1', spent: 0 },
    { id: generateId(), category: '房租水电', monthlyLimit: 2500, icon: 'Home', color: '#8B5CF6', spent: 0 },
    { id: generateId(), category: '娱乐休闲', monthlyLimit: 800, icon: 'Gamepad2', color: '#EC4899', spent: 0 },
    { id: generateId(), category: '医疗健康', monthlyLimit: 500, icon: 'Heart', color: '#10B981', spent: 0 },
    { id: generateId(), category: '学习教育', monthlyLimit: 300, icon: 'BookOpen', color: '#06B6D4', spent: 0 },
    { id: generateId(), category: '通讯网络', monthlyLimit: 200, icon: 'Wifi', color: '#14B8A6', spent: 0 },
  ];

  const goals: Goal[] = [
    { id: generateId(), name: '应急基金 3万元', targetAmount: 30000, currentAmount: 18000, priority: 1, color: '#10B981', icon: 'Shield', completed: false, createdAt: getToday() },
    { id: generateId(), name: '旅游基金 1万元', targetAmount: 10000, currentAmount: 0, priority: 2, color: '#6366F1', icon: 'Plane', completed: false, createdAt: getToday() },
    { id: generateId(), name: '电脑换新 8千元', targetAmount: 8000, currentAmount: 0, priority: 3, color: '#F59E0B', icon: 'Monitor', completed: false, createdAt: getToday() },
    { id: generateId(), name: '年度保险 5千元', targetAmount: 5000, currentAmount: 2000, priority: 4, color: '#EF4444', icon: 'Umbrella', completed: false, createdAt: getToday() },
  ];

  const calendarEvents: CalendarEvent[] = [
    { id: generateId(), title: '工资发放', date: `${currentMonth}-05`, type: 'salary', amount: 18500, recurring: true, color: '#10B981' },
    { id: generateId(), title: '花呗还款', date: `${currentMonth}-09`, type: 'repayment', amount: 5946, accountId: accounts[8].id, recurring: true, color: '#EF4444' },
    { id: generateId(), title: '房租缴纳', date: `${currentMonth}-01`, type: 'expense', amount: 2500, recurring: true, color: '#8B5CF6' },
    { id: generateId(), title: '借呗还款', date: `${currentMonth}-15`, type: 'repayment', amount: 1166, accountId: accounts[9].id, recurring: true, color: '#F59E0B' },
    { id: generateId(), title: '车贷还款', date: `${currentMonth}-20`, type: 'repayment', amount: 2800, accountId: accounts[10].id, recurring: true, color: '#6366F1' },
    { id: generateId(), title: '房贷还款', date: `${currentMonth}-25`, type: 'repayment', amount: 2100, accountId: accounts[11].id, recurring: true, color: '#EF4444' },
  ];

  // Generate asset snapshots for the last 12 months + 3 months future
  const assetSnapshots: AssetSnapshot[] = [];
  const baseAsset = 600000;
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const growth = (12 - m) * 25000 + Math.random() * 10000;
    assetSnapshots.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      totalAssets: baseAsset + growth + 80000,
      netWorth: baseAsset + growth,
      totalDebt: 85000 - m * 500,
      liquidAssets: 80000 + m * 2000,
      investmentAssets: baseAsset + growth - 80000 - (85000 - m * 500),
    });
  }

  // Future predictions
  for (let m = 1; m <= 3; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const lastReal = assetSnapshots[assetSnapshots.length - 1];
    assetSnapshots.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      totalAssets: lastReal.totalAssets + m * 25000,
      netWorth: lastReal.netWorth + m * 28000,
      totalDebt: lastReal.totalDebt - m * 500,
      liquidAssets: lastReal.liquidAssets + m * 3000,
      investmentAssets: lastReal.investmentAssets + m * 20000,
    });
  }

  const monthlyData: MonthlyBudget[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const income = 18000 + Math.random() * 3000;
    const expense = 8000 + Math.random() * 4000;
    monthlyData.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      savings: Math.round((income - expense) * 100) / 100,
    });
  }

  return {
    accounts,
    transactions,
    budgets,
    goals,
    calendarEvents,
    assetSnapshots,
    monthlyData,
  };
}

// Load data from localStorage
export function loadData(): AppData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return fullSyncData(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  const empty = fullSyncData(createEmptyAppData());
  saveData(empty);
  return empty;
}

// Load demo sample data (optional, via settings)
export function loadDemoData(): AppData {
  const demo = fullSyncData(createDemoData());
  saveData(demo);
  return demo;
}

// Save data to localStorage
export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

// Export data as JSON
export function exportData(): string {
  return localStorage.getItem(STORAGE_KEY) || '{}';
}

// Import data from JSON with validation
export interface ImportResult {
  success: boolean;
  errors: string[];
}

export function validateAppData(raw: unknown): ImportResult & { data?: AppData } {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { success: false, errors: ['数据格式无效：需要 JSON 对象'] };
  }

  const d = raw as Partial<AppData>;

  if (!Array.isArray(d.accounts)) errors.push('缺少 accounts 数组');
  if (!Array.isArray(d.transactions)) errors.push('缺少 transactions 数组');
  if (!Array.isArray(d.budgets)) errors.push('缺少 budgets 数组');
  if (!Array.isArray(d.goals)) errors.push('缺少 goals 数组');
  if (!Array.isArray(d.calendarEvents)) errors.push('缺少 calendarEvents 数组');

  if (errors.length > 0) return { success: false, errors };

  const accountIds = new Set<string>();
  d.accounts!.forEach((a, i) => {
    if (!a.id || typeof a.id !== 'string') errors.push(`accounts[${i}] 缺少有效 id`);
    if (!a.name || typeof a.name !== 'string') errors.push(`accounts[${i}] 缺少名称`);
    if (!['cash', 'investment', 'debt', 'fixed'].includes(a.type)) errors.push(`accounts[${i}] 类型无效`);
    if (a.balance !== null && (typeof a.balance !== 'number' || Number.isNaN(a.balance))) {
      errors.push(`accounts[${i}] 余额无效`);
    }
    accountIds.add(a.id);
  });

  d.transactions!.forEach((t, i) => {
    if (!t.id) errors.push(`transactions[${i}] 缺少 id`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date || '')) errors.push(`transactions[${i}] 日期格式应为 YYYY-MM-DD`);
    if (typeof t.amount !== 'number' || t.amount <= 0) errors.push(`transactions[${i}] 金额无效`);
    if (!['income', 'expense'].includes(t.type)) errors.push(`transactions[${i}] 类型无效`);
    if (t.accountId && !accountIds.has(t.accountId)) errors.push(`transactions[${i}] 关联账户不存在`);
  });

  if (errors.length > 0) return { success: false, errors };

  if (d.assetCheckpoints !== undefined) {
    if (!Array.isArray(d.assetCheckpoints)) return { success: false, errors: ['assetCheckpoints 必须是数组'] };
    const ids = new Set<string>();
    let lastDate = '';
    for (const c of d.assetCheckpoints) {
      const valid = c && typeof c === 'object' && typeof c.id === 'string' && !ids.has(c.id)
        && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && c.date >= lastDate
        && typeof c.createdAt === 'string' && Number.isFinite(Date.parse(c.createdAt))
        && typeof c.note === 'string' && CURRENCY_OPTIONS.some(o => o.code === c.baseCurrency)
        && c.exchangeRates && Object.values(c.exchangeRates).every(r => typeof r === 'number' && Number.isFinite(r) && r > 0)
        && Array.isArray(c.accounts) && c.accounts.every(a => a && typeof a.id === 'string' && typeof a.name === 'string'
          && ['cash', 'investment', 'debt', 'fixed'].includes(a.type) && typeof a.balance === 'number' && Number.isFinite(a.balance))
        && Array.isArray(c.transactionIds) && c.transactionIds.every(id => typeof id === 'string')
        && [c.totalAssets, c.totalDebt, c.netWorth, c.liquidAssets, c.investmentAssets, c.intervalIncome, c.intervalExpense].every(n => typeof n === 'number' && Number.isFinite(n))
        && (c.unexplainedChange === null || (typeof c.unexplainedChange === 'number' && Number.isFinite(c.unexplainedChange)));
      if (!valid) return { success: false, errors: ['资产盘点节点无效，请检查日期、金额及账户明细'] };
      ids.add(c.id); lastDate = c.date;
    }
  }

  if (d.accountBalanceHistory !== undefined && (!Array.isArray(d.accountBalanceHistory) || d.accountBalanceHistory.some(p => !p || typeof p.id !== 'string' || typeof p.accountId !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !Number.isFinite(Date.parse(p.recordedAt)) || typeof p.balance !== 'number' || !Number.isFinite(p.balance) || !CURRENCY_OPTIONS.some(o => o.code === p.currency) || !['cash', 'debt', 'fixed', 'investment'].includes(p.accountType) || !['account-edit', 'baseline', 'inventory'].includes(p.source) || typeof p.note !== 'string'))) {
    return { success: false, errors: ['账户余额历史格式无效'] };
  }

  const normalized: AppData = {
    accounts: d.accounts!.map((a, i) => normalizeAccount({
      ...a,
      balance: normalizeDebtBalance(a.type, a.balance),
      createdAt: a.createdAt || getToday(),
      updatedAt: a.updatedAt || getToday(),
    }, i)),
    transactions: d.transactions!,
    budgets: d.budgets!.map(b => normalizeBudget({ ...b, spent: b.spent ?? 0 })),
    goals: d.goals!.map(g => ({
      ...g,
      allocationMode: g.allocationMode ?? 'priority',
    })),
    calendarEvents: d.calendarEvents!,
    assetSnapshots: Array.isArray(d.assetSnapshots) ? d.assetSnapshots : [],
    accountBalanceHistory: d.accountBalanceHistory ?? [],
    assetCheckpoints: Array.isArray(d.assetCheckpoints) ? d.assetCheckpoints : undefined,
    legacyAssetSnapshots: Array.isArray(d.legacyAssetSnapshots) ? d.legacyAssetSnapshots : undefined,
    monthlyData: Array.isArray(d.monthlyData) ? d.monthlyData : [],
    forecastEvents: Array.isArray(d.forecastEvents) ? d.forecastEvents : [],
  };

  return { success: true, errors: [], data: fullSyncData(normalized) };
}

export function importData(json: string): ImportResult {
  try {
    const parsed = JSON.parse(json);
    const result = validateAppData(parsed);
    if (result.success && result.data) {
      saveData(result.data);
    }
    return { success: result.success, errors: result.errors };
  } catch {
    return { success: false, errors: ['JSON 解析失败，请检查格式'] };
  }
}

// Account deletion guard
export function getAccountDeleteBlockers(data: AppData, accountId: string): string[] {
  const blockers: string[] = [];
  const txCount = data.transactions.filter(t => t.accountId === accountId).length;
  if (txCount > 0) blockers.push(`有 ${txCount} 笔关联交易`);
  const eventCount = data.calendarEvents.filter(e => e.accountId === accountId).length;
  if (eventCount > 0) blockers.push(`有 ${eventCount} 个日历事件`);
  return blockers;
}

// Budget category presets
export const BUDGET_CATEGORY_PRESETS = [
  { category: '餐饮美食', icon: 'Utensils', color: '#EF4444' },
  { category: '交通出行', icon: 'Bus', color: '#F59E0B' },
  { category: '购物消费', icon: 'ShoppingBag', color: '#6366F1' },
  { category: '房租水电', icon: 'Home', color: '#8B5CF6' },
  { category: '娱乐休闲', icon: 'Gamepad2', color: '#EC4899' },
  { category: '医疗健康', icon: 'Heart', color: '#10B981' },
  { category: '学习教育', icon: 'BookOpen', color: '#06B6D4' },
  { category: '通讯网络', icon: 'Wifi', color: '#14B8A6' },
  { category: '人情往来', icon: 'Users', color: '#F97316' },
  { category: '其他支出', icon: 'MoreHorizontal', color: '#64748B' },
] as const;

// Parse a CSV row into a transaction
export function parseCsvTransactionRow(
  row: Record<string, unknown>,
  accounts: Account[],
): { ok: true; transaction: Omit<Transaction, 'id' | 'createdAt'> } | { ok: false; error: string } {
  const amountRaw = row.amount ?? row['金额'] ?? row.Amount ?? row['收/支金额'] ?? '0';
  const amount = Math.abs(parseFloat(String(amountRaw).replace(/[,¥￥]/g, '')));

  const dateRaw = row.date ?? row['日期'] ?? row.Date ?? row.time ?? row['时间'] ?? row['交易时间'] ?? '';
  let dateStr = String(dateRaw).trim().slice(0, 10);
  if (/^\d{4}\/\d{2}\/\d{2}/.test(dateStr)) dateStr = dateStr.replace(/\//g, '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateStr = getToday();

  const typeRaw = String(row.type ?? row['类型'] ?? row.Type ?? row['收/支'] ?? '').toLowerCase();
  const type: 'income' | 'expense' =
    typeRaw.includes('收入') || typeRaw.includes('income') || typeRaw === '收'
      ? 'income'
      : 'expense';

  const category = String(
    row.category ?? row['分类'] ?? row.Category ?? row['交易分类'] ?? row.description ?? row['商品'] ?? '其他支出'
  ).trim() || '其他支出';

  const description = String(
    row.description ?? row['备注'] ?? row.Description ?? row['商品说明'] ?? row['商品'] ?? category
  ).trim();

  const accountId = accounts.find(a => a.type === 'cash')?.id ?? accounts[0]?.id ?? '';

  if (!amount || Number.isNaN(amount)) {
    return { ok: false, error: '金额无效' };
  }
  if (!accountId) {
    return { ok: false, error: '无可用账户' };
  }

  return {
    ok: true,
    transaction: {
      date: dateStr,
      amount,
      type,
      category,
      accountId,
      description,
      source: 'csv',
    },
  };
}

// Expand recurring events for a given month (virtual instances for display)
export function getCalendarEventsForMonth(events: CalendarEvent[], monthStr: string): CalendarEvent[] {
  const direct = events.filter(e => e.date.startsWith(monthStr));
  const dayKeys = new Set(direct.map(e => `${e.title}|${e.type}|${e.date.slice(8)}`));
  const expanded: CalendarEvent[] = [...direct];

  const year = parseInt(monthStr.slice(0, 4), 10);
  const month = parseInt(monthStr.slice(5, 7), 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  events.filter(e => e.recurring).forEach(template => {
    if (monthStr < template.date.slice(0, 7)) return;
    const dayNum = parseInt(template.date.slice(8), 10);
    const actualDay = Math.min(dayNum, daysInMonth);
    const dayKey = String(actualDay).padStart(2, '0');
    const dedupeKey = `${template.title}|${template.type}|${dayKey}`;

    if (dayKeys.has(dedupeKey)) return;

    expanded.push({
      ...template,
      id: `virtual-${template.id}-${monthStr}`,
      date: `${monthStr}-${dayKey}`,
      recurring: false,
    });
    dayKeys.add(dedupeKey);
  });

  return expanded.sort((a, b) => a.date.localeCompare(b.date));
}

// Materialize recurring events for upcoming months into storage
export function materializeRecurringEvents(data: AppData): AppData {
  const templates = data.calendarEvents.filter(e => e.recurring);
  if (templates.length === 0) return data;

  const now = new Date();
  const newEvents = [...data.calendarEvents];
  const existingKeys = new Set(newEvents.map(e => `${e.title}|${e.type}|${e.date}`));

  for (let offset = -1; offset <= 12; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    templates.forEach(template => {
      const dayNum = parseInt(template.date.slice(8), 10);
      const actualDay = Math.min(dayNum, daysInMonth);
      const dateStr = `${monthStr}-${String(actualDay).padStart(2, '0')}`;
      if (dateStr < template.date) return;
      const key = `${template.title}|${template.type}|${dateStr}`;

      if (existingKeys.has(key)) return;

      newEvents.push({
        ...template,
        id: generateId(),
        date: dateStr,
        recurring: false,
      });
      existingKeys.add(key);
    });
  }

  return { ...data, calendarEvents: newEvents };
}

// Reset data to empty
export function resetData(): AppData {
  const empty = fullSyncData(createEmptyAppData());
  saveData(empty);
  return empty;
}

// Calculate derived values (amounts converted to base currency)
export function calculateTotals(data: AppData, settings?: VaultSettings) {
  const base = settings?.baseCurrency ?? 'CNY';
  const rates = settings?.exchangeRates;

  const toBase = (amount: number | null, currency: CurrencyCode = 'CNY') => {
    if (amount === null) return 0;
    if (!settings || !rates) return amount;
    return convertToBase(amount, currency, settings);
  };

  const totalAssets = sortAccounts(data.accounts)
    .filter(a => a.type !== 'debt')
    .reduce((sum, a) => sum + toBase(a.balance, a.currency ?? 'CNY'), 0);

  const totalDebt = sortAccounts(data.accounts)
    .filter(a => a.type === 'debt')
    .reduce((sum, a) => sum + Math.abs(toBase(a.balance, a.currency ?? 'CNY')), 0);

  const netWorth = totalAssets - totalDebt;

  const liquidAssets = data.accounts
    .filter(a => a.type === 'cash')
    .reduce((sum, a) => sum + toBase(a.balance, a.currency ?? 'CNY'), 0);

  const investmentAssets = data.accounts
    .filter(a => a.type === 'investment')
    .reduce((sum, a) => sum + toBase(a.balance, a.currency ?? 'CNY'), 0);

  const fixedAssets = data.accounts
    .filter(a => a.type === 'fixed')
    .reduce((sum, a) => sum + toBase(a.balance, a.currency ?? 'CNY'), 0);

  const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0;
  const liquidRatio = totalDebt > 0 ? liquidAssets / totalDebt : 0;

  const monthlyExpense = settings?.monthlyExpense ?? 0;
  const monthlyIncome = settings?.monthlyIncome ?? 0;
  const emergencyMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 0;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
  const investmentRatio = netWorth > 0 ? (investmentAssets / netWorth) * 100 : 0;

  return {
    totalAssets,
    totalDebt,
    netWorth,
    liquidAssets,
    investmentAssets,
    fixedAssets,
    debtRatio,
    liquidRatio,
    emergencyMonths,
    savingsRate,
    investmentRatio,
    baseCurrency: base,
  };
}

// Get transactions for current month
export function getCurrentMonthTransactions(data: AppData): Transaction[] {
  const currentMonth = getCurrentMonth();
  return data.transactions.filter(t => t.date.startsWith(currentMonth));
}

// Get category totals for current month
export function getCategoryTotals(data: AppData, settings?: VaultSettings): { category: string; amount: number; color: string }[] {
  const currentTransactions = getCurrentMonthTransactions(data);
  const categoryMap: Record<string, { amount: number; color: string }> = {};

  const expenseColors: Record<string, string> = {
    '餐饮美食': '#EF4444',
    '交通出行': '#F59E0B',
    '购物消费': '#6366F1',
    '房租水电': '#8B5CF6',
    '娱乐休闲': '#EC4899',
    '医疗健康': '#10B981',
    '学习教育': '#06B6D4',
    '通讯网络': '#14B8A6',
    '人情往来': '#F97316',
    '其他支出': '#64748B',
  };

  currentTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = { amount: 0, color: expenseColors[t.category] || '#94A3B8' };
      }
      categoryMap[t.category].amount += settings ? convertToBase(t.amount, data.accounts.find(a => a.id === t.accountId)?.currency ?? 'CNY', settings) : t.amount;
    });

  return Object.entries(categoryMap)
    .map(([category, { amount, color }]) => ({ category, amount, color }))
    .sort((a, b) => b.amount - a.amount);
}

// Update budget spent amounts
export function updateBudgetSpent(data: AppData, settings?: VaultSettings): Budget[] {
  const categoryTotals = getCategoryTotals(data, settings);
  return data.budgets.map(b => {
    const spent = categoryTotals.find(c => c.category === b.category)?.amount || 0;
    return { ...b, spent };
  });
}

// Compute monthly income/expense from transactions
export function computeMonthlyData(transactions: Transaction[]): MonthlyBudget[] {
  const monthMap: Record<string, { income: number; expense: number }> = {};

  transactions.forEach(t => {
    const month = t.date.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { income: 0, expense: 0 };
    if (t.type === 'income') monthMap[month].income += t.amount;
    else monthMap[month].expense += t.amount;
  });

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { income, expense }]) => ({
      month,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      savings: Math.round((income - expense) * 100) / 100,
    }));
}

// Sync current month asset snapshot and monthly aggregates
function monthEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

/** 以基准日资产为锚点，按流水日期反推各月净资产（历史流水不影响当前账户余额） */
export function rebuildAssetSnapshotsFromTransactions(
  transactions: Transaction[],
  anchorDate: string,
  anchorTotals: ReturnType<typeof calculateTotals>,
): AssetSnapshot[] {
  if (transactions.length === 0) return [];

  const months = new Set<string>();
  transactions.forEach(t => months.add(t.date.slice(0, 7)));
  months.add(anchorDate.slice(0, 7));
  const sortedMonths = [...months].sort();

  const anchorNetWorth = anchorTotals.netWorth;

  return sortedMonths.map(month => {
    const monthEnd = monthEndDate(month);
    const flowAfterMonth = transactions
      .filter(t => t.date > monthEnd && t.date <= anchorDate)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

    const netWorth = anchorNetWorth - flowAfterMonth;
    const scale = anchorTotals.netWorth !== 0 ? netWorth / anchorTotals.netWorth : 1;

    return {
      date: month,
      netWorth: Math.round(netWorth),
      totalAssets: Math.round(anchorTotals.totalAssets * scale),
      totalDebt: Math.round(anchorTotals.totalDebt * scale),
      liquidAssets: Math.round(anchorTotals.liquidAssets * scale),
      investmentAssets: Math.round(anchorTotals.investmentAssets * scale),
    };
  });
}

/** 导入前检查：反推趋势是否出现负净资产 */
export function getTrendReconstructionWarning(
  transactions: Pick<Transaction, 'date' | 'amount' | 'type'>[],
  anchorDate: string,
  anchorTotals: ReturnType<typeof calculateTotals>,
): string | null {
  if (transactions.length === 0) return null;
  const snapshots = rebuildAssetSnapshotsFromTransactions(
    transactions as Transaction[],
    anchorDate,
    anchorTotals,
  );
  const negative = snapshots.filter(s => s.netWorth < 0);
  if (negative.length === 0) return null;
  return `趋势反推有 ${negative.length} 个月净资产为负（如 ${negative[0].date}），请核对「设置 → 资产基准日」或流水收支方向是否正确`;
}

export function syncDerivedData(data: AppData, settings?: VaultSettings): AppData {
  // Old reconstructed figures are retained separately; only explicit inventories are historical facts.
  const checkpoints = data.assetCheckpoints ?? [];
  return {
    ...data,
    assetCheckpoints: checkpoints,
    legacyAssetSnapshots: data.legacyAssetSnapshots ?? (data.assetCheckpoints === undefined ? data.assetSnapshots : []),
    assetSnapshots: checkpoints.map(c => ({
      date: c.date, totalAssets: c.totalAssets, netWorth: c.netWorth,
      totalDebt: c.totalDebt, liquidAssets: c.liquidAssets, investmentAssets: c.investmentAssets,
    })),
    monthlyData: computeMonthlyData(data.transactions.map(t => ({
      ...t, amount: settings ? convertToBase(t.amount, data.accounts.find(a => a.id === t.accountId)?.currency ?? 'CNY', settings) : t.amount,
    }))),
  };
}

// Full sync: derived data + recurring event materialization + account normalization
export function fullSyncData(data: AppData, settings?: VaultSettings): AppData {
  const normalized = {
    ...data,
    accounts: sortAccounts(data.accounts).map((a, i) => normalizeAccount(a, i)),
  };
  return materializeRecurringEvents(syncDerivedData(normalized, settings));
}

// Month-over-month net worth change (%)
export function getNetWorthChange(data: AppData): number | null {
  const checkpoints = data.assetCheckpoints ?? [];
  const current = checkpoints.at(-1);
  const prev = checkpoints.at(-2);
  if (!current || !prev || prev.netWorth === 0 || current.baseCurrency !== prev.baseCurrency) return null;
  return ((current.netWorth - prev.netWorth) / Math.abs(prev.netWorth)) * 100;
}

// Normalize debt account balance to negative
export function normalizeDebtBalance(type: Account['type'], balance: number | null): number | null {
  if (balance === null) return null;
  if (type === 'debt' && balance > 0) return -balance;
  return balance;
}

// Apply transaction to account balance
export function applyTransactionToAccount(account: Account, tx: Pick<Transaction, 'type' | 'amount'>): Account {
  const base = account.balance ?? 0;
  return {
    ...account,
    balance: tx.type === 'income' ? base + tx.amount : base - tx.amount,
    updatedAt: getToday(),
  };
}

// Reverse transaction effect on account balance
export function reverseTransactionOnAccount(account: Account, tx: Pick<Transaction, 'type' | 'amount'>): Account {
  const base = account.balance ?? 0;
  return {
    ...account,
    balance: tx.type === 'income' ? base - tx.amount : base + tx.amount,
    updatedAt: getToday(),
  };
}
