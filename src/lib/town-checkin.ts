import type { LocationCategory } from '@/types/town';
import type { CharacterStats } from '@/types/rpg';

export const CHECKIN_DURATIONS = [5, 15, 30, 60] as const;
export type CheckInDuration = (typeof CHECKIN_DURATIONS)[number];

export interface CheckInRewards {
  exp: number;
  gold: number;
  statDeltas: Partial<CharacterStats>;
  lines: string[];
}

/** 卷宗映射：现实行为 → 游戏反馈（v1 手动打卡 + 时长） */
export function computeCheckInRewards(
  category: LocationCategory,
  durationMin: CheckInDuration,
): CheckInRewards {
  const hours = durationMin / 60;

  switch (category) {
    case 'body': {
      const str = Math.max(1, Math.round(hours));
      return {
        exp: Math.max(20, Math.round(50 * hours)),
        gold: Math.max(2, Math.round(8 * hours)),
        statDeltas: { strength: str },
        lines: [`💪 力量 +${str}`, `✨ EXP +${Math.max(20, Math.round(50 * hours))}`],
      };
    }
    case 'mind': {
      const int = Math.max(1, Math.round(hours));
      return {
        exp: Math.max(20, Math.round(45 * hours)),
        gold: Math.max(2, Math.round(6 * hours)),
        statDeltas: { intelligence: int },
        lines: [`🧠 智力 +${int}`, `✨ EXP +${Math.max(20, Math.round(45 * hours))}`],
      };
    }
    case 'vocation': {
      const exp = Math.max(15, Math.round(25 * hours));
      const gold = Math.max(5, Math.round(10 * hours));
      return {
        exp,
        gold,
        statDeltas: { aura: Math.max(1, Math.round(hours * 0.5) || 1) },
        lines: [`🪙 金币 +${gold}`, `📈 职级 EXP +${exp}`],
      };
    }
    case 'spirit':
    default:
      return {
        exp: 25,
        gold: 3,
        statDeltas: { charm: 2 },
        lines: ['✨ 心情 +2（魅力）', '☕ 休息恢复完成'],
      };
  }
}

export function applyStatDeltas(
  stats: CharacterStats,
  deltas: Partial<CharacterStats>,
): CharacterStats {
  return {
    strength: stats.strength + (deltas.strength ?? 0),
    intelligence: stats.intelligence + (deltas.intelligence ?? 0),
    charm: stats.charm + (deltas.charm ?? 0),
    aura: stats.aura + (deltas.aura ?? 0),
  };
}
