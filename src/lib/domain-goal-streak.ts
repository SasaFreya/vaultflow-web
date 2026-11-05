import dayjs from 'dayjs';
import type { BuildingType, LifeCityRecord, LifeMemory } from '@/types/life-town';
import { DEFAULT_DOMAIN_GOALS } from '@/lib/domain-timeline';
import { computeDomainGoalsProgress } from '@/lib/life-relation-graph';

export function computeCurrentMonthGoalMet(
  cityId: string,
  memories: LifeMemory[],
  goals: Partial<Record<BuildingType, number>> | undefined,
  month?: string,
): boolean {
  const progress = computeDomainGoalsProgress(
    cityId,
    memories,
    { ...DEFAULT_DOMAIN_GOALS, ...goals },
    month,
  );
  return progress.total > 0 && progress.done >= progress.total;
}

/** 更新连续达标月数（在数据加载或回忆变更时调用） */
export function refreshDomainGoalStreak(
  city: LifeCityRecord,
  memories: LifeMemory[],
): Pick<LifeCityRecord, 'domainGoalStreakMonths' | 'lastGoalMonthMet'> {
  const month = dayjs().format('YYYY-MM');
  const met = computeCurrentMonthGoalMet(city.id, memories, city.domainGoals, month);
  const last = city.lastGoalMonthMet;
  const prevStreak = city.domainGoalStreakMonths ?? 0;

  if (!met) {
    return { domainGoalStreakMonths: prevStreak, lastGoalMonthMet: last };
  }

  if (last === month) {
    return { domainGoalStreakMonths: prevStreak, lastGoalMonthMet: month };
  }

  const prevMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
  const nextStreak = last === prevMonth ? prevStreak + 1 : 1;
  return { domainGoalStreakMonths: nextStreak, lastGoalMonthMet: month };
}

export function streakPlazaClass(streakMonths: number | undefined): string {
  if (!streakMonths || streakMonths < 1) return '';
  if (streakMonths >= 3) return 'hub-building--streak-gold';
  if (streakMonths >= 2) return 'hub-building--streak-silver';
  return 'hub-building--streak-bronze';
}
