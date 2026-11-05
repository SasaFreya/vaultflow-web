import type { Goal } from '@/types';
import type { WealthBoss } from '@/types/rpg';

export function computeBossFromGoal(goal: Goal, claimedBossIds: string[]): WealthBoss {
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0;
  const hpRemaining = Math.max(0, 100 - progress);
  const canDefeat = goal.completed || progress >= 100;
  const defeated = claimedBossIds.includes(goal.id);

  const scale = Math.max(1, goal.targetAmount / 1000);
  const expReward = Math.min(1500, Math.round(300 + scale * 50));
  const goldReward = Math.min(500, Math.round(80 + scale * 20));

  return {
    goalId: goal.id,
    name: goal.name,
    progress,
    hpRemaining,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    color: goal.color,
    canDefeat,
    defeated,
    expReward,
    goldReward,
  };
}

export function computeBosses(goals: Goal[], claimedBossIds: string[]): WealthBoss[] {
  return goals
    .filter(g => !g.completed || !claimedBossIds.includes(g.id))
    .map(g => computeBossFromGoal(g, claimedBossIds))
    .sort((a, b) => {
      if (a.defeated !== b.defeated) return a.defeated ? 1 : -1;
      return b.progress - a.progress;
    });
}
