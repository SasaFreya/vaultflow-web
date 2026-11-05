import type { Account } from '@/types';
import type { DedupResult, DuplicatePair, NormalizedRecord } from './types';
import { extractCore } from './utils';

const BANK_SOURCES = new Set(['cmb', 'abc', 'icbc']);
const BANK_CARD_KEYWORDS = ['银行', '储蓄卡', '信用卡', '借记卡', '招行', '农行', '工行', '建行', '招商', '农业'];
const WEAK_BANK_TYPES = ['快捷支付', '银联快捷支付', '银联代付', '网联收款', '支付宝', '微信', '财付通'];

type ExistingTx = {
  date: string;
  amount: number;
  type: string;
  description: string;
  accountId: string;
};

function isBankCardPayment(record: NormalizedRecord): boolean {
  const payment = record.paymentMethod.toLowerCase();
  return BANK_CARD_KEYWORDS.some(k => payment.includes(k.toLowerCase()));
}

function isBankRecord(record: NormalizedRecord): boolean {
  return BANK_SOURCES.has(record.source);
}

function isWalletAccount(accountId: string, accounts: Pick<Account, 'id' | 'name'>[]): boolean {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return false;
  return /微信|支付宝/.test(account.name) && !/基金/.test(account.name);
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a.slice(0, 10));
  const db = new Date(b.slice(0, 10));
  return Math.abs(Math.round((da.getTime() - db.getTime()) / 86400000));
}

function findMatches(record: NormalizedRecord, candidates: NormalizedRecord[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const recCore = extractCore(record.counterparty || record.product);

  for (const cand of candidates) {
    if (cand.id === record.id) continue;
    if (daysDiff(record.time, cand.time) > 1) continue;
    if (Math.abs(record.amount - cand.amount) > 0.5) continue;

    const candCore = extractCore(cand.counterparty || cand.product);
    const strongMatch =
      recCore.length >= 2 &&
      candCore.length >= 2 &&
      (recCore.includes(candCore.slice(0, 4)) || candCore.includes(recCore.slice(0, 4)));

    const weakMatch =
      isBankRecord(cand) && WEAK_BANK_TYPES.some(t => cand.type.includes(t) || cand.product.includes(t));

    if (strongMatch || weakMatch) {
      pairs.push({
        kept: record,
        removed: cand,
        matchType: strongMatch ? 'strong' : 'weak',
        reason: `日期差 ${daysDiff(record.time, cand.time)} 天，金额差 ${Math.abs(record.amount - cand.amount).toFixed(2)} 元`,
      });
    }
  }
  return pairs;
}

function sourcePriority(source: NormalizedRecord['source']): number {
  if (source === 'alipay') return 3;
  if (source === 'wechat') return 2;
  if (BANK_SOURCES.has(source)) return 1;
  return 0;
}

export function deduplicateRecords(allRecords: NormalizedRecord[]): DedupResult {
  const toRemove = new Set<number>();
  const pairs: DuplicatePair[] = [];

  const bankCardPayments = allRecords.filter(isBankCardPayment);
  const bankRecords = allRecords.filter(isBankRecord);

  for (const rec of bankCardPayments) {
    const matches = findMatches(rec, bankRecords);
    for (const match of matches) {
      if (toRemove.has(match.removed.id)) continue;
      toRemove.add(match.removed.id);
      pairs.push(match);
    }
  }

  for (let i = 0; i < allRecords.length; i++) {
    for (let j = i + 1; j < allRecords.length; j++) {
      const a = allRecords[i];
      const b = allRecords[j];
      if (toRemove.has(a.id) || toRemove.has(b.id)) continue;
      if (daysDiff(a.time, b.time) > 1) continue;
      if (Math.abs(a.amount - b.amount) > 0.01) continue;

      const aCore = extractCore(a.counterparty || a.product);
      const bCore = extractCore(b.counterparty || b.product);
      if (aCore.length < 2 || bCore.length < 2) continue;
      if (!(aCore.includes(bCore.slice(0, 4)) || bCore.includes(aCore.slice(0, 4)))) continue;

      const keep = sourcePriority(a.source) >= sourcePriority(b.source) ? a : b;
      const drop = keep.id === a.id ? b : a;
      if (!toRemove.has(drop.id)) {
        toRemove.add(drop.id);
        pairs.push({
          kept: keep,
          removed: drop,
          matchType: 'strong',
          reason: '同笔交易跨平台重复',
        });
      }
    }
  }

  const kept = allRecords.filter(r => !toRemove.has(r.id));
  const removed = allRecords.filter(r => toRemove.has(r.id));
  return { kept, removed, pairs };
}

export function dedupeKey(date: string, amount: number, type: 'income' | 'expense', description: string, accountId: string): string {
  return `${date}|${amount}|${type}|${description.slice(0, 20)}|${accountId}`;
}

/** 银行流水 vs 已有微信/支付宝账本：只与钱包账户下的记录比对 */
function matchesWalletLedger(record: NormalizedRecord, existing: ExistingTx): boolean {
  if (daysDiff(record.time, existing.date) > 1) return false;
  if (Math.abs(record.amount - existing.amount) > 0.5) return false;
  if (record.direction !== existing.type) return false;

  const recCore = extractCore(record.counterparty || record.product);
  const desc = existing.description.toLowerCase();
  if (recCore.length >= 2 && desc.includes(recCore.slice(0, 4).toLowerCase())) return true;

  const bankLooksLikeWallet = WEAK_BANK_TYPES.some(
    w => record.type.includes(w) || record.product.includes(w) || record.counterparty.includes(w),
  );
  if (!bankLooksLikeWallet) return false;

  return /微信|支付宝|财付通|tenpay|alipay/i.test(existing.description);
}

/** 分渠道多次导入时：跳过与已有微信/支付宝重复的银行流水（不与银行账本自身比对） */
export function filterBankAgainstExisting(
  records: NormalizedRecord[],
  existing: ExistingTx[],
  accounts: Pick<Account, 'id' | 'name'>[],
): { kept: NormalizedRecord[]; skipped: number } {
  const walletExisting = existing.filter(t => isWalletAccount(t.accountId, accounts));
  if (walletExisting.length === 0) {
    return { kept: records, skipped: 0 };
  }

  let skipped = 0;
  const kept = records.filter(r => {
    if (!isBankRecord(r)) return true;
    const dup = walletExisting.some(t => matchesWalletLedger(r, t));
    if (dup) {
      skipped++;
      return false;
    }
    return true;
  });
  return { kept, skipped };
}
