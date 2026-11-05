import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVaultData } from '@/hooks/useVaultData';
import { compareCheckpoints } from '@/lib/asset-checkpoints';
import { convertToBase, formatCurrency } from '@/lib/storage';

export function CheckpointPeriodAnalysis() {
  const { data, settings } = useVaultData();
  const formId = useId();
  const nodes = data.assetCheckpoints ?? [];
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const endIndex = endId ? nodes.findIndex(n => n.id === endId) : nodes.length - 1;
  const end = nodes[endIndex];
  const start = nodes.slice(0, endIndex).find(n => n.id === startId) ?? nodes[endIndex - 1];
  const period = start && end ? compareCheckpoints(data, start, end) : null;
  const money = (n: number) => formatCurrency(n, end?.baseCurrency ?? settings.baseCurrency);
  const label = (n: typeof end) => `${n.date} · ${n.note || new Date(n.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  return <section className="vault-card space-y-4">
    <div><h2 className="text-sm font-semibold vault-heading">两个节点之间，资产怎样变化？</h2><p className="text-xs vault-muted mt-1">盘点提供实际资产变化；流水解释期间收支；剩余差额留待核对。</p></div>
    {nodes.length < 2 ? <p className="text-xs vault-muted">保存两次盘点后即可查看区间分析。<Link to="/accounts" className="underline">去盘点，也可以补录已核实的历史余额</Link></p> : <>
      <div className="flex flex-wrap gap-4 text-xs vault-heading">
        <label htmlFor={`${formId}-start`}>起点<select id={`${formId}-start`} value={start?.id ?? ''} onChange={e => setStartId(e.target.value)} className="ml-2 rounded-lg border px-3 py-2" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)' }}>{nodes.slice(0, endIndex).map(n => <option key={n.id} value={n.id}>{label(n)}</option>)}</select></label>
        <label htmlFor={`${formId}-end`}>终点<select id={`${formId}-end`} value={end?.id ?? ''} onChange={e => { setEndId(e.target.value); setStartId(''); }} className="ml-2 rounded-lg border px-3 py-2" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)' }}>{nodes.slice(1).map(n => <option key={n.id} value={n.id}>{label(n)}</option>)}</select></label>
      </div>
      {period && start && end ? <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
          ['资产实际变化', period.change], ['已记录收入', period.income], ['已记录支出', period.expense], ['收支结余', period.savings],
        ].map(([title, amount]) => <div key={title} className="rounded-lg p-3" style={{ backgroundColor: 'var(--vault-input-bg)' }}><p className="text-xs vault-muted">{title}</p><p className="text-lg font-mono vault-heading mt-1">{money(Number(amount))}</p></div>)}</div>
        <p className="text-sm vault-heading">待解释差额：{money(period.unexplained)}</p>
        <p className="text-xs vault-muted">实际变化 − 收支结余；可能包含投资、汇率、增减账户或漏记账，不自动认定为收入。共 {period.transactionCount} 条已记录流水。这里使用当前账单重新分析；补账后结果可更新，盘点原件保持不变。</p>
        <details className="text-xs space-y-3"><summary className="cursor-pointer vault-heading">查看各账户变化与支出分类</summary>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="vault-muted"><th>账户</th><th>起点余额</th><th>终点余额</th><th>折算变化 · {end.baseCurrency}</th></tr></thead><tbody>{[...new Set([...start.accounts.map(a => a.id), ...end.accounts.map(a => a.id)])].map(id => {
            const a = start.accounts.find(account => account.id === id);
            const b = end.accounts.find(account => account.id === id);
            const delta = convertToBase(b?.balance ?? 0, b?.currency ?? 'CNY', { ...settings, baseCurrency: end.baseCurrency, exchangeRates: end.exchangeRates }) - convertToBase(a?.balance ?? 0, a?.currency ?? 'CNY', { ...settings, baseCurrency: start.baseCurrency, exchangeRates: start.exchangeRates });
            return <tr key={id} className="vault-heading"><td className="py-2">{b?.name ?? a?.name}{!a ? '（新增）' : !b ? '（移除）' : ''}</td><td>{a ? formatCurrency(a.balance ?? 0, a.currency ?? 'CNY') : '--'}</td><td>{b ? formatCurrency(b.balance ?? 0, b.currency ?? 'CNY') : '--'}</td><td>{money(delta)}</td></tr>;
          })}</tbody></table></div>
          <p className="vault-muted">账户变化按各节点当时的汇率折算，可能包含汇率影响；负债用负值表示。</p>
          {period.categories.length ? period.categories.map(c => <p key={c.category} className="flex justify-between vault-heading"><span>{c.category}</span><span>{money(c.amount)}</span></p>) : <p className="vault-muted">这段时间尚无支出流水。</p>}
        </details>
      </> : <p className="text-xs vault-muted">两个节点的基准币种不同，不能直接比较金额。</p>}
    </>}
  </section>;
}
