import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const directory = await mkdtemp(join(tmpdir(), 'vaultflow-finance-'));
try {
  const outfile = join(directory, 'finance.mjs');
  await build({ stdin: { contents: "export * from './src/lib/storage'; export * from './src/lib/asset-checkpoints'; export * from './src/lib/forecast'; export * from './src/lib/account-balance-history'; export * from './src/lib/balance-expression'; export * from './src/lib/calendar-projection';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile });
  const f = await import(pathToFileURL(outfile));
  const settings = { baseCurrency: 'CNY', exchangeRates: { CNY: 1, USD: 7.25, HKD: .93, EUR: 7.85, JPY: .048 } };
  const account = { id: 'cash', name: '银行', type: 'cash', balance: 50000, currency: 'CNY', createdAt: f.getToday(), updatedAt: f.getToday() };
  let data = { ...f.createEmptyAppData(), accounts: [account] };
  const first = f.createCheckpoint(data, data.accounts, settings, '首次');
  data = { ...data, assetCheckpoints: [first] };
  const before = JSON.stringify(first);
  const tx = { id: 'income', date: f.getToday(), amount: 6000, type: 'income', accountId: 'cash', category: '工资', description: '', createdAt: f.getToday(), source: 'manual' };
  data.transactions = [tx];
  assert.equal(f.shouldReverseTransaction(data, 'income'), true);
  const second = f.createCheckpoint(data, [{ ...account, balance: 58000 }], settings, '投资上涨');
  assert.equal(second.intervalIncome, 6000);
  assert.equal(second.unexplainedChange, 2000);
  data = { ...data, accounts: second.accounts, assetCheckpoints: [first, second] };
  assert.equal(f.shouldReverseTransaction(data, 'income'), false);
  assert.equal(f.shouldReverseTransaction({ ...data, transactions: [{ ...tx, id: 'csv', source: 'csv' }] }, 'csv'), false);
  const synced = f.fullSyncData(data, { ...settings, exchangeRates: { ...settings.exchangeRates, USD: 8 } });
  assert.equal(JSON.stringify(synced.assetCheckpoints[0]), before);
  assert.equal(synced.assetSnapshots.length, 2, 'same-day inventories remain distinct');
  assert.equal(f.validateAppData(JSON.parse(JSON.stringify(synced))).data.assetCheckpoints.length, 2);
  assert.equal(f.validateAppData({ ...synced, assetCheckpoints: [{ ...first, netWorth: 'bad' }] }).success, false);
  assert.throws(() => f.createCheckpoint(data, [{ ...account, balance: null }], settings, ''));
  assert.throws(() => f.createCheckpoint(data, data.accounts, { ...settings, baseCurrency: 'USD' }, ''));
  const old = { ...f.createEmptyAppData(), assetSnapshots: [{ date: '2025-01', netWorth: 123 }] };
  const migrated = f.fullSyncData(old, settings);
  assert.equal(migrated.assetSnapshots.length, 0);
  assert.equal(f.fullSyncData(migrated).legacyAssetSnapshots[0].netWorth, 123);
  const event = { id: 'e', name: '计划', amount: 1200, type: 'income', frequency: 'yearly', startDate: '2026-12-15', enabled: true };
  assert.deepEqual(f.plannedCashFlow([event], '2026-11-03', '2026-12-31'), { income: 1200, expense: 0 });
  assert.equal(f.plannedCashFlow([{ ...event, frequency: 'daily', amount: 10, startDate: '2026-11-10', endDate: '2026-11-12' }], '2026-11-03', '2026-11-30').income, 30);
  assert.equal(f.plannedCashFlow([{ ...event, frequency: 'weekly', amount: 10, startDate: '2026-11-03' }], '2026-11-03', '2026-11-30').income, 30);
  assert.equal(f.plannedCashFlow([{ ...event, frequency: 'monthly', startDate: '2026-01-31' }], '2026-02-01', '2026-02-28').income, 1200);
  assert.equal(f.plannedCashFlow([{ ...event, frequency: 'once', startDate: '2026-11-03' }], '2026-11-03', '2026-11-30').income, 0, 'today is already the balance anchor');
  const plan = f.computePlanningTimeline(100, [{ ...event, frequency: 'once', type: 'expense', amount: 200, startDate: '2026-11-10' }], 3, '2026-11-03');
  assert.equal(plan.at(-1).netWorth, -100);
  assert.equal(plan.length, 4);
  const expressionCases = [['1000+200-35.5', 1164.5], ['0.1+0.2', 0.3], ['(100-20)+5', 85], ['-10+3', -7], ['10＋20－5', 25]];
  for (const [input, expected] of expressionCases) assert.deepEqual(f.calculateBalanceExpression(input), { success: true, value: expected });
  for (const input of ['', '100+', '1.234', '1/0', 'Infinity', 'alert(1)', '(1+2', '1e8']) assert.equal(f.calculateBalanceExpression(input).success, false, input);
  const baseData = { ...f.createEmptyAppData(), accounts: [account] };
  const historyData = f.recordAccountUpdate(baseData, account.id, { balance: 51000 });
  assert.equal(f.accountBalanceSeries(historyData, account.id).length, 2, 'old balance is retained before first update');
  assert.equal(f.accountBalanceSeries(historyData, account.id)[0].balance, 50000);
  assert.equal(historyData.accounts[0].balance, 51000);
  const olderDate = '2026-01-01';
  const backfilled = f.recordAccountUpdate(historyData, account.id, { balance: 20000 }, olderDate);
  assert.equal(backfilled.accounts[0].balance, 51000, 'backfilling never replaces current balance');
  assert.equal(f.accountBalanceSeries(backfilled, account.id)[0].balance, 20000);
  assert.equal(f.validateAppData(JSON.parse(JSON.stringify(backfilled))).data.accountBalanceHistory.length, 3);
  const historicalInventory = f.addCheckpoint(data, [{ ...account, balance: 30000 }], settings, '补录', olderDate);
  assert.equal(historicalInventory.accounts[0].balance, data.accounts[0].balance);
  assert.equal(historicalInventory.assetCheckpoints[0].date, olderDate);
  assert.equal(JSON.stringify(historicalInventory.assetCheckpoints.at(-1)), JSON.stringify(second));
  const comparison = f.compareCheckpoints(data, first, second);
  assert.equal(comparison.change, 8000);
  assert.equal(comparison.income, 6000);
  assert.equal(comparison.unexplained, 2000);
  const calendarEvents = [
    { id: 'salary', title: '工资', date: '2026-11-10', type: 'salary', amount: 6000, recurring: true },
    { id: 'rent', title: '房租', date: '2026-11-15', type: 'expense', amount: 2000, recurring: true },
    { id: 'repay', title: '还款本金', date: '2026-11-20', type: 'repayment', amount: 1000, recurring: false },
    { id: 'today', title: '今日已发生', date: '2026-11-04', type: 'expense', amount: 5000, recurring: false },
    { id: 'remind', title: '提醒', date: '2026-11-12', type: 'reminder', amount: 999, recurring: false },
  ];
  const frozenCalendar = JSON.stringify(calendarEvents);
  const calendarPlan = f.computeCalendarPlanningTimeline(10000, calendarEvents, 2, '2026-11-04');
  assert.equal(calendarPlan[0].netWorth, 10000);
  assert.equal(calendarPlan.find(p => p.date === '2026-11-10').netWorth, 16000);
  assert.equal(calendarPlan.find(p => p.date === '2026-11-30').netWorth, 14000);
  assert.equal(calendarPlan.at(-1).netWorth, 18000);
  assert.equal(calendarPlan.at(-1).cashDelta, 7000);
  assert.equal(calendarPlan.at(-1).repayment, 1000);
  assert.equal(f.calendarEventDelta(calendarEvents[2]), 0);
  assert.equal(JSON.stringify(calendarEvents), frozenCalendar);
  assert.equal(f.computeCalendarPlanningTimeline(10, [{ ...calendarEvents[0], date: '2027-01-10' }], 2, '2026-11-04').at(-1).netWorth, 10);
  const monthEndSalary = f.computeCalendarPlanningTimeline(0, [{ ...calendarEvents[0], date: '2026-01-31', amount: 100 }], 1, '2026-02-01');
  assert.equal(monthEndSalary.at(-1).income, 100);
  console.log('Finance regression checks passed: immutable inventories, reconciliation, ledger reversal, migration/import, calendar-accurate planning.');
} finally { await rm(directory, { recursive: true, force: true }); }
