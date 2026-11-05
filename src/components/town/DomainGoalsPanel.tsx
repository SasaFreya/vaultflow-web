import { useMemo } from 'react';
import type { BuildingType } from '@/types/life-town';
import { BUILDING_TYPES } from '@/lib/life-memories-data';
import { LIFE_DOMAIN_META } from '@/lib/explore-ecosystem';
import { DEFAULT_DOMAIN_GOALS } from '@/lib/domain-timeline';
import { computeDomainGoalsProgress } from '@/lib/life-relation-graph';

interface DomainGoalsPanelProps {
  cityId: string;
  memories: Array<{ cityId: string; buildingType: BuildingType; date: string }>;
  goals?: Partial<Record<BuildingType, number>>;
  streakMonths?: number;
  onUpdateGoal: (buildingType: BuildingType, value: number) => void;
}

export default function DomainGoalsPanel({
  cityId,
  memories,
  goals,
  streakMonths,
  onUpdateGoal,
}: DomainGoalsPanelProps) {
  const mergedGoals = useMemo(() => {
    const g = { ...DEFAULT_DOMAIN_GOALS, ...goals };
    return g;
  }, [goals]);

  const progress = useMemo(
    () => computeDomainGoalsProgress(cityId, memories as never, mergedGoals),
    [cityId, memories, mergedGoals],
  );

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>
          生态月目标 · 广场完成度 {progress.pct}%
          {streakMonths != null && streakMonths > 0 && (
            <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--rpg-gold, #F5A623)' }}>
              🔥 连续 {streakMonths} 月达标
            </span>
          )}
        </h3>
        <span className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
          {progress.done}/{progress.total} 条回忆
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--rpg-bg)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress.pct}%`, background: 'var(--rpg-primary)' }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BUILDING_TYPES.map(bt => {
          const row = progress.byDomain.find(d => d.bt === bt);
          const goal = mergedGoals[bt];
          return (
            <label key={bt} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--rpg-text)' }}>
              <span className="w-16 shrink-0">{LIFE_DOMAIN_META[bt].label}</span>
              <input
                type="number"
                min={0}
                max={30}
                value={goal}
                onChange={e => onUpdateGoal(bt, Number(e.target.value) || 0)}
                className="w-12 px-1 py-0.5 rounded text-center"
                style={{ border: '1px solid var(--rpg-border)', background: 'var(--rpg-bg)' }}
              />
              <span style={{ color: 'var(--rpg-text-secondary)' }}>
                已完成 {row?.done ?? 0}/{goal}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
