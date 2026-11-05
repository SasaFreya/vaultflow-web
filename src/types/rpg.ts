export type QuestDifficulty = 'normal' | 'hard' | 'epic';
export type HabitFrequency = 'daily' | 'weekly';
export type StatKey = 'strength' | 'intelligence' | 'charm' | 'aura';
export type RPGThemeId = 'classic' | 'cyberpunk' | 'pixel' | 'obi';
export type RoomPanel = 'quests' | 'habits' | 'bosses' | 'stats';

export interface WealthBoss {
  goalId: string;
  name: string;
  progress: number;
  hpRemaining: number;
  targetAmount: number;
  currentAmount: number;
  color: string;
  canDefeat: boolean;
  defeated: boolean;
  expReward: number;
  goldReward: number;
}

export interface CharacterStats {
  strength: number;
  intelligence: number;
  charm: number;
  aura: number;
}

export interface QuestTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  difficulty: QuestDifficulty;
  expReward: number;
  goldReward: number;
  completed: boolean;
  completedAt?: string;
  statBonus?: StatKey;
  deadline?: string;
  tasks: QuestTask[];
}

export interface Habit {
  id: string;
  title: string;
  frequency: HabitFrequency;
  expReward: number;
  statBonus?: StatKey;
  lastCompletedDate?: string;
  streak: number;
  color?: string;
  icon?: string;
}

export interface CharacterPreset {
  id: string;
  name: string;
  emoji: string;
  skinColor: string;
  bodyColor: string;
  hairColor: string;
  modelPath?: string;
}

export interface LifeRPGData {
  characterName: string;
  selectedCharacterId: string;
  totalExp: number;
  gold: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: CharacterStats;
  statPoints: number;
  quests: Quest[];
  habits: Habit[];
  modelPath?: string;
  theme: RPGThemeId;
  soundEnabled: boolean;
  claimedBossIds: string[];
}

export interface RewardEvent {
  id: string;
  exp: number;
  gold: number;
}

export interface BossDefeatEvent {
  name: string;
  exp: number;
  gold: number;
}

export interface LevelInfo {
  level: number;
  currentLevelExp: number;
  nextLevelExp: number;
  progress: number;
}

export interface QuestUpdateInput {
  title?: string;
  description?: string;
  difficulty?: QuestDifficulty;
  deadline?: string;
  statBonus?: StatKey;
}

export interface HabitUpdateInput {
  title?: string;
  frequency?: HabitFrequency;
  expReward?: number;
  color?: string;
  icon?: string;
  statBonus?: StatKey;
}
