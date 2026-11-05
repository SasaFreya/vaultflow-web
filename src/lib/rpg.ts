import type {
  CharacterStats,
  Habit,
  LifeRPGData,
  LevelInfo,
  Quest,
  QuestDifficulty,
  QuestTask,
  StatKey,
} from '@/types/rpg';
import { DEFAULT_CHARACTER_ID } from '@/lib/rpg-characters';
import { DEFAULT_RPG_THEME } from '@/lib/rpg-themes';

export const DIFFICULTY_EXP: Record<QuestDifficulty, number> = {
  normal: 50,
  hard: 150,
  epic: 300,
};

export const DIFFICULTY_GOLD: Record<QuestDifficulty, number> = {
  normal: 10,
  hard: 30,
  epic: 60,
};

export const STAT_LABELS: Record<StatKey, string> = {
  strength: '力量',
  intelligence: '智力',
  charm: '魅力',
  aura: '气场',
};

export const STAT_ICONS: Record<StatKey, string> = {
  strength: '💪',
  intelligence: '🧠',
  charm: '✨',
  aura: '🔥',
};

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getLevel(totalExp: number): number {
  return Math.floor(Math.sqrt(totalExp / 100)) + 1;
}

export function getLevelInfo(totalExp: number): LevelInfo {
  const level = getLevel(totalExp);
  const currentLevelExp = Math.pow(level - 1, 2) * 100;
  const nextLevelExp = Math.pow(level, 2) * 100;
  const range = nextLevelExp - currentLevelExp;
  const progress = range > 0 ? ((totalExp - currentLevelExp) / range) * 100 : 100;

  return { level, currentLevelExp, nextLevelExp, progress: Math.min(100, Math.max(0, progress)) };
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2;
  if (streak >= 7) return 1.5;
  return 1;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isYesterday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
}

export function computeHabitStreak(habit: Habit, completedToday: boolean): number {
  const today = todayStr();
  if (!habit.lastCompletedDate) return completedToday ? 1 : 0;
  if (habit.lastCompletedDate === today) return habit.streak;
  if (completedToday) {
    return isYesterday(habit.lastCompletedDate) ? habit.streak + 1 : 1;
  }
  if (habit.lastCompletedDate !== today && !isYesterday(habit.lastCompletedDate)) return 0;
  return habit.streak;
}

export function questTaskProgress(quest: Quest): { done: number; total: number; pct: number } {
  const total = quest.tasks.length;
  if (total === 0) return { done: 0, total: 0, pct: 100 };
  const done = quest.tasks.filter(t => t.completed).length;
  return { done, total, pct: Math.round((done / total) * 100) };
}

export function canCompleteQuest(quest: Quest): boolean {
  if (quest.completed) return false;
  if (quest.tasks.length === 0) return true;
  return quest.tasks.every(t => t.completed);
}

export function createQuestTask(title: string): QuestTask {
  return { id: uid(), title: title.trim(), completed: false };
}

export function createDefaultRPGData(): LifeRPGData {
  return {
    characterName: '冒险者',
    selectedCharacterId: DEFAULT_CHARACTER_ID,
    totalExp: 0,
    gold: 100,
    hp: 100,
    maxHp: 100,
    mp: 80,
    maxMp: 80,
    stats: { strength: 5, intelligence: 5, charm: 5, aura: 5 },
    statPoints: 0,
    modelPath: '/models/character.glb',
    theme: DEFAULT_RPG_THEME,
    soundEnabled: true,
    claimedBossIds: [],
    quests: [
      {
        id: uid(),
        title: '完成今日运动 30 分钟',
        difficulty: 'normal',
        expReward: DIFFICULTY_EXP.normal,
        goldReward: DIFFICULTY_GOLD.normal,
        completed: false,
        statBonus: 'strength',
        tasks: [
          createQuestTask('热身 5 分钟'),
          createQuestTask('主运动 20 分钟'),
          createQuestTask('拉伸 5 分钟'),
        ],
      },
      {
        id: uid(),
        title: '阅读 1 章专业书籍',
        difficulty: 'hard',
        expReward: DIFFICULTY_EXP.hard,
        goldReward: DIFFICULTY_GOLD.hard,
        completed: false,
        statBonus: 'intelligence',
        tasks: [createQuestTask('阅读章节'), createQuestTask('写 3 条笔记')],
      },
      {
        id: uid(),
        title: '本周完成一个 side project 里程碑',
        difficulty: 'epic',
        expReward: DIFFICULTY_EXP.epic,
        goldReward: DIFFICULTY_GOLD.epic,
        completed: false,
        statBonus: 'intelligence',
        tasks: [
          createQuestTask('确定里程碑范围'),
          createQuestTask('完成核心功能'),
          createQuestTask('自测并提交'),
        ],
      },
    ],
    habits: [
      {
        id: uid(),
        title: '早起 7 点前',
        frequency: 'daily',
        expReward: 30,
        statBonus: 'aura',
        streak: 0,
      },
      {
        id: uid(),
        title: '冥想 10 分钟',
        frequency: 'daily',
        expReward: 25,
        statBonus: 'charm',
        streak: 0,
      },
      {
        id: uid(),
        title: '记账复盘',
        frequency: 'daily',
        expReward: 20,
        statBonus: 'intelligence',
        streak: 0,
      },
    ],
  };
}

export function createQuest(title: string, difficulty: QuestDifficulty, tasks: QuestTask[] = []): Quest {
  return {
    id: uid(),
    title,
    difficulty,
    expReward: DIFFICULTY_EXP[difficulty],
    goldReward: DIFFICULTY_GOLD[difficulty],
    completed: false,
    tasks,
  };
}

export function applyStatBonus(stats: CharacterStats, key?: StatKey, amount = 1): CharacterStats {
  if (!key) return stats;
  return { ...stats, [key]: stats[key] + amount };
}
