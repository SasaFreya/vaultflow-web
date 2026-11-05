import { CheckpointPeriodAnalysis } from '@/components/CheckpointPeriodAnalysis';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Lightbulb } from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { formatCurrency } from '@/lib/storage';
import { useChartTheme } from '@/hooks/useChartTheme';
import { LabeledPieChart } from '@/components/LabeledPieChart';
import {
  computeHealthScore,
  computeMonthlyStats,
  generateInsights,
  budgetExecutionRate,
  goalCompletionRate,
  getOverBudgetLabels,
  estimateGoalMonths,
  goalProgressColor,
} from '@/lib/analysis-insights';

export default function Analysis() {
  const { data, settings, totals, budgetsWithSpent, categoryTotals, netWorthChange } = useVaultData();
  const chartTheme = useChartTheme();
  const monthly = computeMonthlyStats(data, settings);
  const health = computeHealthScore(totals);
  const execRate = budgetExecutionRate(budgetsWithSpent);
  const goalRate = goalCompletionRate(data.goals);
  const overLabels = getOverBudgetLabels(budgetsWithSpent);
  const insights = generateInsights(data, budgetsWithSpent, totals, monthly);

  const trendData = data.assetSnapshots.slice(-6).map(s => ({
    month: s.date.slice(5),
    netWorth: s.netWorth,
  }));

  const expensePie = (categoryTotals.length > 0
    ? categoryTotals
    : budgetsWithSpent.map(b => ({ category: b.category, amount: b.spent, color: b.color ?? chartTheme.primary, percentage: 0 }))
  ).slice(0, 6).map(c => ({
    name: c.category,
    value: Math.round('amount' in c ? c.amount : 0),
    color: c.color || chartTheme.primary,
  })).filter(d => d.value > 0);

  const sortedGoals = [...data.goals]
    .filter(g => !g.completed)
    .sort((a, b) => {
      const ma = estimateGoalMonths(a, monthly.balance) ?? 999;
      const mb = estimateGoalMonths(b, monthly.balance) ?? 999;
      return ma - mb;
    });

  const healthColor = health.level === 'good' ? chartTheme.accent : health.level === 'warn' ? chartTheme.yellow : chartTheme.red;
  const execColor = execRate > 100 ? chartTheme.red : execRate > 80 ? chartTheme.yellow : chartTheme.accent;

  const tagTotals = data.lifeGameSnapshot?.tagTotals;
  const tagEntries = tagTotals
    ? Object.entries(tagTotals).sort((a, b) => b[1] - a[1]).slice(0, 6)
    : [];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border px-2 py-1 text-xs" style={{ backgroundColor: chartTheme.surface, borderColor: chartTheme.border }}>
        <span className="vault-muted">{label} </span>
        <span className="font-mono vault-heading">{formatCurrency(payload[0].value, settings.baseCurrency)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold vault-heading">综合洞察</h1>
        <p className="text-sm mt-0.5 vault-muted">只看不动 · 一屏掌握财务状况</p>
      </div>

      <CheckpointPeriodAnalysis />

      {/* 本月收支迷你条 */}
      <div className="vault-card !py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
          <span className="vault-muted">本月收支</span>
          <span className="font-mono vault-heading">
            收入 {formatCurrency(monthly.income)} · 支出 {formatCurrency(monthly.expense)} · 结余{' '}
            <span style={{ color: monthly.balance >= 0 ? chartTheme.accent : chartTheme.red }}>
              {formatCurrency(monthly.balance)}
            </span>
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--vault-border)' }}>
          {monthly.income > 0 && (
            <>
              <div className="h-full" style={{ width: `${Math.min((monthly.expense / monthly.income) * 100, 100)}%`, backgroundColor: chartTheme.red }} />
              <div className="h-full flex-1" style={{ backgroundColor: chartTheme.accent, opacity: 0.35 }} />
            </>
          )}
        </div>
        <p className="text-[10px] mt-1 vault-muted">
          {monthly.income > 0 ? `支出占收入 ${((monthly.expense / monthly.income) * 100).toFixed(0)}%` : '暂无本月收入记录'}
        </p>
      </div>

      {/* 顶部 4 指标 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="vault-card !p-3">
          <p className="text-[10px] vault-muted mb-1">资产健康评分</p>
          <p className="text-2xl font-bold font-mono" style={{ color: healthColor }}>{health.score}</p>
          <p className="text-[10px] vault-muted">满分 100</p>
        </div>
        <div className="vault-card !p-3">
          <p className="text-[10px] vault-muted mb-1">本月结余率</p>
          <p className="text-2xl font-bold font-mono vault-heading">
            {monthly.income > 0 ? `${monthly.savingsRate.toFixed(0)}%` : '--'}
          </p>
        </div>
        <div className="vault-card !p-3">
          <p className="text-[10px] vault-muted mb-1">预算执行率</p>
          <p className="text-2xl font-bold font-mono" style={{ color: execColor }}>{execRate.toFixed(0)}%</p>
        </div>
        <div className="vault-card !p-3">
          <p className="text-[10px] vault-muted mb-1">心愿完成率</p>
          <p className="text-2xl font-bold font-mono vault-heading">
            {data.goals.length > 0 ? `${goalRate.toFixed(0)}%` : '--'}
          </p>
        </div>
      </div>

      {/* 中左 + 中右 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="vault-card">
          <h2 className="text-sm font-semibold vault-heading mb-1">资产走势</h2>
          <p className="text-[10px] vault-muted mb-2">
            近 6 次盘点 ·{' '}
            {netWorthChange !== null ? (
              <span style={{ color: netWorthChange >= 0 ? chartTheme.accent : chartTheme.red }}>
                较上次盘点 {netWorthChange >= 0 ? '+' : ''}{netWorthChange.toFixed(1)}%
              </span>
            ) : '保存两次盘点后可比较'}
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" stroke={chartTheme.axisStroke} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="netWorth" stroke={chartTheme.accent} fill={chartTheme.accent} fillOpacity={0.12} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="vault-card">
          <h2 className="text-sm font-semibold vault-heading mb-2">本月支出分布</h2>
          <LabeledPieChart data={expensePie} height={160} innerRadius={40} outerRadius={65} minLabelPercent={0.08} />
          {overLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {overLabels.map(o => (
                <span
                  key={o.category}
                  className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                  style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--vault-red)' }}
                >
                  {o.category} +{formatCurrency(o.over)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {tagEntries.length > 0 && (
        <div className="vault-card">
          <h2 className="text-sm font-semibold vault-heading mb-2">账单生活结构</h2>
          <p className="text-[10px] vault-muted mb-3">来自智能导入 · 通勤 / 住房 / 社交 / 娱乐等</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {tagEntries.map(([tag, amount]) => (
              <div key={tag} className="rounded-lg p-2 border" style={{ borderColor: 'var(--vault-border)', backgroundColor: 'var(--vault-input-bg)' }}>
                <p className="text-[10px] vault-muted">{tag}</p>
                <p className="text-sm font-mono vault-heading">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 心愿进度带 */}
      <div className="vault-card">
        <h2 className="text-sm font-semibold vault-heading mb-3">心愿进度</h2>
        {sortedGoals.length === 0 ? (
          <p className="text-xs vault-muted text-center py-4">暂无进行中的心愿</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {sortedGoals.map(goal => {
              const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const months = estimateGoalMonths(goal, monthly.balance);
              return (
                <div
                  key={goal.id}
                  className="flex-shrink-0 w-[200px] rounded-lg p-3 border"
                  style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)' }}
                >
                  <p className="text-xs font-semibold vault-heading truncate mb-2">{goal.name}</p>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--vault-border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: goalProgressColor(pct) }} />
                  </div>
                  <p className="text-[10px] font-mono vault-muted">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </p>
                  <p className="text-[10px] vault-muted mt-1">
                    {months === 0 ? '即将达成' : months ? `预计 ${months} 个月后` : '需增加结余'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 智能洞察 */}
      <div className="vault-card">
        <h2 className="text-sm font-semibold vault-heading mb-3">智能洞察</h2>
        <ul className="space-y-2">
          {insights.map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-xs vault-muted">
              <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: chartTheme.yellow }} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
