import type { Account, Transaction } from '@/types';
import { generateId, getToday } from '@/lib/storage';
import type {
  AccountMappingContext,
  FileParseResult,
  ImportEngineResult,
  ImportFileKind,
  NormalizedRecord,
} from './types';
import { buildLifeGameSnapshot, buildSpendingInsights, smartClassify } from './analytics';
import { dedupeKey, deduplicateRecords, filterBankAgainstExisting } from './dedup';
import { beginParseBatch, parseFile } from './parsers';
import { parseBankJsonText } from './bank-json-import';

const KIND_LABELS: Record<ImportFileKind, string> = {
  wechat_excel: '微信账单',
  alipay_csv: '支付宝账单',
  cmb_pdf: '招商银行流水',
  abc_pdf: '农业银行流水',
  generic_csv: '通用 CSV',
  unknown: '未知格式',
};

export function getImportKindLabel(kind: ImportFileKind): string {
  return KIND_LABELS[kind];
}

function findAccount(accounts: Account[], keywords: string[], exclude?: string[]): Account | undefined {
  return accounts.find(a => {
    if (exclude?.some(ex => a.name.includes(ex))) return false;
    return keywords.some(kw => a.name.includes(kw));
  });
}

function resolveAccountId(record: NormalizedRecord, accounts: Account[]): string {
  const { source, sourceFile } = record;
  const fileName = sourceFile.toLowerCase();

  if (source === 'alipay' || /基金/.test(sourceFile)) {
    if (/基金/.test(sourceFile) || fileName.includes('fund')) {
      return findAccount(accounts, ['支付宝基金', '基金'], ['余额宝'])?.id
        ?? accounts.find(a => a.type === 'investment')?.id
        ?? '';
    }
    const alipay = accounts.find(a => a.name.includes('支付宝') && !a.name.includes('基金'));
    if (alipay) return alipay.id;
  }

  const map: Partial<Record<NormalizedRecord['source'], string[]>> = {
    wechat: ['微信'],
    alipay: ['支付宝'],
    cmb: ['招商', '招行'],
    abc: ['农业', '农行'],
    icbc: ['工商', '工行'],
  };
  const keywords = map[source] ?? [];
  for (const kw of keywords) {
    const hit = accounts.find(a => a.name.includes(kw) && !a.name.includes('基金'));
    if (hit) return hit.id;
  }
  return accounts.find(a => a.type === 'cash')?.id ?? accounts[0]?.id ?? '';
}

export function recordsToTransactions(
  records: NormalizedRecord[],
  ctx: AccountMappingContext,
): {
  transactions: Omit<Transaction, 'id' | 'createdAt'>[];
  skippedExactDuplicate: number;
  skippedNoAccount: number;
} {
  const existingKeys = new Set(
    ctx.existing.map(t => dedupeKey(t.date, t.amount, t.type, t.description, t.accountId)),
  );
  const transactions: Omit<Transaction, 'id' | 'createdAt'>[] = [];
  let skippedExactDuplicate = 0;
  let skippedNoAccount = 0;

  records.forEach(r => {
    const accountId = resolveAccountId(r, ctx.accounts);
    if (!accountId) {
      skippedNoAccount++;
      return;
    }
    const category = r.presetCategory ?? smartClassify(r);
    const description = r.counterparty || r.product || r.type;
    const tx = {
      date: r.time.slice(0, 10),
      amount: r.amount,
      type: r.direction,
      category,
      accountId,
      description,
      source: 'csv' as const,
    };
    const key = dedupeKey(tx.date, tx.amount, tx.type, tx.description, tx.accountId);
    if (existingKeys.has(key)) {
      skippedExactDuplicate++;
      return;
    }
    existingKeys.add(key);
    transactions.push(tx);
  });

  return { transactions, skippedExactDuplicate, skippedNoAccount };
}

export function transactionsToEntities(items: Omit<Transaction, 'id' | 'createdAt'>[]): Transaction[] {
  const today = getToday();
  return items.map(t => ({ ...t, id: generateId(), createdAt: today }));
}

function finalizeImport(records: NormalizedRecord[], fileResults: FileParseResult[], ctx: AccountMappingContext): ImportEngineResult {
  const dedup = deduplicateRecords(records);
  const againstExisting = filterBankAgainstExisting(dedup.kept, ctx.existing, ctx.accounts);
  const finalRecords = againstExisting.kept;
  const mapped = recordsToTransactions(finalRecords, ctx);

  return {
    files: fileResults,
    allRecords: records,
    dedup,
    transactions: mapped.transactions,
    skippedExisting: againstExisting.skipped + mapped.skippedExactDuplicate,
    skippedWalletOverlap: againstExisting.skipped,
    skippedExactDuplicate: mapped.skippedExactDuplicate,
    skippedNoAccount: mapped.skippedNoAccount,
    spendingInsights: buildSpendingInsights(finalRecords),
    gameSnapshot: buildLifeGameSnapshot(finalRecords),
  };
}

export async function runImportEngine(
  files: File[],
  ctx: AccountMappingContext,
): Promise<ImportEngineResult> {
  const fileResults: FileParseResult[] = [];
  const allRecords: NormalizedRecord[] = [];

  beginParseBatch();
  for (const file of files) {
    try {
      const { kind, records } = await parseFile(file);
      fileResults.push({ kind, fileName: file.name, records, errors: [] });
      allRecords.push(...records);
    } catch (e) {
      fileResults.push({
        kind: 'unknown',
        fileName: file.name,
        records: [],
        errors: [e instanceof Error ? e.message : '解析失败'],
      });
    }
  }

  return finalizeImport(allRecords, fileResults, ctx);
}

export function runBankJsonImport(text: string, fileName: string, ctx: AccountMappingContext): ImportEngineResult {
  beginParseBatch();
  const records = parseBankJsonText(text, fileName);
  const fileResults: FileParseResult[] = [{
    kind: 'generic_csv',
    fileName,
    records,
    errors: [],
  }];
  return finalizeImport(records, fileResults, ctx);
}

export function runBankJsonImportFromRecords(
  records: NormalizedRecord[],
  fileName: string,
  ctx: AccountMappingContext,
): ImportEngineResult {
  beginParseBatch();
  const fileResults: FileParseResult[] = [{
    kind: 'generic_csv',
    fileName,
    records,
    errors: [],
  }];
  return finalizeImport(records, fileResults, ctx);
}

export { parseAlipayCsvText, parseWechatCsvText } from './parsers';
export type { ImportEngineResult, DuplicatePair, SpendingInsight, LifeGameSnapshot } from './types';
export { IMPORT_STEPS } from './types';
