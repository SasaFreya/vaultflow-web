import { useState } from 'react';
import { useVaultData } from '@/hooks/useVaultData';
import { LabeledPieChart } from '@/components/LabeledPieChart';
import { convertToBase, formatCurrency } from '@/lib/storage';

const typeLabels = { cash: '流动资产', investment: '投资资产', fixed: '固定资产', debt: '负债' };
const palette = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6', '#F97316', '#64748B'];

export function AssetComposition() {
  const { data, settings } = useVaultData();
  const [source, setSource] = useState('current');
  const [mode, setMode] = useState<'assets' | 'debt'>('assets');
  const [group, setGroup] = useState<'account' | 'type'>('account');
  const node = data.assetCheckpoints?.find(c => c.id === source);
  const accounts = node?.accounts ?? data.accounts;
  const rates = node ? { ...settings, baseCurrency: node.baseCurrency, exchangeRates: node.exchangeRates } : settings;
  const selectedAccounts = accounts.filter(a => mode === 'debt' ? a.type === 'debt' : a.type !== 'debt');
  const unknown = selectedAccounts.filter(a => a.balance === null).length;
  const negative = mode === 'assets' ? selectedAccounts.filter(a => a.balance !== null && a.balance < 0).length : 0;
  const groups = new Map<string, { name: string; value: number; color: string }>();
  selectedAccounts.forEach((account, index) => {
    if (account.balance === null) return;
    const value = convertToBase(mode === 'debt' ? Math.abs(account.balance) : account.balance, account.currency ?? 'CNY', rates);
    if (!Number.isFinite(value) || value <= 0) return;
    const key = group === 'account' ? account.id : account.type;
    const old = groups.get(key);
    groups.set(key, { name: group === 'account' ? account.name : typeLabels[account.type], value: (old?.value ?? 0) + value, color: old?.color ?? (group === 'account' ? account.color : undefined) ?? palette[index % palette.length] });
  });
  const segments = [...groups.values()].sort((a, b) => b.value - a.value);
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const controlStyle = { backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' };
  return <section className="vault-card space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold vault-heading">资产构成</h2><p className="text-xs vault-muted mt-1">查看当前余额，或切换到以前的盘点节点比较占比。</p></div>
      <select aria-label="资产构成数据日期" value={node?.id ?? 'current'} onChange={e => setSource(e.target.value)} className="rounded-lg border px-3 py-2 text-xs" style={controlStyle}><option value="current">当前账户余额</option>{[...(data.assetCheckpoints ?? [])].reverse().map(c => <option key={c.id} value={c.id}>{c.date} · {c.note || '资产盘点'}</option>)}</select>
    </div>
    <div className="flex flex-wrap gap-4 text-xs">
      <div role="group" aria-label="构成范围" className="flex gap-2">{([['assets', '资产分布'], ['debt', '负债分布']] as const).map(([value, title]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className="rounded-lg px-3 py-2" style={{ backgroundColor: mode === value ? 'var(--vault-nav-active-bg)' : 'var(--vault-input-bg)', color: 'var(--vault-text)' }}>{title}</button>)}</div>
      <div role="group" aria-label="构成分组" className="flex gap-2">{([['account', '按账户'], ['type', '按类别']] as const).map(([value, title]) => <button key={value} type="button" aria-pressed={group === value} onClick={() => setGroup(value)} className="rounded-lg px-3 py-2" style={{ backgroundColor: group === value ? 'var(--vault-nav-active-bg)' : 'var(--vault-input-bg)', color: 'var(--vault-text)' }}>{title}</button>)}</div>
    </div>
    <div className="grid md:grid-cols-2 gap-6 items-center">
      <LabeledPieChart data={segments} currency={rates.baseCurrency} height={280} innerRadius={65} outerRadius={100} showLabels={false} />
      <div className="space-y-3"><div><p className="text-xs vault-muted">{mode === 'assets' ? '已知正资产合计' : '已知负债合计'} · {rates.baseCurrency}</p><p className="text-2xl font-mono font-semibold vault-heading mt-1">{formatCurrency(total, rates.baseCurrency)}</p></div>
        {segments.map((segment, index) => <div key={index} className="flex items-center gap-2 text-xs vault-heading"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: segment.color }} /><span className="flex-1">{segment.name}</span><span className="font-mono">{formatCurrency(segment.value, rates.baseCurrency)}</span><span className="w-12 text-right vault-muted">{(segment.value / total * 100).toFixed(1)}%</span></div>)}
        {!segments.length && <p className="text-xs vault-muted">没有可展示的{mode === 'assets' ? '正资产' : '负债'}余额。</p>}
      </div>
    </div>
    <p className="text-xs vault-muted">{node ? '按这次盘点保存的余额及汇率展示。' : '按当前账户余额和设置汇率展示，不代表新增了盘点。'}资产与负债分别计算占比；零余额不占扇区。{unknown > 0 ? `有 ${unknown} 个账户余额未知，未计入。` : ''}{negative > 0 ? `有 ${negative} 个资产账户为负余额，未放入饼图，净资产仍应以总览为准。` : ''}</p>
  </section>;
}
