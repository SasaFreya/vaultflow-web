import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Buffer } from 'buffer';
import iconv from 'iconv-lite';
import type { ImportFileKind, NormalizedRecord } from './types';
import {
  decodeText,
  findCsvHeaderLine,
  parseAmount,
  parseDate,
  parseDirection,
  pick,
} from './utils';
import { parseBankPdfText, resetBankPdfIds } from './bank-pdf';
import { extractPdfText } from './pdf-extract';
import { parseBankPdfViaPython } from './pdf-python';

let recordSeq = 0;

function nextId(): number {
  recordSeq += 1;
  return recordSeq;
}

function resetIds(): void {
  recordSeq = 0;
  resetBankPdfIds();
}

function rowToRecord(
  row: Record<string, string>,
  source: NormalizedRecord['source'],
  fileName: string,
  map: (row: Record<string, string>) => {
    time: string;
    type: string;
    counterparty: string;
    product: string;
    directionRaw: string;
    amountRaw: string;
    paymentMethod: string;
    transactionId: string;
    status: string;
    note: string;
  },
): NormalizedRecord | null {
  const m = map(row);
  const amount = parseAmount(m.amountRaw);
  if (!amount) return null;
  const direction = parseDirection(m.directionRaw, m.amountRaw);
  const counterparty = m.counterparty.trim();
  const product = m.product.trim();
  const description = counterparty || product || m.type;
  if (!description) return null;
  if (m.status.includes('已全额退款') && !m.type.includes('退款')) return null;

  return {
    id: nextId(),
    time: parseDate(m.time),
    type: m.type,
    counterparty,
    product,
    direction,
    amount,
    paymentMethod: m.paymentMethod,
    transactionId: m.transactionId,
    status: m.status,
    note: m.note,
    source,
    sourceFile: fileName,
  };
}

export function detectFileKind(fileName: string, sampleText: string): ImportFileKind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xlsx' || ext === 'xls') {
    if (sampleText.includes('微信支付') || sampleText.includes('交易时间')) return 'wechat_excel';
    return 'wechat_excel';
  }
  if (ext === 'csv') {
    if ((sampleText.includes('基金') || fileName.includes('基金')) &&
        (sampleText.includes('确认份额') || sampleText.includes('申购') || sampleText.includes('赎回'))) {
      return 'generic_csv';
    }
    if (sampleText.includes('支付宝') || sampleText.includes('交易分类')) return 'alipay_csv';
    if (sampleText.includes('交易时间') && sampleText.includes('交易类型')) return 'wechat_excel';
    if (sampleText.includes('交易时间') && sampleText.includes('收/支')) return 'wechat_excel';
    return 'generic_csv';
  }
  if (ext === 'pdf') {
    return detectBankPdfKind(fileName, sampleText);
  }
  return 'unknown';
}

function detectBankPdfKind(fileName: string, text: string): ImportFileKind {
  const name = fileName;

  // 1) 文件名（用户导出时通常含银行名）
  if (/农行|农业/.test(name)) return 'abc_pdf';
  if (/招商|招行/.test(name)) return 'cmb_pdf';

  // 2) 正文银行标识
  if (text.includes('招商银行') || /Merchants Bank/i.test(text)) return 'cmb_pdf';
  if (text.includes('农业银行') || text.includes('中国农业银行')) return 'abc_pdf';

  // 3) 表头特征
  if (/记账日期\s+货币\s+交易金额/.test(text) || /Transaction Statement of China Merchants/i.test(text)) {
    return 'cmb_pdf';
  }
  if (/交易日期\s+交易时间\s+交易摘要/.test(text)) return 'abc_pdf';

  // 4) 流水行结构（pdf.js 能提文本但不含银行名时）
  const cmbRows = (text.match(/\d{4}-\d{2}-\d{2}\s+CNY\s+[+\-]?[\d,]+\.\d{2}/g) ?? []).length;
  const abcRows = (text.match(/\d{8}\s+\d{6}\s+\S+\s+[+\-][\d,]+\.\d{2}/g) ?? []).length;
  if (cmbRows >= 2 && cmbRows >= abcRows) return 'cmb_pdf';
  if (abcRows >= 2) return 'abc_pdf';

  return 'unknown';
}

