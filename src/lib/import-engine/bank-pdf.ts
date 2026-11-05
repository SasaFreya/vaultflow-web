import type { NormalizedRecord } from './types';
import { parseAmount, parseDate } from './utils';

let recordSeq = 0;

export function resetBankPdfIds(): void {
  recordSeq = 0;
}

function nextId(): number {
  recordSeq += 1;
  return recordSeq;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\r/g, '\n');
}

function splitByDatePattern(text: string, pattern: RegExp): string[] {
  const normalized = normalizeWhitespace(text);
  const parts = normalized.split(pattern);
  return parts.map(p => p.trim()).filter(p => p.length > 8);
}

const CMB_HEADER =
  /记账日期|Transaction Statement|Transaction Amount|温馨提示|Transaction Statement of China Merchants Bank|^\d+\/\d+\s*$/;

const ABC_SKIP_LINE =
  /交易日期\s+交易时间\s+交易摘要|中国农业银行账户活期交易明细|起止日期：|户名：|第\s*\d+\s*页|共\s*\d+\s*页|打印日期|币种：|该交易明细因不可预测/;

function isAbcNoise(summary: string, amountStr: string): boolean {
  const s = summary.trim();
  if (/结息|利息税|批量结息/.test(s)) return true;
  const signed = parseFloat(amountStr.replace(/,/g, ''));
  return !Number.isFinite(signed) || signed === 0;
}

function cleanCmbCounterparty(raw: string): string {
  return raw
    .replace(/\s+\d+\/\d+\s+记账日期[\s\S]*$/i, '')
    .replace(/\s+Date Currency[\s\S]*$/i, '')
    .replace(/\s+记账日期[\s\S]*$/i, '')
    .trim();
}

function pushBankRecord(
  records: NormalizedRecord[],
  fileName: string,
  source: 'cmb' | 'abc',
  fields: {
    dateStr: string;
    amountStr: string;
    summary: string;
    counterparty: string;
  },
): void {
  const amount = parseAmount(fields.amountStr);
  if (!amount) return;
  const signed = parseFloat(fields.amountStr.replace(/,/g, ''));
  if (!Number.isFinite(signed)) return;

  records.push({
    id: nextId(),
    time: parseDate(fields.dateStr),
    type: fields.summary.trim() || '银行流水',
    counterparty: fields.counterparty.trim(),
    product: fields.summary.trim() || '银行流水',
    direction: signed >= 0 ? 'income' : 'expense',
    amount,
    paymentMethod: '银行卡',
    transactionId: '',
    status: '',
    note: '',
    source,
    sourceFile: fileName,
  });
}

export function parseCmbPdfText(text: string, fileName: string): NormalizedRecord[] {
  const records: NormalizedRecord[] = [];
  const normalized = normalizeWhitespace(text);

  const globalPattern =
    /(\d{4}-\d{2}-\d{2})\s+CNY\s+([+-]?[\d,]+\.\d{2})\s+([+-]?[\d,]+\.\d{2})\s+(\S+)\s+([\s\S]*?)(?=\d{4}-\d{2}-\d{2}\s+CNY|\d+\/\d+\s*记账日期|$)/g;
  let match: RegExpExecArray | null;
  while ((match = globalPattern.exec(normalized)) !== null) {
    const [, dateStr, amountStr, , summary, counterpartyRaw] = match;
    if (CMB_HEADER.test(summary)) continue;
    const counterparty = cleanCmbCounterparty(counterpartyRaw);
    pushBankRecord(records, fileName, 'cmb', {
      dateStr,
      amountStr,
      summary,
      counterparty: counterparty || summary,
    });
  }

  if (records.length > 0) return records;

  const segments = splitByDatePattern(normalized, /(?=\d{4}-\d{2}-\d{2})/);
  for (const segment of segments) {
    const line = segment.replace(/\s+/g, ' ').trim();
    if (!line || CMB_HEADER.test(line)) continue;

    const strict = line.match(
      /^(\d{4}-\d{2}-\d{2})\s+CNY\s+([+-]?[\d,]+\.\d{2})\s+([+-]?[\d,]+\.\d{2})\s+(\S+)\s+(.+)$/,
    );
    if (strict) {
      const [, dateStr, amountStr, , summary, counterpartyRaw] = strict;
      pushBankRecord(records, fileName, 'cmb', {
        dateStr,
        amountStr,
        summary,
        counterparty: cleanCmbCounterparty(counterpartyRaw) || summary,
      });
    }
  }

  if (records.length === 0) {
    const loose = /(\d{4}-\d{2}-\d{2})\s+CNY\s+([+-]?[\d,]+\.\d{2})/g;
    while ((match = loose.exec(normalized)) !== null) {
      const [, dateStr, amountStr] = match;
      pushBankRecord(records, fileName, 'cmb', {
        dateStr,
        amountStr,
        summary: '银行流水',
        counterparty: '',
      });
    }
  }

  return records;
}

