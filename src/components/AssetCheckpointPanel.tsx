import { calculateBalanceExpression } from '@/lib/balance-expression';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVaultData } from '@/hooks/useVaultData';
import { calculateTotals, formatCurrency, getToday, normalizeDebtBalance } from '@/lib/storage';

const inputStyle = { backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' };

export function AssetCheckpointPanel() {
  const { data, settings, sortedAccounts, saveAssetCheckpoint } = useVaultData();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [date, setDate] = useState(getToday());
  const [notice, setNotice] = useState('');
  const checkpoints = data.assetCheckpoints ?? [];
  const last = checkpoints.at(-1);
  const accounts = sortedAccounts.map(a => ({ ...a, balance: draft
    ? draft[a.id]?.trim() ? (() => { const result = calculateBalanceExpression(draft[a.id]); return result.success ? normalizeDebtBalance(a.type, result.value) : null; })() : null
    : a.balance }));
  const valid = accounts.length > 0 && accounts.every(a => a.balance !== null && Number.isFinite(a.balance));
  const missing = accounts.filter(a => a.balance === null || !Number.isFinite(a.balance));
  const previous = checkpoints.filter(c => c.date <= date).at(-1);
  const preview = calculateTotals({ ...data, accounts }, settings);

  const start = () => {
    setDraft(Object.fromEntries(sortedAccounts.map(a => [a.id, a.balance === null ? '' : String(a.type === 'debt' ? Math.abs(a.balance) : a.balance)])));
    setNote(''); setError(''); setDate(getToday()); setNotice('');
  };
  const save = () => {
    try {
      saveAssetCheckpoint(accounts, note, date);
      setNotice(date < getToday() ? `已补录 ${date} 的历史盘点，当前账户余额未改变。` : `已保存 ${date} 的盘点节点。`);
      setDraft(null); setNote(''); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
  };

  return <section className="vault-card space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold vault-heading">资产盘点 · 保留每一个节点</h2>
        <p className="text-xs vault-muted mt-1">{last ? `上次盘点 ${last.date} · ${checkpoints.length} 个节点` : '先保存第一次盘点，以后每隔一两个月更新一次。'} · 修改账户不会覆盖历史</p>
      </div>
      {!draft && <button type="button" onClick={start} disabled={!sortedAccounts.length} className="px-4 py-2 rounded-lg text-xs text-white vault-btn-primary disabled:opacity-40">{last ? '开始新盘点' : '保存首次盘点'}</button>}
    </div>
    {notice && <p role="status" className="text-xs vault-heading">{notice}</p>}
    {draft && <div className="space-y-3">
      <label className="flex flex-wrap items-center gap-3 text-xs vault-heading">盘点日期<input aria-label="盘点日期" type="date" max={getToday()} value={date} onChange={e => setDate(e.target.value)} onInput={e => setDate(e.currentTarget.value)} className="rounded-lg border px-3 py-2" style={inputStyle} /></label>
      <p className="text-xs vault-muted">填写所选日期的实际余额；负债填欠款金额。余额未知时请先核实，只有实际为零才填 0。</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {sortedAccounts.map(a => <label key={a.id} className="flex items-center justify-between gap-2 text-xs vault-heading">
          <span>{a.name} · {a.currency ?? 'CNY'}{a.type === 'debt' ? ' 欠款' : ''}</span>
          <span className="text-right"><input aria-label={`${a.name}盘点余额`} aria-invalid={missing.some(m => m.id === a.id)} type="text" placeholder="如 1000+200-35.5" value={draft[a.id] ?? ''} onChange={e => { const value = e.target.value; setDraft(d => ({ ...d, [a.id]: value })); setError(''); }} className="w-36 rounded-lg border px-3 py-2 font-mono" style={inputStyle} />
          {draft[a.id]?.trim() && <span className="block text-[10px] mt-1 vault-muted">{(() => { const result = calculateBalanceExpression(draft[a.id]); return result.success ? `= ${formatCurrency(result.value, a.currency ?? 'CNY')}` : result.error; })()}</span>}</span>
        </label>)}
      </div>
      <p className="text-sm vault-heading">本次净资产：{valid ? formatCurrency(preview.netWorth, settings.baseCurrency) : '请补全余额'}{valid && previous && previous.baseCurrency === settings.baseCurrency ? ` · 较前一节点 ${formatCurrency(preview.netWorth - previous.netWorth, settings.baseCurrency)}` : ''}</p>
      {missing.length > 0 && <p className="text-xs" style={{ color: 'var(--vault-red)' }}>余额为空或算式未完成：{missing.map(a => a.name).join('、')}。补全后才能保存，不会自动当作零。</p>}
      <input aria-label="盘点备注" value={note} onChange={e => setNote(e.target.value)} placeholder="盘点备注，例如：投资上涨、补记账户、工资结余" className="w-full rounded-lg border px-3 py-2 text-xs" style={inputStyle} />
      <p className="text-xs vault-muted">{date < getToday() ? '这是补录历史盘点，只新增历史节点，不改当前账户余额。填写的是所选日期的金额，而不是今天的金额。' : '今天的盘点保存后会同步当前账户余额。每次保存新增节点，同一天也分别保留。'}</p>
      {error && <p role="alert" className="text-xs" style={{ color: 'var(--vault-red)' }}>{error}</p>}
      <div className="flex gap-3"><button type="button" onClick={save} className="px-4 py-2 rounded-lg text-xs text-white vault-btn-primary disabled:opacity-40">确认保存盘点</button><button type="button" onClick={() => setDraft(null)} className="text-xs vault-muted">取消</button></div>
    </div>}
    {checkpoints.length > 0 && <div className="space-y-2">
      {[...checkpoints].reverse().map(c => <details key={c.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--vault-input-bg)' }}>
        <summary className="cursor-pointer text-xs vault-heading">{c.date} {new Date(c.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · 净资产 {formatCurrency(c.netWorth, c.baseCurrency)}{c.balanceApplied === false ? ' · 历史补录' : ''}{c.note ? ` · ${c.note}` : ''}</summary>
        <div className="mt-3 space-y-2 text-xs vault-muted">
          <p>资产 {formatCurrency(c.totalAssets, c.baseCurrency)} · 负债 {formatCurrency(c.totalDebt, c.baseCurrency)}</p>
          {c.previousId && <><p>期间已记录收入 {formatCurrency(c.intervalIncome, c.baseCurrency)} · 支出 {formatCurrency(c.intervalExpense, c.baseCurrency)}</p><p>待解释差额：{formatCurrency(c.unexplainedChange ?? 0, c.baseCurrency)}。可能来自投资、汇率、账户增减或漏记账；不计作收入。</p><p>核对起点：{checkpoints.find(p => p.id === c.previousId)?.date ?? '原盘点节点'}。按保存时已记录的流水核对；新补账可在区间分析中查看，不改写此节点。</p></>}
          {c.accounts.map(a => <div key={a.id} className="flex justify-between"><span>{a.name}</span><span>{formatCurrency(a.balance ?? 0, a.currency ?? 'CNY')}</span></div>)}
          <p>基准币种 {c.baseCurrency} · 汇率按本次盘点保存。</p>
        </div>
      </details>)}
    </div>}
    {!!data.legacyAssetSnapshots?.length && <details className="rounded-lg p-3 space-y-3" style={{ backgroundColor: 'var(--vault-input-bg)' }}>
      <summary className="cursor-pointer text-xs vault-heading">查看旧版记录 · {data.legacyAssetSnapshots.length} 条估算趋势</summary>
      <p className="text-xs vault-muted">这些是旧版保存的汇总／倒推数值，不是逐次账户修改记录。保留供参考，不混入真实盘点曲线；旧数据未留存的明细和币种不能据此还原。</p>
      <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead><tr><th>日期</th><th>净资产原始数值</th><th>总资产原始数值</th><th>负债原始数值</th></tr></thead><tbody>{data.legacyAssetSnapshots.map((s, i) => <tr key={i}>{[s.date, s.netWorth, s.totalAssets, s.totalDebt].map((value, j) => <td className="py-2" key={j}>{typeof value === 'number' ? Number.isFinite(value) ? value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '--' : value ?? '--'}</td>)}</tr>)}</tbody></table></div>
    </details>}
    <div className="flex gap-4 text-xs"><Link className="underline" to="/trends">查看节点变化与未来规划</Link><Link className="underline" to="/transactions">记录或导入期间收支</Link></div>
  </section>;
}
