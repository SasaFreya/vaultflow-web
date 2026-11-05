import type { NormalizedRecord, RecordSource } from './types';

/** Python 脚本 / AI 兜底输出的单条流水 */
export interface ExternalBankRecord {
  id?: string;
  date: string;
  time?: string;
  type: string;
  amount: number;
  balance?: number;
  summary?: string;
  counter?: string;
  channel?: string;
  note?: string;
  source?: string;
  account?: string;
  category?: string;
  importedAt?: string;
  fileName?: string;
}

const EXTERNAL_CATEGORY_MAP: Record<string, { income: string; expense: string }> = {
  '交通出行': { income: '其他收入', expense: '交通出行' },
  '餐饮/外卖': { income: '其他收入', expense: '餐饮美食' },
  '转账收款': { income: '其他收入', expense: '人情往来' },
  '购物消费': { income: '其他收入', expense: '购物消费' },
  '还款/信贷': { income: '其他收入', expense: '其他支出' },
  '金融投资': { income: '理财收益', expense: '其他支出' },
  '工资收入': { income: '工资收入', expense: '其他支出' },
  '医疗健康': { income: '其他收入', expense: '医疗健康' },
  '银行利息': { income: '理财收益', expense: '其他支出' },
  '数码/软件/教育': { income: '其他收入', expense: '学习教育' },
  '文化娱乐': { income: '其他收入', expense: '娱乐休闲' },
  '生活缴费': { income: '其他收入', expense: '房租水电' },
  '其他': { income: '其他收入', expense: '其他支出' },
};

function resolveSource(raw?: string, bank?: string): RecordSource {
  const text = `${raw ?? ''} ${bank ?? ''}`;
  if (/农业|农行|abc/i.test(text)) return 'abc';
  if (/招商|招行|cmb/i.test(text)) return 'cmb';
  return 'generic';
}

function resolveDirection(type: string): 'income' | 'expense' {
  const t = type.trim();
  if (t === '收入' || t === 'income' || t === '转入') return 'income';
  if (t === '支出' || t === 'expense' || t === '转出') return 'expense';
  return 'expense';
}

export function mapExternalCategory(category: string | undefined, direction: 'income' | 'expense'): string | undefined {
  if (!category?.trim()) return undefined;
  const hit = EXTERNAL_CATEGORY_MAP[category.trim()];
  if (hit) return direction === 'income' ? hit.income : hit.expense;
  return direction === 'income' ? '其他收入' : '其他支出';
}

function flattenExternalRecords(parsed: unknown): ExternalBankRecord[] {
  if (Array.isArray(parsed)) return parsed as ExternalBankRecord[];

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.transactions)) {
      return obj.transactions as ExternalBankRecord[];
    }
    const grouped: ExternalBankRecord[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item && typeof item === 'object') {
            grouped.push({
              ...(item as ExternalBankRecord),
              source: (item as ExternalBankRecord).source ?? key,
            });
          }
        });
      }
    }
    if (grouped.length > 0) return grouped;
  }

  throw new Error('JSON 格式无效：需要数组、{ transactions: [] } 或按银行分组的对象');
}

export function parseExternalBankJson(text: string): ExternalBankRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON 解析失败，请检查格式');
  }
  const records = flattenExternalRecords(parsed);
  if (records.length === 0) throw new Error('JSON 中没有流水记录');
  return records;
}

export function externalRecordsToNormalized(
  records: ExternalBankRecord[],
  defaultFileName = 'bank_import.json',
): NormalizedRecord[] {
  return records.map((r, index) => {
    const amount = Math.abs(Number(r.amount) || 0);
    if (!amount || !r.date) {
      throw new Error(`第 ${index + 1} 条记录缺少日期或金额`);
    }
    const direction = resolveDirection(r.type ?? '');
    const source = resolveSource(r.source, r.account);
    const time = r.time ? `${r.date} ${r.time}`.trim() : r.date;
    const summary = (r.summary ?? '').trim() || '银行流水';
    const counter = (r.counter ?? '').trim();
    const presetCategory = mapExternalCategory(r.category, direction);

    return {
      id: index + 1,
      time,
      type: summary,
      counterparty: counter || summary,
      product: summary,
      direction,
      amount,
      paymentMethod: '银行卡',
      transactionId: r.id ?? '',
      status: '',
      note: r.note ?? '',
      source,
      sourceFile: r.fileName ?? defaultFileName,
      presetCategory,
    };
  });
}

export function parseBankJsonText(text: string, fileName?: string): NormalizedRecord[] {
  const external = parseExternalBankJson(text);
  return externalRecordsToNormalized(external, fileName ?? 'bank_import.json');
}
