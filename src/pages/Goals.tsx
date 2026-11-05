import { useState } from 'react';
import {
  Target, Shield, Plane, Monitor, Umbrella, Gift, GraduationCap,
  Home, Car, Heart, Plus, Trash2, ArrowUp, ArrowDown,
  Lock, Unlock, CheckCircle2, Circle, type LucideIcon,
} from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { formatCurrency } from '@/lib/storage';
import type { Goal, GoalAllocationMode } from '@/types';

const iconMap: Record<string, LucideIcon> = {
  Shield, Plane, Monitor, Umbrella, Gift, GraduationCap, Home, Car, Heart, Target,
};

const COLORS = [
  '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6',
];

const fieldStyle = {
  backgroundColor: 'var(--vault-input-bg)',
  borderColor: 'var(--vault-border)',
  color: 'var(--vault-text)',
};

export default function Goals() {
  const { data, settings, addGoal, updateGoal, deleteGoal, updateSettings } = useVaultData();
  const globalMode = settings.goalAllocationMode ?? 'priority';
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    color: COLORS[0],
    icon: 'Target',
    allocationMode: 'priority',
    allocationPercent: 0,
    dedicatedIncomeSource: '',
  });

  // Sort goals by priority
  const sortedGoals = [...data.goals].sort((a, b) => a.priority - b.priority);

  // Calculate unlocked status based on priority queue logic
  const goalsWithStatus = sortedGoals.map((goal) => {
    const mode = goal.allocationMode ?? globalMode;
    const allHigherCompleted = sortedGoals
      .filter(g => g.priority < goal.priority)
      .every(g => g.completed);
    const isUnlocked = mode === 'priority' ? allHigherCompleted : true;
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

    return {
      ...goal,
      mode,
      isUnlocked,
      progress,
    };
  });

  const totalRatio = sortedGoals
    .filter(g => (g.allocationMode ?? globalMode) === 'ratio')
    .reduce((s, g) => s + (g.allocationPercent ?? 0), 0);

  // Total target and saved
  const totalTarget = sortedGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = sortedGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  const handleAddGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount) return;
    const maxPriority = Math.max(...data.goals.map(g => g.priority), 0);
    addGoal({
      name: newGoal.name,
      targetAmount: newGoal.targetAmount,
      currentAmount: newGoal.currentAmount || 0,
      priority: maxPriority + 1,
      color: newGoal.color || COLORS[0],
      icon: newGoal.icon || 'Target',
      completed: false,
      allocationMode: newGoal.allocationMode ?? globalMode,
      allocationPercent: newGoal.allocationPercent ?? 0,
      dedicatedIncomeSource: newGoal.dedicatedIncomeSource || undefined,
    });
    setShowAddForm(false);
    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, color: COLORS[0], icon: 'Target', allocationMode: globalMode, allocationPercent: 0, dedicatedIncomeSource: '' });
  };

  const handlePriorityChange = (id: string, direction: 'up' | 'down') => {
    const goal = data.goals.find(g => g.id === id);
    if (!goal) return;

    const sorted = [...data.goals].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(g => g.id === id);

    if (direction === 'up' && idx > 0) {
      const prev = sorted[idx - 1];
      updateGoal(id, { priority: prev.priority });
      updateGoal(prev.id, { priority: goal.priority });
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const next = sorted[idx + 1];
      updateGoal(id, { priority: next.priority });
      updateGoal(next.id, { priority: goal.priority });
    }
  };

  const handleProgressUpdate = (id: string, amount: number) => {
    const goal = data.goals.find(g => g.id === id);
    if (!goal) return;
    const newAmount = Math.min(Math.max(0, goal.currentAmount + amount), goal.targetAmount);
    updateGoal(id, {
      currentAmount: newAmount,
      completed: newAmount >= goal.targetAmount,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold vault-heading">心愿目标</h1>
          <p className="text-sm mt-1 vault-muted">追踪你想达成的事 · 买房、旅行、应急金…</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white transition-colors vault-btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          新建目标
        </button>
      </div>

      <div className="vault-card flex flex-wrap items-center gap-3">
        <span className="text-xs vault-muted">分配模式</span>
        {(['priority', 'ratio', 'dedicated'] as GoalAllocationMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => updateSettings(s => ({ ...s, goalAllocationMode: mode }))}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: globalMode === mode ? 'var(--vault-nav-active-bg)' : 'transparent',
              color: globalMode === mode ? 'var(--vault-primary)' : 'var(--vault-text-secondary)',
              border: `1px solid ${globalMode === mode ? 'var(--vault-primary)' : 'var(--vault-border)'}`,
            }}
          >
            {mode === 'priority' ? '优先级' : mode === 'ratio' ? '按比例' : '绑定收入'}
          </button>
        ))}
        {globalMode === 'ratio' && totalRatio !== 100 && sortedGoals.length > 0 && (
          <span className="text-[10px]" style={{ color: 'var(--vault-yellow)' }}>比例合计 {totalRatio}%（建议 100%）</span>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" style={{ color: '#6366F1' }} />
            <span className="text-xs vault-muted">目标总数</span>
          </div>
          <p className="text-2xl font-bold font-mono vault-heading">{sortedGoals.length}</p>
          <p className="text-[10px] mt-1 vault-muted">
            {sortedGoals.filter(g => g.completed).length} 个已完成
          </p>
        </div>
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="text-xs vault-muted">已存总额</span>
          </div>
          <p className="text-2xl font-bold font-mono" style={{ color: '#10B981' }}>{formatCurrency(totalSaved)}</p>
          <p className="text-[10px] mt-1 vault-muted">
            目标总额 {formatCurrency(totalTarget)}
          </p>
        </div>
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: totalSaved >= totalTarget ? '#10B981' : '#F59E0B' }} />
            <span className="text-xs vault-muted">总体进度</span>
          </div>
          <p className="text-2xl font-bold font-mono vault-heading">
            {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}%
          </p>
          <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ backgroundColor: 'var(--vault-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%`,
                backgroundColor: 'var(--vault-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="vault-card">
          <h3 className="text-sm font-semibold vault-heading mb-3">新建心愿</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1 vault-muted">目标名称</label>
              <input
                type="text"
                value={newGoal.name}
                onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none focus:ring-1"
                style={fieldStyle}
                placeholder="例如：应急基金"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 vault-muted">目标金额</label>
              <input
                type="number"
                value={newGoal.targetAmount || ''}
                onChange={e => setNewGoal({ ...newGoal, targetAmount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
                style={fieldStyle}
                placeholder="30000"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 vault-muted">初始金额</label>
              <input
                type="number"
                value={newGoal.currentAmount || ''}
                onChange={e => setNewGoal({ ...newGoal, currentAmount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
                style={fieldStyle}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 vault-muted">图标</label>
              <div className="flex gap-1 flex-wrap">
                {Object.entries(iconMap).slice(0, 8).map(([name, Icon]) => (
                  <button
                    key={name}
                    onClick={() => setNewGoal({ ...newGoal, icon: name })}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: newGoal.icon === name ? 'var(--vault-nav-active-bg)' : 'var(--vault-input-bg)',
                      border: `1px solid ${newGoal.icon === name ? 'var(--vault-primary)' : 'var(--vault-border)'}`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: newGoal.icon === name ? 'var(--vault-primary)' : 'var(--vault-text-secondary)' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs block mb-1 vault-muted">颜色</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewGoal({ ...newGoal, color: c })}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    boxShadow: newGoal.color === c ? '0 0 0 2px white' : 'none',
                    transform: newGoal.color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs block mb-1 vault-muted">分配方式</label>
              <select
                value={newGoal.allocationMode ?? globalMode}
                onChange={e => setNewGoal({ ...newGoal, allocationMode: e.target.value as GoalAllocationMode })}
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
                style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
              >
                <option value="priority">优先级队列</option>
                <option value="ratio">按比例分配</option>
                <option value="dedicated">绑定收入来源</option>
              </select>
            </div>
            {(newGoal.allocationMode ?? globalMode) === 'ratio' && (
              <div>
                <label className="text-xs block mb-1 vault-muted">分配比例 %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newGoal.allocationPercent ?? ''}
                  onChange={e => setNewGoal({ ...newGoal, allocationPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
                  style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
                  placeholder="30"
                />
              </div>
            )}
            {(newGoal.allocationMode ?? globalMode) === 'dedicated' && (
              <div>
                <label className="text-xs block mb-1 vault-muted">绑定收入分类</label>
                <input
                  type="text"
                  value={newGoal.dedicatedIncomeSource ?? ''}
                  onChange={e => setNewGoal({ ...newGoal, dedicatedIncomeSource: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
                  style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
                  placeholder="如：工资收入"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddGoal} className="flex-1 py-2 rounded-lg text-xs font-medium text-white vault-btn-primary">
              创建目标
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-xs font-medium vault-muted" style={{ backgroundColor: 'var(--vault-border)' }}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* Goals Priority Queue */}
      <div className="space-y-3">
        {goalsWithStatus.map((goal, index) => {
          const Icon = iconMap[goal.icon || ''] || Target;
          const isActive = goal.isUnlocked && !goal.completed;

          return (
            <div
              key={goal.id}
              className={`vault-card transition-all duration-300 ${isActive ? 'animate-pulse-glow' : ''}`}
              style={{
                borderLeft: `3px solid ${goal.completed ? '#10B981' : isActive ? goal.color : '#64748B'}`,
                opacity: goal.completed ? 0.8 : 1,
              }}
            >
              <div className="flex items-start gap-4">
                {/* Priority & Controls */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    onClick={() => handlePriorityChange(goal.id, 'up')}
                    className="p-0.5 rounded hover:bg-white/5 transition-colors"
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-3 h-3 vault-muted" style={{ opacity: index === 0 ? 0.3 : 1 }} />
                  </button>
                  <span className="text-xs font-mono font-bold" style={{ color: goal.color }}>
                    {goal.priority}
                  </span>
                  <button
                    onClick={() => handlePriorityChange(goal.id, 'down')}
                    className="p-0.5 rounded hover:bg-white/5 transition-colors"
                    disabled={index === goalsWithStatus.length - 1}
                  >
                    <ArrowDown className="w-3 h-3 vault-muted" style={{ opacity: index === goalsWithStatus.length - 1 ? 0.3 : 1 }} />
                  </button>
                </div>

                {/* Icon & Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: goal.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold vault-heading ${goal.completed ? 'line-through opacity-60' : ''}`}>
                          {goal.name}
                        </span>
                        {goal.completed && <CheckCircle2 className="w-4 h-4" style={{ color: '#10B981' }} />}
                        {!goal.isUnlocked && !goal.completed && goal.mode === 'priority' && <Lock className="w-3 h-3" style={{ color: '#64748B' }} />}
                        {isActive && <Unlock className="w-3 h-3" style={{ color: '#10B981' }} />}
                        {goal.mode === 'ratio' && goal.allocationPercent != null && goal.allocationPercent > 0 && (
                          <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--vault-nav-active-bg)', color: 'var(--vault-primary)' }}>
                            {goal.allocationPercent}%
                          </span>
                        )}
                        {goal.mode === 'dedicated' && goal.dedicatedIncomeSource && (
                          <span className="text-[10px] px-1 rounded vault-muted" style={{ backgroundColor: 'var(--vault-border)' }}>
                            {goal.dedicatedIncomeSource}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold vault-heading">{formatCurrency(goal.currentAmount)}</p>
                      <p className="text-[10px] font-mono vault-muted">/ {formatCurrency(goal.targetAmount)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--vault-border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700 relative"
                        style={{
                          width: `${Math.min(goal.progress, 100)}%`,
                          backgroundColor: goal.completed ? '#10B981' : goal.color,
                        }}
                      >
                        {isActive && (
                          <div className="absolute inset-0 rounded-full animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] font-mono vault-muted">
                        {goal.progress.toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-mono vault-muted">
                        剩余 {formatCurrency(goal.targetAmount - goal.currentAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {isActive && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleProgressUpdate(goal.id, 1000)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
                        style={{ backgroundColor: `${goal.color}30`, color: goal.color }}
                      >
                        + ¥1,000
                      </button>
                      <button
                        onClick={() => handleProgressUpdate(goal.id, 5000)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
                        style={{ backgroundColor: `${goal.color}30`, color: goal.color }}
                      >
                        + ¥5,000
                      </button>
                      <button
                        onClick={() => handleProgressUpdate(goal.id, 10000)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
                        style={{ backgroundColor: `${goal.color}30`, color: goal.color }}
                      >
                        + ¥10,000
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors self-start"
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                </button>
              </div>
            </div>
          );
        })}

        {goalsWithStatus.length === 0 && (
          <div className="vault-card text-center py-12">
            <Target className="w-12 h-12 mx-auto mb-3" style={{ color: '#334155' }} />
            <p className="text-sm vault-heading mb-1">还没有心愿目标</p>
            <p className="text-xs" style={{ color: '#64748B' }}>点击右上角新建你的第一个目标</p>
          </div>
        )}
      </div>

      <div className="vault-card">
        <h3 className="text-sm font-semibold vault-heading mb-2">分配规则说明</h3>
        <div className="space-y-2 text-xs vault-muted">
          <p className="flex items-center gap-2">
            <Circle className="w-3 h-3" style={{ color: '#10B981' }} />
            <strong className="vault-heading">优先级</strong>：结余优先填入当前激活目标，完成后解锁下一个
          </p>
          <p className="flex items-center gap-2">
            <Circle className="w-3 h-3" style={{ color: '#6366F1' }} />
            <strong className="vault-heading">按比例</strong>：每月结余按各目标设定比例自动分配
          </p>
          <p className="flex items-center gap-2">
            <Circle className="w-3 h-3" style={{ color: '#F59E0B' }} />
            <strong className="vault-heading">绑定收入</strong>：指定收入来源（如工资）入账时优先计入对应目标
          </p>
        </div>
      </div>
    </div>
  );
}