export async function parseWechatExcel(file: File): Promise<NormalizedRecord[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = rows[i].map(c => String(c));
    if (cells.includes('交易时间') && (cells.includes('交易类型') || cells.includes('收/支'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error('无法识别微信账单：未找到「交易时间」表头，请确认是微信官方导出的 Excel');

  const headers = rows[headerIdx].map(h => String(h).trim());
  const dataRows = rows.slice(headerIdx + 1);
  const records: NormalizedRecord[] = [];

  dataRows.forEach(cells => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = String(cells[i] ?? '').trim();
    });
    if (!Object.values(row).some(v => v)) return;

    const rec = rowToRecord(row, 'wechat', file.name, r => ({
      time: pick(r, ['交易时间', '时间']),
      type: pick(r, ['交易类型', '类型']),
      counterparty: pick(r, ['交易对方', '商户']),
      product: pick(r, ['商品', '商品名称']),
      directionRaw: pick(r, ['收/支', '交易类型']),
      amountRaw: pick(r, ['金额(元)', '金额', '收/支金额']),
      paymentMethod: pick(r, ['支付方式', '收/付款方式']),
      transactionId: pick(r, ['交易单号', '交易订单号']),
      status: pick(r, ['当前状态', '交易状态']),
      note: pick(r, ['备注']),
    }));
    if (rec) records.push(rec);
  });

  return records;
}

export function parseWechatCsvText(text: string, fileName: string): NormalizedRecord[] {
  const headerIdx = findCsvHeaderLine(text, ['交易时间', '交易类型']);
  if (headerIdx < 0) throw new Error('无法识别微信账单 CSV：未找到表头');
  const cleanText = text.split(/\r?\n/).slice(headerIdx).join('\n');
  const parsed = Papa.parse<Record<string, string>>(cleanText, { header: true, skipEmptyLines: true });
  const records: NormalizedRecord[] = [];
  parsed.data.forEach(row => {
    if (!Object.values(row).some(v => String(v).trim())) return;
    const rec = rowToRecord(row, 'wechat', fileName, r => ({
      time: pick(r, ['交易时间', '时间']),
      type: pick(r, ['交易类型', '类型']),
      counterparty: pick(r, ['交易对方', '商户']),
      product: pick(r, ['商品', '商品名称']),
      directionRaw: pick(r, ['收/支', '交易类型']),
      amountRaw: pick(r, ['金额(元)', '金额', '收/支金额']),
      paymentMethod: pick(r, ['支付方式', '收/付款方式']),
      transactionId: pick(r, ['交易单号', '交易订单号']),
      status: pick(r, ['当前状态', '交易状态']),
      note: pick(r, ['备注']),
    }));
    if (rec) records.push(rec);
  });
  return records;
}

export function parseAlipayCsvText(text: string, fileName: string): NormalizedRecord[] {
  const headerIdx = findCsvHeaderLine(text, ['交易时间', '交易分类']);
  if (headerIdx < 0) {
    const alt = findCsvHeaderLine(text, ['交易时间', '收/支']);
    if (alt < 0) throw new Error('无法识别支付宝账单：未找到 CSV 表头，请确认是支付宝官方导出');
  }
  const idx = headerIdx >= 0 ? headerIdx : findCsvHeaderLine(text, ['交易时间', '收/支']);
  const cleanText = text.split(/\r?\n/).slice(idx).join('\n');
  const parsed = Papa.parse<Record<string, string>>(cleanText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(parsed.errors[0]?.message ?? '支付宝 CSV 解析失败');
  }

  const records: NormalizedRecord[] = [];
  parsed.data.forEach(row => {
    if (!Object.values(row).some(v => String(v).trim())) return;
    const rec = rowToRecord(row, 'alipay', fileName, r => ({
      time: pick(r, ['交易时间', '时间']),
      type: pick(r, ['交易分类', '类型']),
      counterparty: pick(r, ['交易对方', '对方账号']),
      product: pick(r, ['商品说明', '商品名称']),
      directionRaw: pick(r, ['收/支', '交易状态']),
      amountRaw: pick(r, ['金额', '收/支金额', '金额（元）', '金额(元)']),
      paymentMethod: pick(r, ['收/付款方式', '支付方式']),
      transactionId: pick(r, ['交易订单号', '交易单号']),
      status: pick(r, ['交易状态', '当前状态']),
      note: pick(r, ['备注']),
    }));
    if (rec) records.push(rec);
  });
  return records;
}

