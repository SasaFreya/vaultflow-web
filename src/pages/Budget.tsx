import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  PiggyBank, AlertTriangle, CheckCircle2, Utensils, Bus,
  ShoppingBag, Home, Gamepad2, Heart, BookOpen, Wifi,
  Users, MoreHorizontal, ArrowDownRight, ArrowUpRight, Pencil, Check, X, Plus, Trash2, type LucideIcon,
} from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { formatCurrency, getCurrentMonth, BUDGET_CATEGORY_PRESETS } from '@/lib/storage';
import { toMonthlyEquivalent, budgetStatus } from '@/lib/budget-utils';
import { useChartHeight, useIsMobile } from '@/hooks/use-mobile';
import { useChartTheme } from '@/hooks/useChartTheme';
import { LabeledPieChart } from '@/components/LabeledPieChart';
import { BottomInputBar } from '@/components/BottomInputBar';
import type { BudgetPeriod } from '@/types';

const iconMap: Record<string, LucideIcon> = {
  Utensils, Bus, ShoppingBag, Home, Gamepad2, Heart, BookOpen, Wifi, Users, MoreHorizontal,
};

const COLORS = {
  under: '#10B981',
  near: '#F59E0B',
  over: '#EF4444',
};

export default function Budget() {
  const { budgetsWithSpent, categoryTotals, updateBudget, addBudget, deleteBudget } = useVaultData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newPeriod, setNewPeriod] = useState<BudgetPeriod>('monthly');
  const pieHeight = useChartHeight(220, 160);
  const barHeight = useChartHeight(240, 180);
  const isMobile = useIsMobile();
  const chartTheme = useChartTheme();

  const currentMonth = getCurrentMonth();
  const monthLabel = new Date(currentMonth + '-01').toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  // Calculate totals
  const totalBudget = budgetsWithSpent.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = budgetsWithSpent.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Budget data with status
  const budgetData = budgetsWithSpent.map(b => {
    const threshold = b.alertThreshold ?? 0.8;
    const percent = b.monthlyLimit > 0 ? (b.spent / b.monthlyLimit) * 100 : 0;
    const status = budgetStatus(b.spent, b.monthlyLimit, threshold);
    return {
      ...b,
      percent,
      status,
      remaining: b.monthlyLimit - b.spent,
    };
  }).sort((a, b) => b.percent - a.percent);

  // Pie chart data
  const pieData = categoryTotals.map(c => ({
    name: c.category,
    value: Math.round(c.amount),
    color: c.color,
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border p-3 text-sm" style={{ backgroundColor: chartTheme.surface, borderColor: chartTheme.border }}>
          <p className="font-mono font-semibold vault-heading">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs vault-muted">{payload[0].name}</p>
        </div>
      );
    }
    return null;
  };

  const startEdit = (id: string, limit: number) => {
    setEditingId(id);
    setEditLimit(String(limit));
  };

  const saveEdit = (id: string) => {
    const limit = parseFloat(editLimit);
    if (limit > 0) {
      updateBudget(id, { monthlyLimit: limit });
    }
    setEditingId(null);
    setEditLimit('');
  };

  const availablePresets = BUDGET_CATEGORY_PRESETS.filter(
    p => !budgetsWithSpent.some(b => b.category === p.category)
  );

  const handleAddBudget = () => {
    const amount = parseFloat(newLimit);
    if (!newCategory.trim() || !amount || amount <= 0) return;
    const preset = BUDGET_CATEGORY_PRESETS.find(p => p.category === newCategory.trim());
    const monthlyLimit = toMonthlyEquivalent(amount, newPeriod);
    addBudget({
      category: newCategory.trim(),
      amount,
      period: newPeriod,
      monthlyLimit,
      icon: preset?.icon ?? 'MoreHorizontal',
      color: preset?.color ?? chartTheme.textSecondary,
      alertThreshold: 0.8,
    });
    setNewCategory('');
    setNewLimit('');
    setNewPeriod('monthly');
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold vault-heading">预算对比</h1>
          <p className="text-sm mt-1 vault-muted">{monthLabel} · 底部栏添加 · 点击行内编辑</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4" style={{ color: '#6366F1' }} />
            <span className="text-xs" style={{ color: '#94A3B8' }}>本月预算</span>
          </div>
          <p className="text-xl font-bold font-mono text-white">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4" style={{ color: '#EF4444' }} />
            <span className="text-xs" style={{ color: '#94A3B8' }}>已支出</span>
          </div>
          <p className="text-xl font-bold font-mono text-white">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4" style={{ color: totalRemaining >= 0 ? '#10B981' : '#EF4444' }} />
            <span className="text-xs" style={{ color: '#94A3B8' }}>剩余</span>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: totalRemaining >= 0 ? '#10B981' : '#EF4444' }}>
            {formatCurrency(totalRemaining)}
          </p>
        </div>
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            {overallPercent >= 100 ? <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} /> : <CheckCircle2 className="w-4 h-4" style={{ color: '#10B981' }} />}
            <span className="text-xs" style={{ color: '#94A3B8' }}>执行率</span>
          </div>
          <p className="text-xl font-bold font-mono" style={{ color: overallPercent >= 100 ? '#EF4444' : overallPercent >= 80 ? '#F59E0B' : '#10B981' }}>
            {overallPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="vault-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">总体预算进度</h2>
          <span className="text-xs font-mono" style={{ color: overallPercent >= 100 ? '#EF4444' : '#94A3B8' }}>
            {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#1E293B' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(overallPercent, 100)}%`,
              backgroundColor: overallPercent >= 100 ? COLORS.over : overallPercent >= 80 ? COLORS.near : COLORS.under,
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px]" style={{ color: '#64748B' }}>0%</span>
          <span className="text-[10px]" style={{ color: '#64748B' }}>50%</span>
          <span className="text-[10px]" style={{ color: '#64748B' }}>100%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Budget Detail List */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-sm font-semibold text-white mb-2">分类预算明细</h2>
          {budgetData.map((b) => {
            const Icon = iconMap[b.icon || ''] || MoreHorizontal;
            return (
              <div key={b.id} className="vault-card !p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${b.color}20` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: b.color }} />
                    </div>
                    <div>
                      <span className="text-sm text-white">{b.category}</span>
                      <div className="flex items-center gap-1">
                        {b.status === 'over' && <AlertTriangle className="w-3 h-3" style={{ color: COLORS.over }} />}
                        <span className="text-[10px]" style={{ color: b.status === 'over' ? COLORS.over : b.status === 'near' ? COLORS.near : COLORS.under }}>
                          {b.status === 'over' ? '已超支' : b.status === 'near' ? '即将超支' : '正常'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-white">{formatCurrency(b.spent)}</p>
                    {editingId === b.id ? (
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <input
                          type="number"
                          value={editLimit}
                          onChange={e => setEditLimit(e.target.value)}
                          className="w-20 rounded px-1.5 py-0.5 text-[10px] text-white border outline-none font-mono"
                          style={{ backgroundColor: '#0B0E14', borderColor: '#6366F1' }}
                          autoFocus
                        />
                        <button onClick={() => saveEdit(b.id)} className="p-0.5 rounded hover:bg-white/5">
                          <Check className="w-3 h-3" style={{ color: '#10B981' }} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-0.5 rounded hover:bg-white/5">
                          <X className="w-3 h-3" style={{ color: '#64748B' }} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(b.id, b.monthlyLimit)}
                        className="flex items-center gap-1 text-[10px] font-mono ml-auto mt-0.5 hover:opacity-80"
                        style={{ color: '#94A3B8' }}
                      >
                        / {formatCurrency(b.monthlyLimit)}
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1E293B' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(b.percent, 100)}%`,
                      backgroundColor: b.status === 'over' ? COLORS.over : b.status === 'near' ? COLORS.near : COLORS.under,
                    }}
                  />
                </div>

                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-mono" style={{ color: '#64748B' }}>
                    {b.percent.toFixed(0)}%
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: b.remaining >= 0 ? '#64748B' : COLORS.over }}>
                      {b.remaining >= 0 ? `剩余 ${formatCurrency(b.remaining)}` : `超支 ${formatCurrency(Math.abs(b.remaining))}`}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`确定删除「${b.category}」预算分类？`)) deleteBudget(b.id);
                      }}
                      className="p-0.5 rounded hover:bg-white/5"
                    >
                      <Trash2 className="w-3 h-3" style={{ color: '#64748B' }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Side Charts */}
        <div className="lg:col-span-5 space-y-4">
          {/* Expense Distribution Pie */}
          <div className="vault-card">
            <h2 className="text-sm font-semibold vault-heading mb-4">支出分布</h2>
            <LabeledPieChart data={pieData} height={pieHeight} innerRadius={50} outerRadius={85} />
          </div>

          {/* Category Comparison Bar */}
          <div className="vault-card">
            <h2 className="text-sm font-semibold text-white mb-4">预算 vs 实际</h2>
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart data={budgetData.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `¥${v}`} />
                <YAxis dataKey="category" type="category" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} width={isMobile ? 48 : 60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="monthlyLimit" fill="#6366F1" radius={[0, 4, 4, 0]} name="预算" barSize={8} />
                <Bar dataKey="spent" fill="#EF4444" radius={[0, 4, 4, 0]} name="已支出" barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <datalist id="budget-presets">
        {availablePresets.map(p => (
          <option key={p.category} value={p.category} />
        ))}
      </datalist>

      <BottomInputBar>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            list="budget-presets"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="分类名称…"
            className="flex-1 min-w-[100px] rounded-lg px-3 py-2 text-xs border outline-none"
            style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
          />
          <input
            type="number"
            value={newLimit}
            onChange={e => setNewLimit(e.target.value)}
            placeholder="金额"
            className="w-24 rounded-lg px-3 py-2 text-xs border outline-none font-mono"
            style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
          />
          <select
            value={newPeriod}
            onChange={e => setNewPeriod(e.target.value as BudgetPeriod)}
            className="rounded-lg px-2 py-2 text-xs border outline-none"
            style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
          >
            <option value="daily">日</option>
            <option value="weekly">周</option>
            <option value="monthly">月</option>
          </select>
          <button onClick={handleAddBudget} className="px-4 py-2 rounded-lg text-xs font-medium text-white vault-btn-primary">
            <Plus className="w-3.5 h-3.5 inline mr-1" />添加
          </button>
        </div>
      </BottomInputBar>
    </div>
  );
}
