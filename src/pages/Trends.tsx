import { computeCalendarPlanningTimeline } from '@/lib/calendar-projection';
import { TrendEndpoint, TrendDateTick } from '@/components/TrendEndpoint';
import { formatTrendAxis } from '@/lib/trend-axis';
import { useChartHeight } from '@/hooks/use-mobile';
import { AccountTrendsView } from '@/components/AccountTrendsView';
import { AssetComposition } from '@/components/AssetComposition';
import { CheckpointPeriodAnalysis } from '@/components/CheckpointPeriodAnalysis';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useVaultData } from '@/hooks/useVaultData';
import { useChartTheme } from '@/hooks/useChartTheme';
import { calculateTotals, formatCurrency, getToday } from '@/lib/storage';
import { computePlanningTimeline } from '@/lib/forecast';
import { ForecastEventsPanel } from '@/components/ForecastEventsPanel';

function OverviewTrends() {
  const { data, settings, monthlyData } = useVaultData();
  const [months, setMonths] = useState(6);
  const [showPlan, setShowPlan] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const theme = useChartTheme();
  const chartHeight = useChartHeight(280, 240);
  const checkpoints = data.assetCheckpoints ?? [];
  const latest = checkpoints.at(-1);
  const today = getToday();
  const currency = latest?.baseCurrency ?? settings.baseCurrency;
  const money = (n: number) => formatCurrency(n, currency);
  const estimate = calculateTotals(data, latest ? { ...settings, baseCurrency: currency, exchangeRates: latest.exchangeRates } : settings).netWorth;
  const currencyMatches = !latest || latest.baseCurrency === settings.baseCurrency;
  const plan = (latest || data.accounts.length > 0) && currencyMatches && showPlan ? computePlanningTimeline(estimate, data.forecastEvents ?? [], months, today) : [];
  const calendar = (latest || data.accounts.length > 0) && currencyMatches && showCalendar ? computeCalendarPlanningTimeline(estimate, data.calendarEvents, months, today) : [];
  const futureDates = [...new Set([...plan.map(p => p.date), ...calendar.map(p => p.date)])].sort();
  const chart = [
    ...checkpoints.map((c, i) => ({ key: `inventory-${i}`, label: c.date, actual: c.netWorth as number | null, forecast: null as number | null, calendar: null as number | null })),
    ...futureDates.map(date => ({ key: `future-${date}`, label: date, actual: null as number | null,
      forecast: showPlan ? [...plan].reverse().find(p => p.date <= date)?.netWorth ?? null : null,
      calendar: showCalendar ? [...calendar].reverse().find(p => p.date <= date)?.netWorth ?? null : null,
    })),
  ];
  const calendarFinal = calendar.at(-1);
  const final = plan.at(-1);
  return <div className="space-y-5">

    {!latest && <div className="vault-card text-sm vault-muted">还没有整体盘点节点。<Link to="/accounts" className="underline">保存首次盘点</Link>后可查看真实历史；也可以先打开预测开关，从当前已填写的账户余额出发估算。</div>}
    {(latest || data.accounts.length > 0) && <>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="vault-card"><p className="text-xs vault-muted">最近盘点 · {latest?.date ?? '尚未保存'}</p><p className="font-mono text-xl vault-heading mt-2">{latest ? money(latest.netWorth) : '--'}</p></div>
        <div className="vault-card"><p className="text-xs vault-muted">当前账户净资产 · 预测起点</p><p className="font-mono text-xl vault-heading mt-2">{money(estimate)}</p><p className="text-xs vault-muted mt-1">根据当前填写余额和已入账流水计算</p></div>
        <div className="vault-card"><p className="text-xs vault-muted">已保存整体盘点</p><p className="font-mono text-xl vault-heading mt-2">{checkpoints.length} 次</p><p className="text-xs vault-muted mt-1">打开下方预测开关，可比较未来变化</p></div>
      </div>
      <div className="vault-card space-y-3">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold vault-heading">真实趋势与预测</h2><select aria-label="规划月数" value={months} onChange={e => setMonths(Number(e.target.value))} className="rounded px-3 py-2 text-xs" style={{ backgroundColor: 'var(--vault-input-bg)', color: 'var(--vault-text)' }}>{[3, 6, 12].map(m => <option key={m} value={m}>{m} 个月（含本月剩余时间）</option>)}</select></div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs vault-heading">
          <span className="inline-flex items-center gap-2"><span className="w-5 h-0.5" style={{ backgroundColor: theme.accent }} />真实盘点（始终显示）</span>
          <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showCalendar} disabled={!currencyMatches} onChange={e => setShowCalendar(e.target.checked)} /><span className="w-5 border-t-2 border-dashed" style={{ borderColor: theme.yellow }} />显示现金流日历预测</label>
          <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showPlan} disabled={!currencyMatches} onChange={e => setShowPlan(e.target.checked)} /><span className="w-5 border-t-2 border-dashed" style={{ borderColor: theme.primary }} />显示手动收支计划预测</label>
          <Link className="underline vault-muted" to="/calendar">编辑现金流日历 →</Link>
        </div>
        {data.accounts.some(a => a.balance === null) && <p className="text-xs vault-muted">有账户余额尚未填写，预测起点仅包含已知余额。</p>}
        {!(showCalendar || showPlan) && <p className="text-xs vault-muted">当前仅显示真实盘点节点；打开开关后，预测从今天的当前账户净资产出发，计算明天起的事件。</p>}
        <ResponsiveContainer width="100%" height={chartHeight}><ComposedChart data={chart} margin={{ top: 30, right: 14, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="4 5" vertical={false} stroke={theme.gridStroke} />
          <XAxis dataKey="key" tick={({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) => <TrendDateTick x={x} y={y} label={chart.find(p => p.key === payload?.value)?.label.replace(/-/g, '.') ?? ''} end={payload?.value === chart.at(-1)?.key} color={theme.axisStroke} />} ticks={[chart[0]?.key, chart.at(-1)?.key].filter((key): key is string => !!key)} interval={0} tickLine={false} axisLine={false} padding={{ left: 5, right: 5 }} fontSize={10} stroke={theme.axisStroke} />
          <YAxis fontSize={10} stroke={theme.axisStroke} width={65} tickCount={5} tickLine={false} axisLine={false} tickFormatter={formatTrendAxis} />
          <Tooltip labelFormatter={key => chart.find(p => p.key === key)?.label ?? key} formatter={value => money(Number(value))} />
          <Line type="linear" dataKey="actual" name="已保存盘点" stroke={theme.accent} strokeWidth={2.2} activeDot={{ r: 5 }} isAnimationActive={false} dot={({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
            if (index === undefined || !checkpoints[index] || ((showCalendar || showPlan) && index === 0 && checkpoints.length > 1) || (index !== 0 && index !== checkpoints.length - 1)) return <g />;
            return <TrendEndpoint cx={cx} cy={cy} label={money(checkpoints[index].netWorth)} color={theme.accent} end={index === checkpoints.length - 1} />;
          }} connectNulls={false} />
          {showPlan && <Line type="linear" dataKey="forecast" name="手动计划预测" stroke={theme.primary} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls={false} />}
          {showCalendar && <Line type="stepAfter" dataKey="calendar" name="现金流日历预测" stroke={theme.yellow} strokeWidth={2.2} strokeDasharray="4 4" dot={false} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls={false} />}
        </ComposedChart></ResponsiveContainer>
        <p className="text-xs vault-muted">实线是已保存的真实盘点；虚线是估算，不会改写历史或账户余额。两种预测各自计算，避免同一笔工资或支出被重复叠加。</p>
        {showCalendar && calendarFinal && <div className="rounded-lg p-3 space-y-2 text-xs vault-heading" style={{ backgroundColor: 'var(--vault-input-bg)' }}>
          <p><span style={{ color: theme.yellow }}>现金流日历预测</span> · 截至 {calendarFinal.date} · 预计净资产 {money(calendarFinal.netWorth)}</p>
          <p>预计收入 {money(calendarFinal.income)} · 支出 {money(calendarFinal.expense)} · 还款 {money(calendarFinal.repayment)} · 现金净流入 {money(calendarFinal.cashDelta)}</p>
          <p className="vault-muted">还款本金减少现金的同时也减少负债，不重复减少净资产；利息和手续费请在日历中另记为支出。今天及以前的事件不再计算。</p>
          {data.calendarEvents.length === 0 && <p className="vault-muted">日历还没有事件。添加工资或支出后，曲线会自动更新。</p>}
        </div>}
        {showPlan && final && <p className="text-xs vault-muted">手动计划预测 · 截至 {final.date} · 预计净资产 {money(final.netWorth)}</p>}
        {!currencyMatches && <p className="text-xs vault-muted">最新盘点使用 {currency}，当前规划设置使用 {settings.baseCurrency}。请在设置中统一基准币种后查看预测。</p>}
      </div>
    </>}
    <CheckpointPeriodAnalysis />
    <ForecastEventsPanel />
    {plan.length > 1 && <div className="vault-card overflow-x-auto"><h2 className="text-sm font-semibold vault-heading mb-3">未来收支安排 · {currency}</h2><p className="text-xs vault-muted mb-3">本月只计明天至月底；每月、每年按实际发生日计入，月底日期自动适配短月。日历提醒不重复计入此规划。</p><table className="w-full text-xs text-left"><thead><tr className="vault-muted"><th className="py-2">截至</th><th>预计收入</th><th>预计支出</th><th>预计结余</th><th>预计净资产</th></tr></thead><tbody>{plan.slice(1).map(p => <tr key={p.date} className="vault-heading"><td className="py-3">{p.date}</td><td>{money(p.income)}</td><td>{money(p.expense)}</td><td>{money(p.income - p.expense)}</td><td>{money(p.netWorth)}</td></tr>)}</tbody></table></div>}
    <div className="vault-card overflow-x-auto"><h2 className="text-sm font-semibold vault-heading mb-3">已记录的实际收支 · {settings.baseCurrency}</h2><p className="text-xs vault-muted mb-3">按流水日期汇总，外币按当前设置汇率换算；账单不完整时，结余不等于实际资产增量。</p>{monthlyData.length ? <table className="w-full text-xs text-left"><thead><tr className="vault-muted"><th>月份</th><th>收入</th><th>支出</th><th>结余</th></tr></thead><tbody>{[...monthlyData].reverse().map(m => <tr key={m.month} className="vault-heading"><td className="py-3">{m.month}</td><td>{formatCurrency(m.income, settings.baseCurrency)}</td><td>{formatCurrency(m.expense, settings.baseCurrency)}</td><td>{formatCurrency(m.savings, settings.baseCurrency)}</td></tr>)}</tbody></table> : <Link className="text-xs underline" to="/transactions">记录或导入账单，开始分析期间收支</Link>}</div>
    <p className="text-xs vault-muted"><Link className="underline" to="/accounts">查看各次盘点的账户明细与待解释差额</Link></p>
  </div>;
}


const trendViews = [
  { id: 'overview', label: '大盘趋势', description: '默认查看真实盘点；可自主打开现金流日历或手动计划预测，比较未来走势。' },
  { id: 'accounts', label: '各账户趋势', description: '所有账户的余额节点集中展示，账户页保持简洁。' },
  { id: 'composition', label: '资产构成', description: '用环形饼图查看资产、负债占比，也可回看历史盘点的构成。' },
] as const;

export default function Trends() {
  const [params, setParams] = useSearchParams();
  const selected = trendViews.find(view => view.id === params.get('view')) ?? trendViews[0];
  return <div className="space-y-5 pb-12">
    <div><h1 className="text-xl font-bold vault-heading">资产趋势</h1><p className="text-xs vault-muted mt-2">{selected.description}</p></div>
    <div role="group" aria-label="趋势视图" className="inline-flex max-w-full gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--vault-input-bg)' }}>
      {trendViews.map(view => <button type="button" key={view.id} aria-pressed={selected.id === view.id} onClick={() => setParams(view.id === 'overview' ? {} : { view: view.id })} className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium" style={{ backgroundColor: selected.id === view.id ? 'var(--vault-nav-active-bg)' : 'transparent', color: selected.id === view.id ? 'var(--vault-text)' : 'var(--vault-text-secondary)' }}>{view.label}</button>)}
    </div>
    {selected.id === 'overview' && <OverviewTrends />}
    {selected.id === 'accounts' && <AccountTrendsView />}
    {selected.id === 'composition' && <AssetComposition />}
  </div>;
}