function mergeAbcContinuationLines(text: string): string[] {
  const lines = normalizeWhitespace(text).split('\n');
  const merged: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || ABC_SKIP_LINE.test(line)) continue;

    if (/^\d{8}\s+\d{6}\s/.test(line)) {
      merged.push(line);
      continue;
    }

    if (merged.length > 0 && !/^\d/.test(line) && !/[+\-]?\d+\.\d{2}/.test(line)) {
      merged[merged.length - 1] += line.replace(/\s+/g, '');
    }
  }

  if (merged.length > 0) return merged;
  return splitByDatePattern(text, /(?=\d{8}\s+\d{6}\s+)/);
}

function parseAbcLine(line: string, fileName: string, records: NormalizedRecord[]): void {
  const normalized = line.replace(/\s+/g, ' ').trim();

  const patterns = [
    /^(\d{8})\s+(\d{6})\s+(\S+)\s+([+\-]?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(.+?)\s+(\S+)\s+(\S+)\s+(.+)$/,
    /^(\d{8})\s+(\d{6})\s+(\S+)\s+([+\-]?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(.+)$/,
    /^(\d{8})\s+(\d{6})\s+(.+?)\s+([+\-]?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?:\s+(.+))?$/,
  ];

  for (const pattern of patterns) {
    const m = normalized.match(pattern);
    if (!m) continue;

    const dateStr = m[1];
    let summary: string;
    let amountStr: string;
    let counterparty: string;

    if (pattern === patterns[0]) {
      summary = m[3];
      amountStr = m[4];
      counterparty = m[9] ?? m[6] ?? '';
    } else if (pattern === patterns[1]) {
      summary = m[3];
      amountStr = m[4];
      counterparty = m[6]?.trim() ?? '';
    } else {
      const bodyParts = m[3].trim().split(/\s+/);
      summary = bodyParts[0] ?? '银行流水';
      amountStr = m[4];
      counterparty = m[6]?.trim() || bodyParts.slice(1).join(' ') || summary;
    }

    if (isAbcNoise(summary, amountStr)) return;
    pushBankRecord(records, fileName, 'abc', { dateStr, amountStr, summary, counterparty });
    return;
  }
}

export function parseAbcPdfText(text: string, fileName: string): NormalizedRecord[] {
  const records: NormalizedRecord[] = [];
  const normalized = normalizeWhitespace(text);

  const globalPattern =
    /(\d{8})\s+(\d{6})\s+(\S+)\s+([+\-]?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\s\S]*?)(?=\d{8}\s+\d{6}\s+|该交易明细因不可预测|$)/g;
  let match: RegExpExecArray | null;
  while ((match = globalPattern.exec(normalized)) !== null) {
    const [, dateStr, , summary, amountStr, , tail] = match;
    if (isAbcNoise(summary, amountStr)) continue;
    const counterparty = tail
      .replace(/\s+第\s*\d+\s*页[\s\S]*$/i, '')
      .replace(/\s+\d{8}\s+\d{6}\s+[\s\S]*$/i, '')
      .trim() || summary;
    pushBankRecord(records, fileName, 'abc', {
      dateStr,
      amountStr,
      summary,
      counterparty: counterparty || summary,
    });
  }

  if (records.length > 0) return records;

  for (const line of mergeAbcContinuationLines(normalized)) {
    parseAbcLine(line, fileName, records);
  }

  return records;
}

export function parseBankPdfText(
  text: string,
  kind: 'cmb_pdf' | 'abc_pdf',
  fileName: string,
): NormalizedRecord[] {
  const records = kind === 'cmb_pdf'
    ? parseCmbPdfText(text, fileName)
    : parseAbcPdfText(text, fileName);

  if (records.length === 0) {
    const bank = kind === 'cmb_pdf' ? '招商银行' : '农业银行';
    throw new Error(`未能从 PDF 识别有效${bank}流水，请确认是官方导出且未加密`);
  }

  return records;
}
