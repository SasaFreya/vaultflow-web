import Papa from 'papaparse';
import { Buffer } from 'buffer';
import iconv from 'iconv-lite';
import type { Account, CsvImportFormat, Transaction } from '@/types';
import { generateId, getToday } from '@/lib/storage';
import { findCsvHeaderLine } from '@/lib/import-engine/utils';

const CATEGORY_RULES: [RegExp, string][] = [
  [/餐饮|外卖|美食|咖啡|奶茶|食堂|饭/, '餐饮美食'],
  [/交通|地铁|公交|打车|滴滴|出租|高铁|火车|机票|加油|停车/, '交通出行'],
  [/购物|淘宝|京东|拼多多|超市|便利店|服饰|数码/, '购物消费'],
  [/房租|水电|物业|燃气|宽带|网费|通讯/, '房租水电'],
  [/娱乐|游戏|电影|KTV|旅游|酒店/, '娱乐休闲'],
  [/医疗|医院|药店|健康/, '医疗健康'],
  [/教育|学习|课程|培训|书籍/, '学习教育'],
  [/红包|转账|人情|礼金/, '人情往来'],
  [/工资|薪资|奖金|理财|收益|兼职|报销/, '工资收入'],
];

export function autoCategorize(text: string, type: 'income' | 'expense'): string {
  const combined = text.toLowerCase();
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(combined)) {
      if (type === 'income' && !category.includes('收入') && category !== '理财收益') continue;
      if (type === 'expense' && category.includes('收入')) continue;
      return category;
    }
  }
  return type === 'income' ? '其他收入' : '其他支出';
}

export function detectCsvFormat(headers: string[], sampleRows: Record<string, string>[]): CsvImportFormat {
  const h = headers.join('|').toLowerCase();
  const sample = sampleRows.slice(0, 3).map(r => Object.values(r).join('|')).join('|').toLowerCase();

  if (h.includes('交易时间') && (h.includes('交易类型') || h.includes('收/支'))) {
    if (h.includes('交易对方') || h.includes('商户')) return 'wechat';
    if (h.includes('商品说明') || h.includes('收/付款方式')) return 'alipay';
  }
  if (h.includes('交易日期') && h.includes('交易摘要') && h.includes('交易金额')) return 'cmb';
  if (h.includes('交易时间') && h.includes('对方户名') && h.includes('发生额')) return 'icbc';
  if (sample.includes('微信支付') || h.includes('微信')) return 'wechat';
  if (sample.includes('支付宝') || h.includes('alipay')) return 'alipay';
  if (h.includes('date') || h.includes('日期') || h.includes('amount') || h.includes('金额')) return 'generic';
  return 'unknown';
}

const FORMAT_LABELS: Record<CsvImportFormat, string> = {
  wechat: '微信账单',
  alipay: '支付宝账单',
  cmb: '招商银行流水',
  icbc: '工商银行流水',
  generic: '通用模板',
  unknown: '未知格式',
};

export function getFormatLabel(format: CsvImportFormat): string {
  return FORMAT_LABELS[format];
}

