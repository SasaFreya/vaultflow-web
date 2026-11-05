import type { Account, Transaction } from '@/types';

export type ImportFileKind =
  | 'wechat_excel'
  | 'alipay_csv'
  | 'cmb_pdf'
  | 'abc_pdf'
  | 'generic_csv'
  | 'unknown';

export type RecordSource = 'wechat' | 'alipay' | 'cmb' | 'abc' | 'icbc' | 'generic';

export interface NormalizedRecord {
  id: number;
  time: string;
  type: string;
  counterparty: string;
  product: string;
  direction: 'income' | 'expense';
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  note: string;
  source: RecordSource;
  sourceFile: string;
  /** Python / AI 导入时已映射的分类，优先于 smartClassify */
  presetCategory?: string;
}

export interface DuplicatePair {
  kept: NormalizedRecord;
  removed: NormalizedRecord;
  matchType: 'strong' | 'weak';
  reason: string;
}

export interface DedupResult {
  kept: NormalizedRecord[];
  removed: NormalizedRecord[];
  pairs: DuplicatePair[];
}

export interface FileParseResult {
  kind: ImportFileKind;
  fileName: string;
  records: NormalizedRecord[];
  errors: string[];
}

export interface ImportEngineResult {
  files: FileParseResult[];
  allRecords: NormalizedRecord[];
  dedup: DedupResult;
  transactions: Omit<Transaction, 'id' | 'createdAt'>[];
  skippedExisting: number;
  skippedWalletOverlap: number;
  skippedExactDuplicate: number;
  skippedNoAccount: number;
  spendingInsights: SpendingInsight[];
  gameSnapshot: LifeGameSnapshot;
}

export interface SpendingInsight {
  tag: '通勤' | '交通' | '住房' | '社交' | '娱乐' | '餐饮' | '其他';
  amount: number;
  count: number;
  share: number;
}

export interface LifeGameEvent {
  id: string;
  date: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  tag: string;
  description: string;
  mood: 'neutral' | 'happy' | 'stress';
}

export interface LifeGameSnapshot {
  generatedAt: string;
  totalEvents: number;
  monthlyNet: Record<string, number>;
  categoryTotals: Record<string, number>;
  tagTotals: Record<string, number>;
  events: LifeGameEvent[];
}

export interface ImportProgressStep {
  progress: number;
  text: string;
}

export const IMPORT_STEPS: ImportProgressStep[] = [
  { progress: 10, text: '识别文件格式…' },
  { progress: 25, text: '读取原始数据…' },
  { progress: 40, text: '修复编码与表头…' },
  { progress: 55, text: '标准化字段…' },
  { progress: 75, text: '扫描跨平台重复…' },
  { progress: 90, text: '智能分类…' },
  { progress: 100, text: '导入完成' },
];

export interface AccountMappingContext {
  accounts: Account[];
  existing: Transaction[];
}
