import { Plus } from 'lucide-react';
import type { StatKey } from '@/types/rpg';
import { STAT_ICONS, STAT_LABELS } from '@/lib/rpg';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import RPGProgressBar from './RPGProgressBar';

export default function StatsPanel() {
  const { data, levelInfo, allocateStat } = useLifeRPG();
  const stats = Object.entries(data.stats) as [StatKey, number][];

  return (
    <div
      className="rounded-2xl p-5 space-y-4 rpg-panel"
      style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>
          属性面板
        </h3>
        {data.statPoints > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
            style={{ backgroundColor: 'rgba(255,215,0,0.15)', color: 'var(--rpg-gold, #FFD700)' }}
          >
            +{data.statPoints} 可分配
          </span>
        )}
      </div>

      <RPGProgressBar
        label={`经验值 · Lv.${levelInfo.level}`}
        value={data.totalExp - levelInfo.currentLevelExp}
        max={levelInfo.nextLevelExp - levelInfo.currentLevelExp}
        color="var(--rpg-primary)"
      />

      <div className="grid grid-cols-2 gap-2">
        <RPGProgressBar label="HP" value={data.hp} max={data.maxHp} color="#EF4444" />
        <RPGProgressBar label="MP" value={data.mp} max={data.maxMp} color="#3B82F6" />
      </div>

      <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--rpg-border)' }}>
        {stats.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-base w-6">{STAT_ICONS[key]}</span>
            <div className="flex-1 min-w-0">
              <RPGProgressBar
                label={STAT_LABELS[key]}
                value={value}
                max={100}
                color="var(--rpg-accent)"
                showValues
              />
            </div>
            {data.statPoints > 0 && (
              <button
                type="button"
                onClick={() => allocateStat(key)}
                className="p-1 rounded-md transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--rpg-primary)', color: '#fff' }}
                title={`分配 1 点到${STAT_LABELS[key]}`}
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between pt-2 border-t text-sm"
        style={{ borderColor: 'var(--rpg-border)' }}
      >
        <span style={{ color: 'var(--rpg-text-secondary)' }}>金币</span>
        <span className="font-bold font-mono tabular-nums" style={{ color: 'var(--rpg-gold, #FFD700)' }}>
          🪙 {data.gold}
        </span>
      </div>
    </div>
  );
}