function parseDate(raw: string): string {
  let s = String(raw ?? '').trim();
  if (!s) return getToday();
  s = s.replace(/\//g, '-').replace(/\./g, '-');
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const m2 = s.match(/(\d{4})(\d{2})(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return getToday();
}

function parseAmount(raw: string): number {
  const s = String(raw ?? '').replace(/[,¥￥$+\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  return Math.abs(parseFloat(s));
}

function parseType(raw: string, amountRaw?: string): 'income' | 'expense' {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('收入') || s.includes('income') || s === '收' || s.includes('转入') || s.includes('退款')) return 'income';
  if (s.includes('支出') || s.includes('expense') || s === '支' || s.includes('转出')) return 'expense';
  if (amountRaw && String(amountRaw).trim().startsWith('+')) return 'income';
  if (amountRaw && String(amountRaw).trim().startsWith('-')) return 'expense';
  return 'expense';
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return String(row[k]);
  }
  return '';
}

function rowToTransaction(
  row: Record<string, string>,
  format: CsvImportFormat,
  accounts: Account[],
): Omit<Transaction, 'id' | 'createdAt'> | null {
  let dateRaw = '';
  let amountRaw = '';
  let typeRaw = '';
  let desc = '';
  let categoryRaw = '';

  switch (format) {
    case 'wechat':
      dateRaw = pick(row, ['交易时间', '时间']);
      amountRaw = pick(row, ['金额(元)', '金额', '收/支金额']);
      typeRaw = pick(row, ['收/支', '交易类型']);
      desc = pick(row, ['交易对方', '商品', '备注']);
      categoryRaw = pick(row, ['交易类型', '商品']);
      break;
    case 'alipay':
      dateRaw = pick(row, ['交易时间', '时间']);
      amountRaw = pick(row, ['金额', '收/支金额', '金额（元）']);
      typeRaw = pick(row, ['收/支', '交易状态']);
      desc = pick(row, ['商品说明', '交易对方', '备注']);
      categoryRaw = pick(row, ['交易分类', '类型', '商品说明']);
      break;
    case 'cmb':
      dateRaw = pick(row, ['交易日期', '日期']);
      amountRaw = pick(row, ['交易金额', '金额', '发生额']);
      typeRaw = pick(row, ['借贷', '收/支']);
      desc = pick(row, ['交易摘要', '摘要', '备注']);
      categoryRaw = desc;
      break;
    case 'icbc':
      dateRaw = pick(row, ['交易时间', '交易日期']);
      amountRaw = pick(row, ['发生额', '交易金额', '金额']);
      typeRaw = pick(row, ['借贷标志', '收/支']);
      desc = pick(row, ['摘要', '对方户名', '用途']);
      categoryRaw = desc;
      break;
    default:
      dateRaw = pick(row, ['date', '日期', 'Date', '交易时间', '时间']);
      amountRaw = pick(row, ['amount', '金额', 'Amount', '收/支金额']);
      typeRaw = pick(row, ['type', '类型', 'Type', '收/支']);
      desc = pick(row, ['description', '备注', 'Description', '商品说明', '摘要']);
      categoryRaw = pick(row, ['category', '分类', 'Category', '交易分类']);
  }

  const amount = parseAmount(amountRaw);
  if (!amount || Number.isNaN(amount)) return null;

  const type = parseType(typeRaw, amountRaw);
  const description = desc.trim() || categoryRaw.trim() || (type === 'income' ? '收入' : '支出');
  const category = categoryRaw.trim() || autoCategorize(`${description} ${typeRaw}`, type);

  const accountId =
    accounts.find(a => a.name.includes('微信') && format === 'wechat')?.id ??
    accounts.find(a => a.name.includes('支付宝') && format === 'alipay')?.id ??
    accounts.find(a => a.type === 'cash')?.id ??
    accounts[0]?.id ??
    '';

  if (!accountId) return null;

  return {
    date: parseDate(dateRaw),
    amount,
    type,
    category,
    accountId,
    description,
    source: 'csv',
  };
}

function dedupeKey(t: Omit<Transaction, 'id' | 'createdAt'>): string {
  return `${t.date}|${t.amount}|${t.type}|${t.description}|${t.accountId}`;
}

export interface CsvImportResult {
  format: CsvImportFormat;
  imported: Omit<Transaction, 'id' | 'createdAt'>[];
  skipped: number;
  errors: string[];
}

function normalizeCsvInput(raw: string | ArrayBuffer): string {
  let text: string;
  if (typeof raw === 'string') {
    text = raw;
  } else {
    const bytes = new Uint8Array(raw);
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (text.includes('�')) text = iconv.decode(Buffer.from(bytes), 'gbk');
    } catch {
      text = iconv.decode(Buffer.from(bytes), 'gbk');
    }
  }

  const alipayHeader = findCsvHeaderLine(text, ['交易时间', '交易分类']);
  const wechatHeader = findCsvHeaderLine(text, ['交易时间', '交易类型']);
  const genericHeader = findCsvHeaderLine(text, ['交易时间', '收/支']);
  const headerIdx = Math.max(alipayHeader, wechatHeader, genericHeader);
  if (headerIdx > 0) {
    return text.split(/\r?\n/).slice(headerIdx).join('\n');
  }
  return text;
}

export function importTransactionsFromCsv(
  csv: string | ArrayBuffer,
  accounts: Account[],
  existing: Transaction[],
): CsvImportResult {
  const errors: string[] = [];
  const normalized = normalizeCsvInput(csv);
  const result = Papa.parse<Record<string, string>>(normalized, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    return { format: 'unknown', imported: [], skipped: 0, errors: [result.errors[0]?.message ?? 'CSV 解析失败'] };
  }

  const rows = result.data.filter(r => Object.values(r).some(v => String(v).trim()));
  const headers = result.meta.fields ?? Object.keys(rows[0] ?? {});
  const format = detectCsvFormat(headers, rows);

  const existingKeys = new Set(existing.map(t => dedupeKey(t)));
  const imported: Omit<Transaction, 'id' | 'createdAt'>[] = [];
  let skipped = 0;

  rows.forEach((row, i) => {
    const tx = rowToTransaction(row, format === 'unknown' ? 'generic' : format, accounts);
    if (!tx) {
      errors.push(`第 ${i + 2} 行：无法解析`);
      return;
    }
    const key = dedupeKey(tx);
    if (existingKeys.has(key)) {
      skipped++;
      return;
    }
    existingKeys.add(key);
    imported.push(tx);
  });

  return { format, imported, skipped, errors: errors.slice(0, 5) };
}

export function transactionsToEntities(items: Omit<Transaction, 'id' | 'createdAt'>[]): Transaction[] {
  const today = getToday();
  return items.map(t => ({ ...t, id: generateId(), createdAt: today }));
}
