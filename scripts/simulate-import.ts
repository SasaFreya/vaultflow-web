import { readFileSync } from 'fs';
import { parseAbcPdfText, parseCmbPdfText } from '../src/lib/import-engine/bank-pdf';
import { deduplicateRecords, filterBankAgainstExisting, dedupeKey } from '../src/lib/import-engine/dedup';
import { smartClassify } from '../src/lib/import-engine/analytics';
import type { NormalizedRecord } from '../src/lib/import-engine/types';

const abcText = readFileSync('scripts/fixtures/abc-pdfjs.txt', 'utf-8');
const cmbText = readFileSync('scripts/fixtures/cmb-pdfjs.txt', 'utf-8');
const abc = parseAbcPdfText(abcText, 'abc.pdf');
const cmb = parseCmbPdfText(cmbText, 'cmb.pdf');
const all = [...abc, ...cmb];
console.log('parsed', abc.length, '+', cmb.length, '=', all.length);

const dedup = deduplicateRecords(all);
console.log('after dedup', dedup.kept.length, 'removed', dedup.removed.length);

const accounts = [
  { id: 'abc1', name: '农业银行储蓄卡', type: 'cash', balance: 0, currency: 'CNY' },
  { id: 'cmb1', name: '招商银行', type: 'cash', balance: 0, currency: 'CNY' },
];

// empty existing
let against = filterBankAgainstExisting(dedup.kept, [], accounts);
console.log('filter empty kept', against.kept.length);
const txsEmpty = recordsToTransactionsLocal(against.kept, { accounts, existing: [] });
console.log('transactions empty existing', txsEmpty.length);

// simulate re-import after previous bank import (same records in ledger)
const existing763 = dedup.kept.slice(0, Math.min(763, dedup.kept.length)).map((r, i) => ({
  date: r.time.slice(0, 10),
  amount: r.amount,
  type: r.direction,
  description: r.counterparty || r.product || r.type,
  accountId: 'abc1',
}));
against = filterBankAgainstExisting(dedup.kept, existing763, accounts);
console.log('filter vs bank existing kept', against.kept.length, 'skipped', against.skipped);

const txs = recordsToTransactionsLocal(against.kept, { accounts, existing: existing763 });
console.log('transactions', txs.length);

function recordsToTransactionsLocal(records: NormalizedRecord[], ctx: { accounts: typeof accounts; existing: typeof existing763 }) {
  const existingKeys = new Set(ctx.existing.map(t => dedupeKey(t.date, t.amount, t.type as 'income'|'expense', t.description, t.accountId)));
  const result = [];
  for (const r of records) {
    const map: Record<string, string[]> = { wechat: ['微信'], alipay: ['支付宝'], cmb: ['招商','招行'], abc: ['农业','农行'] };
    let accountId = '';
    for (const kw of map[r.source] ?? []) {
      const hit = ctx.accounts.find(a => a.name.includes(kw));
      if (hit) { accountId = hit.id; break; }
    }
    if (!accountId) accountId = ctx.accounts[0]?.id ?? '';
    if (!accountId) continue;
    const tx = { date: r.time.slice(0,10), amount: r.amount, type: r.direction, category: smartClassify(r), accountId, description: r.counterparty || r.product || r.type, source: 'csv' as const };
    const key = dedupeKey(tx.date, tx.amount, tx.type, tx.description, tx.accountId);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    result.push(tx);
  }
  return result;
}

const skippedExisting = against.kept.length - txs.length + against.skipped;
console.log('skippedExisting metric', skippedExisting);
