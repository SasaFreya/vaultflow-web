export type CurrencyCode = 'CNY' | 'USD' | 'HKD' | 'EUR' | 'JPY';
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly';
export type ForecastFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type GoalAllocationMode = 'priority' | 'ratio' | 'dedicated';
export type ChartAxisUnit = '1k' | '10k' | '100k' | '1m';
export type CsvImportFormat = 'wechat' | 'alipay' | 'cmb' | 'icbc' | 'generic' | 'unknown';
export type OCRProvider = 'baidu' | 'tencent' | 'aliyun' | null;

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'investment' | 'debt' | 'fixed';
  balance: number | null;
  currency?: CurrencyCode;
  icon?: string;
  color?: string;
  note?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OCRSettings {
  provider: OCRProvider;
  baiduApiKey?: string;
  baiduSecretKey?: string;
  tencentSecretId?: string;
  tencentSecretKey?: string;
  aliyunAccessKeyId?: string;
  aliyunAccessKeySecret?: string;
}

/** 百炼 / DashScope OpenAI 兼容接口，用于回忆 AI 生成 */
export interface AISettings {
  dashscopeApiKey?: string;
  /** 默认 qwen-turbo；带图时用 qwen-vl-plus */
  memoryModel?: string;
  visionModel?: string;
}

export interface VaultSettings {
  baseCurrency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
  lockEnabled: boolean;
  passwordHash: string | null;
  monthlyIncome: number | null;
  monthlyExpense: number | null;
  chartAxisUnit?: ChartAxisUnit;
  goalAllocationMode?: GoalAllocationMode;
  ocr?: OCRSettings;
  ai?: AISettings;
  /** 用户录入账户余额的基准日（YYYY-MM-DD），用于从历史流水反推趋势 */
  netWorthAnchorDate?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  accountId: string;
  description: string;
  createdAt: string;
  source: 'manual' | 'csv';
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  amount?: number;
  period?: BudgetPeriod;
  startDate?: string;
  endDate?: string | null;
  alertThreshold?: number;
  icon?: string;
  color?: string;
  spent: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  priority: number;
  allocationMode?: GoalAllocationMode;
  allocationPercent?: number;
  dedicatedIncomeSource?: string;
  color: string;
  icon?: string;
  completed: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'repayment' | 'salary' | 'expense' | 'reminder';
  amount?: number;
  accountId?: string;
  description?: string;
  recurring: boolean;
  color?: string;
}

export interface AssetSnapshot {
  date: string;
  totalAssets: number;
  netWorth: number;
  totalDebt: number;
  liquidAssets: number;
  investmentAssets: number;
}

export interface AssetCheckpoint extends AssetSnapshot {
  id: string;
  createdAt: string;
  note: string;
  accounts: Account[];
  baseCurrency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>;
  transactionIds: string[];
  previousId?: string;
  balanceApplied?: boolean;
  intervalIncome: number;
  intervalExpense: number;
  unexplainedChange: number | null;
}

export interface AccountBalancePoint {
  id: string;
  accountId: string;
  date: string;
  recordedAt: string;
  balance: number;
  currency: CurrencyCode;
  accountType: Account['type'];
  note: string;
  source: 'account-edit' | 'baseline' | 'inventory';
}

export interface ForecastEvent {
  id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  frequency: ForecastFrequency;
  startDate: string;
  endDate?: string | null;
  enabled: boolean;
}

export interface MonthlyBudget {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export interface CategoryTotal {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

export type ViewType = 'dashboard' | 'trends' | 'budget' | 'calendar' | 'goals' | 'transactions' | 'settings';

export interface AppData {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  calendarEvents: CalendarEvent[];
  assetSnapshots: AssetSnapshot[];
  assetCheckpoints?: AssetCheckpoint[];
  accountBalanceHistory?: AccountBalancePoint[];
  legacyAssetSnapshots?: AssetSnapshot[];
  monthlyData: MonthlyBudget[];
  forecastEvents?: ForecastEvent[];
  lifeGameSnapshot?: {
    generatedAt: string;
    totalEvents: number;
    monthlyNet: Record<string, number>;
    categoryTotals: Record<string, number>;
    tagTotals: Record<string, number>;
  };
}
