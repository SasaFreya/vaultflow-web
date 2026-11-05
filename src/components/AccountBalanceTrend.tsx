import { TrendEndpoint, TrendDateTick } from '@/components/TrendEndpoint';
import { formatTrendAxis } from '@/lib/trend-axis';
import { useChartHeight } from '@/hooks/use-mobile';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useVaultData } from '@/hooks/useVaultData';
import { useChartTheme } from '@/hooks/useChartTheme';
import { accountBalanceSeries } from '@/lib/account-balance-history';
import { formatCurrency } from '@/lib/storage';
import type { CurrencyCode } from '@/types';

export function AccountBalanceTrend({ accountId, compact = false }: { accountId: string; compact?: boolean }) {
  const { data } = useVaultData();
  const theme = useChartTheme();
  const chartHeight = useChartHeight(220, 220);
  const series = accountBalanceSeries(data, accountId);
  const [selected, setSelected] = useState<CurrencyCode | ''>('');
  const currencies = [...new Set(series.map(p => p.currency))];
  const currency = selected && currencies.includes(selected) ? selected : series.at(-1)?.currency ?? 'CNY';
  const points = series.filter(p => p.currency === currency).map((p, index) => ({ ...p, key: String(index), value: p.accountType === 'debt' ? Math.abs(p.balance) : p.balance }));
  const latest = points.at(-1);
  const previous = points.at(-2);
  const first = points[0];
  const money = (value: number) => formatCurrency(value, currency);
  const sourceLabel = (source: string) => source === 'baseline' ? '更新前保留的余额（日期不是历史盘点日）' : source === 'inventory' ? '整体盘点' : '账户余额节点';
  if (!series.length) return <p className="text-[10px] vault-muted px-4 pb-3">保存一次余额后开始记录账户趋势；整体盘点中的该账户记录也会显示在这里。</p>;
  return <div className="px-4 pb-3 space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[10px] vault-muted">余额趋势 · {points.length} 个节点{latest ? ` · 最新 ${latest.date}` : ''}{previous && latest ? ` · 较上次 ${money(latest.value - previous.value)}` : ''}</p>
      {currencies.length > 1 && <select aria-label="账户趋势币种" value={currency} onChange={e => setSelected(e.target.value as CurrencyCode)} className="text-xs rounded" style={{ backgroundColor: 'var(--vault-input-bg)', color: 'var(--vault-text)' }}>{currencies.map(c => <option key={c}>{c}</option>)}</select>}
    </div>
    <ResponsiveContainer width="100%" height={compact ? 64 : chartHeight}><LineChart data={points} margin={{ top: compact ? 8 : 28, bottom: compact ? 0 : 8, left: compact ? 5 : 0, right: 14 }}>
      {!compact && <CartesianGrid strokeDasharray="4 5" vertical={false} stroke={theme.gridStroke} />}
      <XAxis dataKey="key" hide={compact} ticks={points.length > 1 ? ['0', String(points.length - 1)] : ['0']} tick={({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) => <TrendDateTick x={x} y={y} label={points[Number(payload?.value)]?.date.replace(/-/g, '.') ?? ''} end={Number(payload?.value) === points.length - 1} color={theme.axisStroke} />} interval={0} padding={{ left: 5, right: 5 }} tickLine={false} axisLine={false} fontSize={10} stroke={theme.axisStroke} />
      <YAxis hide={compact} domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max) * 1.12 || 1]} tickCount={5} tickFormatter={formatTrendAxis} tickLine={false} axisLine={false} fontSize={10} stroke={theme.axisStroke} width={65} />
      <Tooltip labelFormatter={key => { const p = points[Number(key)]; return p ? `${p.date} · ${sourceLabel(p.source)}` : ''; }} formatter={value => money(Number(value))} contentStyle={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, borderRadius: 8 }} />
      <Line type="linear" dataKey="value" name="余额" stroke={theme.primary} strokeWidth={2} activeDot={{ r: 5 }} dot={({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
        if (index === undefined || compact || (index !== 0 && index !== points.length - 1)) return <g />;
        return <TrendEndpoint cx={cx} cy={cy} label={money(points[index].value)} color={theme.primary} end={index === points.length - 1} />;
      }} isAnimationActive={false} />
    </LineChart></ResponsiveContainer>
    {!compact && latest && first && <>
      <p className="text-xs vault-muted">较最早节点：{money(latest.value - first.value)}{latest.accountType === 'debt' ? ' · 负债展示欠款金额' : ''}</p>
      <details className="text-xs"><summary className="cursor-pointer vault-heading">查看历次余额</summary><p className="vault-muted mt-2">每次保存余额新增节点；连线表示节点间变化，不代表每天的实际余额。</p><div className="mt-2 space-y-2">{[...points].reverse().map(p => <p key={p.id} className="flex flex-wrap justify-between gap-2 vault-muted"><span>{p.date} · {sourceLabel(p.source)}{p.note ? ` · ${p.note}` : ''}</span><span>{money(p.value)}</span></p>)}</div></details>
    </>}
  </div>;
}
