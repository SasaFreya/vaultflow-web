import { Buffer } from 'buffer';
import iconv from 'iconv-lite';
import { getToday } from '@/lib/storage';

export function parseDate(raw: string): string {
  let s = String(raw ?? '').trim();
  if (!s) return getToday();
  s = s.replace(/\//g, '-').replace(/\./g, '-');
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const m2 = s.match(/(\d{4})(\d{2})(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return getToday();
}

export function parseAmount(raw: string | number): number {
  if (typeof raw === 'number') return Math.abs(raw);
  const s = String(raw ?? '').replace(/[,¥￥$+\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

export function parseDirection(typeRaw: string, amountRaw?: string): 'income' | 'expense' {
  const s = String(typeRaw ?? '').toLowerCase();
  if (s.includes('收入') || s.includes('income') || s === '收' || s.includes('转入') || s.includes('退款')) return 'income';
  if (s.includes('支出') || s.includes('expense') || s === '支' || s.includes('转出')) return 'expense';
  if (amountRaw && String(amountRaw).trim().startsWith('+')) return 'income';
  if (amountRaw && String(amountRaw).trim().startsWith('-')) return 'expense';
  return 'expense';
}

export function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return String(row[k]);
  }
  return '';
}

export function extractCore(name: string): string {
  return name
    .replace(/深圳市|广州市|北京市|上海市|（|）|\(|\)|\s/g, '')
    .replace(/有限公司|公司|店|商户|平台/g, '')
    .slice(0, 6);
}

export function decodeText(bytes: Uint8Array): { text: string; encoding: string } {
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (!utf8.includes('�') && (utf8.includes('交易时间') || utf8.includes('date'))) {
      return { text: utf8, encoding: 'utf-8' };
    }
  } catch {
    // fall through to GBK
  }
  const gbk = iconv.decode(Buffer.from(bytes), 'gbk');
  return { text: gbk, encoding: 'gbk' };
}

export function findCsvHeaderLine(text: string, markers: string[]): number {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const line = lines[i];
    if (markers.every(m => line.includes(m))) return i;
  }
  return -1;
}