export async function parseAlipayCsv(file: File): Promise<NormalizedRecord[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('�') || (!text.includes('交易时间') && bytes.some(b => b > 127))) {
      text = iconv.decode(Buffer.from(bytes), 'gbk');
    }
  } catch {
    text = iconv.decode(Buffer.from(bytes), 'gbk');
  }
  return parseAlipayCsvText(text, file.name);
}

export async function parseGenericCsv(file: File): Promise<NormalizedRecord[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { text } = decodeText(bytes);
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const records: NormalizedRecord[] = [];
  parsed.data.forEach(row => {
    const rec = rowToRecord(row, 'generic', file.name, r => ({
      time: pick(r, ['date', '日期', 'Date', '交易时间', '时间']),
      type: pick(r, ['type', '类型', 'Type', '交易分类']),
      counterparty: pick(r, ['description', '备注', 'Description', '交易对方', '摘要']),
      product: pick(r, ['category', '分类', 'Category', '商品说明']),
      directionRaw: pick(r, ['type', '类型', 'Type', '收/支']),
      amountRaw: pick(r, ['amount', '金额', 'Amount', '收/支金额', '交易金额']),
      paymentMethod: pick(r, ['payment_method', '支付方式']),
      transactionId: pick(r, ['transaction_id', '交易单号']),
      status: pick(r, ['status', '状态']),
      note: pick(r, ['note', '备注']),
    }));
    if (rec) records.push(rec);
  });
  return records;
}

export async function parseBankPdf(
  file: File,
  kind: 'cmb_pdf' | 'abc_pdf',
  cachedText?: string,
): Promise<NormalizedRecord[]> {
  const text = cachedText ?? (await extractPdfText(file)).text;
  return parseBankPdfText(text, kind, file.name);
}

export function beginParseBatch(): void {
  resetIds();
}

export async function parseFile(file: File): Promise<{ kind: ImportFileKind; records: NormalizedRecord[] }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let sampleText = '';
  let pdfText = '';

  if (ext === 'csv') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      sampleText = iconv.decode(Buffer.from(bytes.slice(0, 8000)), 'gbk');
    } catch {
      sampleText = new TextDecoder().decode(bytes.slice(0, 8000));
    }
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', sheetRows: 20 });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    sampleText = XLSX.utils.sheet_to_csv(sheet);
  } else if (ext === 'pdf') {
    const extracted = await extractPdfText(file);
    pdfText = extracted.text;
    sampleText = extracted.text.slice(0, 12000);
  }

  const kind = detectFileKind(file.name, sampleText);
  let records: NormalizedRecord[] = [];

  switch (kind) {
    case 'wechat_excel':
      if (ext === 'csv') {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const text = iconv.decode(Buffer.from(bytes), 'gbk');
        records = parseWechatCsvText(text, file.name);
      } else {
        records = await parseWechatExcel(file);
      }
      break;
    case 'alipay_csv':
      records = await parseAlipayCsv(file);
      break;
    case 'cmb_pdf':
    case 'abc_pdf': {
      let pythonError = '';
      try {
        const pyRecords = await parseBankPdfViaPython(file);
        if (pyRecords && pyRecords.length > 0) {
          records = pyRecords;
          break;
        }
      } catch (e) {
        pythonError = e instanceof Error ? e.message : 'Python 解析失败';
      }
      try {
        records = await parseBankPdf(file, kind, pdfText);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'PDF 解析失败';
        throw new Error(pythonError ? `${msg}（${pythonError}）` : msg);
      }
      break;
    }
    case 'generic_csv':
      records = await parseGenericCsv(file);
      break;
    default:
      throw new Error(`不支持的文件格式：${file.name}，请上传微信 Excel / 支付宝 CSV / 招行或农行 PDF`);
  }

  return { kind, records };
}

export { resetIds };
