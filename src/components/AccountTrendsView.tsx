import { Link, useSearchParams } from 'react-router-dom';
import { useVaultData } from '@/hooks/useVaultData';
import { AccountBalanceTrend } from '@/components/AccountBalanceTrend';

export function AccountTrendsView() {
  const { data } = useVaultData();
  const [params, setParams] = useSearchParams();
  const accounts = new Map((data.assetCheckpoints ?? []).flatMap(c => c.accounts).map(a => [a.id, a]));
  data.accounts.forEach(a => accounts.set(a.id, a));
  (data.accountBalanceHistory ?? []).forEach(p => { if (!accounts.has(p.accountId)) accounts.set(p.accountId, { id: p.accountId, name: '历史账户', type: p.accountType, currency: p.currency, balance: p.balance, createdAt: p.date, updatedAt: p.date }); });
  const filter = accounts.has(params.get('account') ?? '') ? params.get('account')! : 'all';
  const visible = [...accounts.values()].filter(a => filter === 'all' || a.id === filter);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs vault-muted">每个账户独立展示历次余额，不会混合不同币种。保存余额后，节点会出现在这里。</p><select aria-label="筛选账户趋势" value={filter} onChange={e => { const value = e.target.value; setParams(previous => { const next = new URLSearchParams(previous); if (value === 'all') next.delete('account'); else next.set('account', value); return next; }); }} className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}><option value="all">全部账户（{accounts.size}）</option>{[...accounts.values()].map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
    {!visible.length && <div className="vault-card text-xs vault-muted">还没有账户。<Link className="underline" to="/accounts">去填写余额</Link></div>}
    <div className="grid lg:grid-cols-2 gap-4">{visible.map(account => <section key={account.id} className="vault-card !px-0"><div className="px-4 mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold vault-heading">{account.name}</h2><span className="text-xs vault-muted">{data.accounts.some(a => a.id === account.id) ? account.type === 'debt' ? '欠款变化' : '余额变化' : '已移除账户'}</span></div><AccountBalanceTrend accountId={account.id} /></section>)}</div>
    <Link to="/accounts" className="inline-block text-xs underline vault-muted">去账户页更新余额 →</Link>
  </div>;
}
