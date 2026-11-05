import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  BossDefeatEvent,
  HabitUpdateInput,
  LifeRPGData,
  QuestDifficulty,
  QuestUpdateInput,
  RewardEvent,
  RPGThemeId,
  StatKey,
} from '@/types/rpg';
import {
  applyStatBonus,
  canCompleteQuest,
  createDefaultRPGData,
  createQuest,
  createQuestTask,
  DIFFICULTY_EXP,
  DIFFICULTY_GOLD,
  getLevel,
  getLevelInfo,
  getStreakMultiplier,
  todayStr,
  uid,
} from '@/lib/rpg';
import { applyStatDeltas, computeCheckInRewards, type CheckInDuration } from '@/lib/town-checkin';
import type { LocationCategory } from '@/types/town';
import { applyComfortBonus } from '@/lib/town-utils';
import { loadRPGData, saveRPGData } from '@/lib/rpg-persistence';
import {
  registerStreakRewardGrant,
  unregisterStreakRewardGrant,
  streakRewardAmount,
} from '@/lib/eco-streak-reward-bridge';
import {
  registerWeatherRewardGrant,
  unregisterWeatherRewardGrant,
} from '@/lib/eco-weather-reward-bridge';
import { applyWeatherExpBonus } from '@/lib/town-weather-ecology';
import { isStreakRewardNotifyEnabled } from '@/lib/eco-notify-settings';
import { showEcoNotification } from '@/lib/eco-lag-notify';
import { triggerLoftPose } from '@/lib/eco-data-events';
import {
  playBossDefeatSound,
  playHabitCompleteSound,
  playLevelUpSound,
  playQuestCompleteSound,
} from '@/lib/rpg-sounds';

interface LifeRPGContextValue {
  ready: boolean;
  data: LifeRPGData;
  levelInfo: ReturnType<typeof getLevelInfo>;
  recentRewards: RewardEvent[];
  levelUpLevel: number | null;
  bossDefeat: BossDefeatEvent | null;
  dismissLevelUp: () => void;
  dismissBossDefeat: () => void;
  completeQuest: (id: string) => void;
  completeHabit: (id: string) => void;
  addQuest: (title: string, difficulty: QuestDifficulty) => void;
  updateQuest: (id: string, input: QuestUpdateInput) => void;
  deleteQuest: (id: string) => void;
  addQuestTask: (questId: string, title: string) => void;
  toggleQuestTask: (questId: string, taskId: string) => void;
  deleteQuestTask: (questId: string, taskId: string) => void;
  addHabit: (title: string) => void;
  updateHabit: (id: string, input: HabitUpdateInput) => void;
  deleteHabit: (id: string) => void;
  allocateStat: (key: StatKey) => void;
  setCharacterName: (name: string) => void;
  setCharacterPreset: (characterId: string) => void;
  setTheme: (theme: RPGThemeId) => void;
  setSoundEnabled: (enabled: boolean) => void;
  defeatBoss: (goalId: string, name: string, exp: number, gold: number) => void;
  spendGold: (amount: number) => boolean;
  applyCheckInRewards: (
    category: LocationCategory,
    durationMin: CheckInDuration,
    comfortBonus: number,
    weatherBonusPct?: number,
  ) => { exp: number; gold: number; lines: string[] };
  grantBonusExp: (exp: number, label: string) => void;
  resetRPG: () => Promise<void>;
  grantStreakReward: (streakMonths: number) => void;
}

const LifeRPGContext = createContext<LifeRPGContextValue | null>(null);

