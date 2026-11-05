import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CountUp from 'react-countup';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Line,
} from 'recharts';
import {
  Wallet, PiggyBank, Landmark,
  CreditCard, ArrowUpRight, ArrowDownRight, Target, Receipt, TrendingUp,
} from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { formatCurrency, formatBalanceInBase } from '@/lib/storage';
import { useChartHeight } from '@/hooks/use-mobile';
import { useChartTheme } from '@/hooks/useChartTheme';
import WelcomeEmptyState from '@/components/WelcomeEmptyState';
import { LabeledPieChart } from '@/components/LabeledPieChart';
import { MaskedCurrency } from '@/components/MaskedCurrency';
import { projectNetWorthThroughEndOfMonth } from '@/lib/calendar-projection';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export default function Dashboard() {
  const navigate = useNavigate();
  const { totals, data, sortedAccounts, categoryTotals, netWorthChange, settings } = useVaultData();
  const { revealed, toggleReveal } = usePrivacyMode();
  const colors = useChartTheme();
  const trendHeight = useChartHeight(280, 200);
  const donutHeight = useChartHeight(200, 150);
  const expensePieHeight = useChartHeight(140, 110);
  const base = settings.baseCurrency;

  const projectedNetWorth = useMemo(
    () => projectNetWorthThroughEndOfMonth(totals.netWorth, data.calendarEvents),
    [totals.netWorth, data.calendarEvents],
  );
  const projectedDelta = totals.netWorth !== 0
    ? ((projectedNetWorth - totals.netWorth) / Math.abs(totals.netWorth)) * 100
    : 0;

  const assetStructureData = [
    { name: '流动资产', value: totals.liquidAssets, color: colors.yellow },
    { name: '投资资产', value: totals.investmentAssets, color: colors.primary },
    { name: '固定资产', value: totals.fixedAssets, color: colors.purple },
  ];

  const recentSnapshots = data.assetSnapshots.slice(-10);
  const trendData = recentSnapshots.map(s => ({
    month: s.date.slice(5),
    netWorth: s.netWorth,
    totalAssets: s.totalAssets,
    totalDebt: s.totalDebt,
  }));

  const expenseBreakdown = categoryTotals.slice(0, 6).map(c => ({
    name: c.category,
    value: Math.round(c.amount),
    color: c.color,
  }));

  const cashAccounts = sortedAccounts.filter(a => a.type === 'cash');
  const investmentAccounts = sortedAccounts.filter(a => a.type === 'investment');
  const fixedAccounts = sortedAccounts.filter(a => a.type === 'fixed');
  const debtList = sortedAccounts.filter(a => a.type === 'debt');


  if (data.accounts.length === 0) {
    return <WelcomeEmptyState />;
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border p-3 text-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <p style={{ color: colors.textSecondary }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="font-mono font-semibold" style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value, base)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const fmt = (v: number) => formatCurrency(v, base);

  const RADIAN = Math.PI / 180;
  const renderPieLabel = (props: {
    cx?: number; cy?: number; midAngle?: number; outerRadius?: number;
    name?: string; percent?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name = '', percent = 0 } = props;
    if (percent < 0.04) return null;
    const radius = outerRadius + 16;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill={colors.textSecondary}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const quickLinks = [
    { label: '资产趋势', to: '/trends', icon: TrendingUp },
    { label: '心愿目标', to: '/goals', icon: Target },
    { label: '预算', to: '/budget', icon: PiggyBank },
    { label: '记一笔', to: '/transactions', icon: Receipt, subtle: true },
  ];

  return (
    <div className="dashboard-aobi space-y-6">
      <Link to="/accounts" className="dashboard-aobi-hero">
        <div>
          <p className="dashboard-aobi-hero-title">每次盘点，都留下一个资产节点</p>
          <p className="dashboard-aobi-hero-sub">集中更新账户余额，回看历史变化，再安排未来收支</p>
        </div>
        <span className="dashboard-aobi-hero-cta">开始资产盘点 →</span>
      </Link>

      <div className="flex flex-wrap gap-2">
        {quickLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`dashboard-aobi-pill ${link.subtle ? '' : 'dashboard-aobi-pill--primary'}`}
          >
            <link.icon className="w-3.5 h-3.5" />
            {link.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 lg:col-span-1 vault-card vault-card-hover dashboard-networth-card animate-fade-in-up">
          <button type="button" onClick={toggleReveal} className="w-full text-left">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textSecondary }}>净资产</span>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: colors.text }}>
              {revealed ? (
                <CountUp end={totals.netWorth} duration={1.5} decimals={0} formattingFn={fmt} />
              ) : (
                '******'
              )}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: colors.textSecondary }}>
              {revealed ? '点击隐藏' : '点击显示'}
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="text-[10px] mt-2 hover:underline"
            style={{ color: colors.primary }}
          >
            查看账户明细 →
          </button>
          <div className="flex items-center gap-1 mt-2">
            {netWorthChange !== null && netWorthChange >= 0 ? (
              <ArrowUpRight className="w-3 h-3" style={{ color: colors.accent }} />
            ) : (
              <ArrowDownRight className="w-3 h-3" style={{ color: colors.red }} />
            )}
            <span className="text-xs font-medium" style={{ color: netWorthChange !== null && netWorthChange >= 0 ? colors.accent : colors.red }}>
              {netWorthChange !== null ? `${netWorthChange >= 0 ? '+' : ''}${netWorthChange.toFixed(2)}%` : '--'}
            </span>
            <span className="text-xs" style={{ color: colors.textSecondary }}>较上次盘点</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/accounts')}
          className="vault-card vault-card-hover animate-fade-in-up text-left cursor-pointer"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-4 h-4" style={{ color: colors.accent }} />
            <span className="text-xs" style={{ color: colors.textSecondary }}>总资产</span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums" style={{ color: colors.text }}>
            <CountUp end={totals.totalAssets} duration={1.5} decimals={0} formattingFn={fmt} />
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/accounts')}
          className="vault-card vault-card-hover animate-fade-in-up text-left cursor-pointer"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" style={{ color: colors.red }} />
            <span className="text-xs" style={{ color: colors.textSecondary }}>总负债</span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums" style={{ color: colors.text }}>
            <CountUp end={totals.totalDebt} duration={1.5} decimals={0} formattingFn={fmt} />
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs" style={{ color: colors.textSecondary }}>负债率</span>
            <span className="text-xs font-medium font-mono" style={{ color: totals.debtRatio > 30 ? colors.red : colors.accent }}>
              {totals.debtRatio.toFixed(2)}%
            </span>
          </div>
        </button>

        <div className="vault-card vault-card-hover animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: colors.primary }} />
            <span className="text-xs" style={{ color: colors.textSecondary }}>预计净资产（至月底）</span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums vault-heading">
            <MaskedCurrency value={projectedNetWorth} currency={base} />
          </p>
          <p className="text-[10px] mt-1" style={{ color: projectedDelta >= 0 ? colors.accent : colors.red }}>
            {projectedDelta >= 0 ? '+' : ''}{projectedDelta.toFixed(1)}% 基于现金流日历
          </p>
        </div>
      </div>

      {/* Health metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '流动比', value: totals.liquidRatio.toFixed(2), ok: totals.liquidRatio >= 1 },
          { label: '资产负债率', value: `${totals.debtRatio.toFixed(1)}%`, ok: totals.debtRatio < 30 },
          { label: '应急资金', value: totals.emergencyMonths > 0 ? `${totals.emergencyMonths.toFixed(1)} 月` : '--', ok: totals.emergencyMonths >= 6 },
          { label: '储蓄率', value: totals.savingsRate !== 0 ? `${totals.savingsRate.toFixed(1)}%` : '--', ok: totals.savingsRate >= 20 },
          { label: '投资占比', value: `${totals.investmentRatio.toFixed(1)}%`, ok: totals.investmentRatio >= 20 },
        ].map(item => (
          <div key={item.label} className="vault-card !p-4">
            <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>{item.label}</p>
            <p className="text-lg font-bold font-mono" style={{ color: item.ok ? colors.accent : colors.yellow }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="vault-card animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold dashboard-section-title" style={{ color: colors.text }}>资产走势</h2>
            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>净资产、总资产与负债变化趋势</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={trendHeight}>
          <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accent} stopOpacity={0.2} />
                <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="totalAssetsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.primary} stopOpacity={0.15} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} vertical={false} />
            <XAxis dataKey="month" stroke={colors.axisStroke} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={colors.axisStroke} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="netWorth" stroke={colors.accent} strokeWidth={2} fill="url(#netWorthGrad)" dot={false} name="净资产" />
            <Area type="monotone" dataKey="totalAssets" stroke={colors.primary} strokeWidth={2} fill="url(#totalAssetsGrad)" dot={false} name="总资产" />
            <Line type="monotone" dataKey="totalDebt" stroke={colors.red} strokeWidth={1.5} dot={false} name="负债" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 vault-card animate-fade-in-up">
          <h3 className="text-sm font-semibold mb-1" style={{ color: colors.text }}>资产结构</h3>
          <ResponsiveContainer width="100%" height={donutHeight}>
            <PieChart>
              <Pie data={assetStructureData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4} label={renderPieLabel} labelLine={{ stroke: colors.border }}>
                {assetStructureData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-4 vault-card animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: colors.text }}>我的资产</h3>
              <p className="text-xs font-mono font-bold mt-0.5" style={{ color: colors.accent }}>{fmt(totals.totalAssets)}</p>
            </div>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {[...cashAccounts, ...investmentAccounts, ...fixedAccounts].map(acc => (
              <div key={acc.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: colors.border }}>
                <span className="text-xs" style={{ color: colors.text }}>{acc.name}</span>
                <span className="text-xs font-mono font-semibold" style={{ color: colors.text }}>
                  {formatBalanceInBase(acc.balance, acc.currency, settings)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="vault-card animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: colors.text }}>负债</h3>
              <span className="text-xs font-mono font-bold" style={{ color: colors.red }}>{fmt(totals.totalDebt)}</span>
            </div>
            <div className="space-y-2">
              {debtList.map(acc => (
                <div key={acc.id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs" style={{ color: colors.text }}>{acc.name}</span>
                  <span className="text-xs font-mono" style={{ color: colors.red }}>
                    {acc.balance !== null ? formatBalanceInBase(Math.abs(acc.balance), acc.currency, settings) : '--'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="vault-card animate-fade-in-up">
            <h3 className="text-sm font-semibold mb-2" style={{ color: colors.text }}>本月支出分布</h3>
            <LabeledPieChart data={expenseBreakdown} height={expensePieHeight} innerRadius={35} outerRadius={60} minLabelPercent={0.06} />
          </div>
        </div>
      </div>
    </div>
  );
}