export function LifeRPGProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LifeRPGData | null>(null);
  const [ready, setReady] = useState(false);
  const [recentRewards, setRecentRewards] = useState<RewardEvent[]>([]);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [bossDefeat, setBossDefeat] = useState<BossDefeatEvent | null>(null);
  const prevLevelRef = useRef(1);

  useEffect(() => {
    loadRPGData().then(loaded => {
      setData(loaded);
      prevLevelRef.current = getLevel(loaded.totalExp);
      setReady(true);
    });
  }, []);

  const persist = useCallback(async (next: LifeRPGData) => {
    setData(next);
    await saveRPGData(next);
  }, []);

  const pushReward = useCallback((exp: number, gold: number) => {
    const event: RewardEvent = { id: uid(), exp, gold };
    setRecentRewards(prev => [...prev.slice(-4), event]);
    triggerLoftPose('jump');
    setTimeout(() => {
      setRecentRewards(prev => prev.filter(r => r.id !== event.id));
    }, 2500);
  }, []);

  const triggerLevelUp = useCallback((newLevel: number, soundEnabled: boolean) => {
    if (newLevel > prevLevelRef.current) {
      prevLevelRef.current = newLevel;
      setLevelUpLevel(newLevel);
      triggerLoftPose('wave');
      playLevelUpSound(soundEnabled);
    }
  }, []);

  const grantRewards = useCallback(
    async (
      base: LifeRPGData,
      exp: number,
      gold: number,
      statBonus?: StatKey,
      sound: 'quest' | 'habit' | 'boss' = 'quest',
      bossName?: string,
    ) => {
      const oldLevel = getLevel(base.totalExp);
      const totalExp = base.totalExp + exp;
      const newLevel = getLevel(totalExp);
      const levelDiff = newLevel - oldLevel;

      const next: LifeRPGData = {
        ...base,
        totalExp,
        gold: base.gold + gold,
        hp: Math.min(base.maxHp, base.hp + 5),
        mp: Math.min(base.maxMp, base.mp + 3),
        stats: applyStatBonus(base.stats, statBonus),
        statPoints: base.statPoints + levelDiff * 2,
      };

      await persist(next);
      pushReward(exp, gold);

      if (sound === 'quest') playQuestCompleteSound(base.soundEnabled);
      if (sound === 'habit') playHabitCompleteSound(base.soundEnabled);
      if (sound === 'boss') {
        playBossDefeatSound(base.soundEnabled);
        if (bossName) setBossDefeat({ name: bossName, exp, gold });
      }

      triggerLevelUp(newLevel, base.soundEnabled);
    },
    [persist, pushReward, triggerLevelUp],
  );

  const grantStreakReward = useCallback(
    (streakMonths: number) => {
      if (!data || streakMonths < 1) return;
      const { exp, gold } = streakRewardAmount(streakMonths);
      void grantRewards(data, exp, gold, 'intelligence', 'habit');
      if (isStreakRewardNotifyEnabled()) {
        void showEcoNotification(
          `🔥 连续 ${streakMonths} 月达标`,
          `获得 +${exp} EXP · +${gold} 金币`,
        );
      }
    },
    [data, grantRewards],
  );

  useEffect(() => {
    registerStreakRewardGrant(grantStreakReward);
    return () => unregisterStreakRewardGrant();
  }, [grantStreakReward]);

  const grantBonusExp = useCallback(
    (bonusExp: number, _label: string) => {
      if (!data || bonusExp <= 0) return;
      void grantRewards(data, bonusExp, 0, 'intelligence', 'habit');
    },
    [data, grantRewards],
  );

  useEffect(() => {
    registerWeatherRewardGrant(grantBonusExp);
    return () => unregisterWeatherRewardGrant();
  }, [grantBonusExp]);

  const completeQuest = useCallback(
    (id: string) => {
      if (!data) return;
      const quest = data.quests.find(q => q.id === id);
      if (!quest || !canCompleteQuest(quest)) return;

      const quests = data.quests.map(q =>
        q.id === id ? { ...q, completed: true, completedAt: new Date().toISOString() } : q,
      );
      void grantRewards({ ...data, quests }, quest.expReward, quest.goldReward, quest.statBonus, 'quest');
    },
    [data, grantRewards],
  );

  const completeHabit = useCallback(
    (id: string) => {
      if (!data) return;
      const habit = data.habits.find(h => h.id === id);
      if (!habit) return;

      const today = todayStr();
      if (habit.lastCompletedDate === today) return;

      const streak = habit.lastCompletedDate
        ? (() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().slice(0, 10);
            return habit.lastCompletedDate === yStr ? habit.streak + 1 : 1;
          })()
        : 1;

      const multiplier = getStreakMultiplier(streak);
      const exp = Math.round(habit.expReward * multiplier);
      const gold = Math.round(habit.expReward * 0.2 * multiplier);

      const habits = data.habits.map(h =>
        h.id === id ? { ...h, lastCompletedDate: today, streak } : h,
      );
      void grantRewards({ ...data, habits }, exp, gold, habit.statBonus, 'habit');
    },
    [data, grantRewards],
  );

  const defeatBoss = useCallback(
    (goalId: string, name: string, exp: number, gold: number) => {
      if (!data || data.claimedBossIds.includes(goalId)) return;
      const next = {
        ...data,
        claimedBossIds: [...data.claimedBossIds, goalId],
      };
      void grantRewards(next, exp, gold, 'intelligence', 'boss', name);
    },
    [data, grantRewards],
  );

  const applyCheckInRewards = useCallback(
    (
      category: LocationCategory,
      durationMin: CheckInDuration,
      comfortBonus: number,
      weatherBonusPct = 0,
    ) => {
      if (!data) return { exp: 0, gold: 0, lines: [] };

      const base = computeCheckInRewards(category, durationMin);
      let exp = applyComfortBonus(base.exp, comfortBonus);
      const gold = applyComfortBonus(base.gold, comfortBonus);
      if (weatherBonusPct > 0) {
        exp = applyWeatherExpBonus(exp, weatherBonusPct);
      }

      const oldLevel = getLevel(data.totalExp);
      const totalExp = data.totalExp + exp;
      const newLevel = getLevel(totalExp);
      const levelDiff = newLevel - oldLevel;

      const next: LifeRPGData = {
        ...data,
        totalExp,
        gold: data.gold + gold,
        hp: Math.min(data.maxHp, data.hp + 5),
        mp: Math.min(data.maxMp, data.mp + 3),
        stats: applyStatDeltas(data.stats, base.statDeltas),
        statPoints: data.statPoints + levelDiff * 2,
      };

      void persist(next);
      pushReward(exp, gold);
      playHabitCompleteSound(data.soundEnabled);
      triggerLevelUp(newLevel, data.soundEnabled);

      const lines = [
        ...base.lines,
        ...(comfortBonus > 0 ? [`🏠 舒适加成 +${Math.round(comfortBonus * 100)}%`] : []),
        ...(weatherBonusPct > 0 ? [`🌦️ 天气加成 +${weatherBonusPct}%`] : []),
      ];
      return { exp, gold, lines };
    },
    [data, persist, pushReward, triggerLevelUp],
  );

  const addQuest = useCallback(
    (title: string, difficulty: QuestDifficulty) => {
      if (!data || !title.trim()) return;
      void persist({ ...data, quests: [...data.quests, createQuest(title.trim(), difficulty)] });
    },
    [data, persist],
  );

  const updateQuest = useCallback(
    (id: string, input: QuestUpdateInput) => {
      if (!data) return;
      void persist({
        ...data,
        quests: data.quests.map(q => {
          if (q.id !== id) return q;
          const next = { ...q, ...input };
          if (input.difficulty) {
            next.expReward = DIFFICULTY_EXP[input.difficulty];
            next.goldReward = DIFFICULTY_GOLD[input.difficulty];
          }
          return next;
        }),
      });
    },
    [data, persist],
  );

  const deleteQuest = useCallback(
    (id: string) => {
      if (!data) return;
      void persist({ ...data, quests: data.quests.filter(q => q.id !== id) });
    },
    [data, persist],
  );

  const addQuestTask = useCallback(
    (questId: string, title: string) => {
      if (!data || !title.trim()) return;
      void persist({
        ...data,
        quests: data.quests.map(q =>
          q.id === questId ? { ...q, tasks: [...q.tasks, createQuestTask(title)] } : q,
        ),
      });
    },
    [data, persist],
  );

  const toggleQuestTask = useCallback(
    (questId: string, taskId: string) => {
      if (!data) return;
      void persist({
        ...data,
        quests: data.quests.map(q =>
          q.id === questId
            ? {
                ...q,
                tasks: q.tasks.map(t =>
                  t.id === taskId ? { ...t, completed: !t.completed } : t,
                ),
              }
            : q,
        ),
      });
    },
    [data, persist],
  );

  const deleteQuestTask = useCallback(
    (questId: string, taskId: string) => {
      if (!data) return;
      void persist({
        ...data,
        quests: data.quests.map(q =>
          q.id === questId ? { ...q, tasks: q.tasks.filter(t => t.id !== taskId) } : q,
        ),
      });
    },
    [data, persist],
  );

  const addHabit = useCallback(
    (title: string) => {
      if (!data || !title.trim()) return;
      void persist({
        ...data,
        habits: [
          ...data.habits,
          { id: uid(), title: title.trim(), frequency: 'daily', expReward: 25, streak: 0, icon: '✨' },
        ],
      });
    },
    [data, persist],
  );

  const updateHabit = useCallback(
    (id: string, input: HabitUpdateInput) => {
      if (!data) return;
      void persist({
        ...data,
        habits: data.habits.map(h => (h.id === id ? { ...h, ...input } : h)),
      });
    },
    [data, persist],
  );

  const deleteHabit = useCallback(
    (id: string) => {
      if (!data) return;
      void persist({ ...data, habits: data.habits.filter(h => h.id !== id) });
    },
    [data, persist],
  );

  const allocateStat = useCallback(
    (key: StatKey) => {
      if (!data || data.statPoints <= 0) return;
      void persist({
        ...data,
        statPoints: data.statPoints - 1,
        stats: { ...data.stats, [key]: data.stats[key] + 1 },
      });
    },
    [data, persist],
  );

  const setCharacterName = useCallback(
    (name: string) => {
      if (!data) return;
      void persist({ ...data, characterName: name.trim() || '冒险者' });
    },
    [data, persist],
  );

  const setCharacterPreset = useCallback(
    (characterId: string) => {
      if (!data) return;
      void persist({ ...data, selectedCharacterId: characterId });
    },
    [data, persist],
  );

  const setTheme = useCallback(
    (theme: RPGThemeId) => {
      if (!data) return;
      void persist({ ...data, theme });
    },
    [data, persist],
  );

  const setSoundEnabled = useCallback(
    (soundEnabled: boolean) => {
      if (!data) return;
      void persist({ ...data, soundEnabled });
    },
    [data, persist],
  );

  const spendGold = useCallback(
    (amount: number): boolean => {
      if (!data || data.gold < amount) return false;
      void persist({ ...data, gold: data.gold - amount });
      return true;
    },
    [data, persist],
  );

  const resetRPG = useCallback(async () => {
    const fresh = createDefaultRPGData();
    prevLevelRef.current = 1;
    setLevelUpLevel(null);
    setBossDefeat(null);
    await persist(fresh);
  }, [persist]);

  const dismissLevelUp = useCallback(() => setLevelUpLevel(null), []);
  const dismissBossDefeat = useCallback(() => setBossDefeat(null), []);

  const levelInfo = useMemo(
    () => getLevelInfo(data?.totalExp ?? 0),
    [data?.totalExp],
  );

  if (!data) {
    return (
      <div
        className="min-h-[200px] flex items-center justify-center"
        style={{ color: 'var(--vault-text-secondary)' }}
      >
        <p className="text-sm animate-pulse">加载人生 RPG…</p>
      </div>
    );
  }

  return (
    <LifeRPGContext.Provider
      value={{
        ready,
        data,
        levelInfo,
        recentRewards,
        levelUpLevel,
        bossDefeat,
        dismissLevelUp,
        dismissBossDefeat,
        completeQuest,
        completeHabit,
        addQuest,
        updateQuest,
        deleteQuest,
        addQuestTask,
        toggleQuestTask,
        deleteQuestTask,
        addHabit,
        updateHabit,
        deleteHabit,
        allocateStat,
        setCharacterName,
        setCharacterPreset,
        setTheme,
        setSoundEnabled,
        defeatBoss,
        spendGold,
        applyCheckInRewards,
        grantBonusExp,
        resetRPG,
        grantStreakReward,
      }}
    >
      {children}
    </LifeRPGContext.Provider>
  );
}

export function useLifeRPG() {
  const ctx = useContext(LifeRPGContext);
  if (!ctx) throw new Error('useLifeRPG must be used within LifeRPGProvider');
  return ctx;
}
