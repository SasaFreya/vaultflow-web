import { Skull, Swords, Trophy } from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { computeBosses } from '@/lib/rpg-bosses';
import { formatCurrency } from '@/lib/storage';
import RPGProgressBar from './RPGProgressBar';

export default function BossList() {
  const { data: vaultData, settings } = useVaultData();
  const { data, defeatBoss } = useLifeRPG();

  const bosses = computeBosses(vaultData.goals, data.claimedBossIds);
  const activeBosses = bosses.filter(b => !b.defeated);
  const defeatedBosses = bosses.filter(b => b.defeated);

  return (
    <div
      id="rpg-section-bosses"
      className="rounded-2xl p-5 space-y-4 rpg-panel"
      style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <div className="flex items-center gap-2">
        <Skull className="w-4 h-4" style={{ color: 'var(--rpg-gold, #FFD700)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>
          财富 Boss
        </h3>
        <span className="text-xs" style={{ color: 'var(--rpg-text-secondary)' }}>
          来自心愿目标
        </span>
      </div>

      {activeBosses.length === 0 && defeatedBosses.length === 0 && (
        <p className="text-xs text-center py-6" style={{ color: 'var(--rpg-text-secondary)' }}>
          在「心愿目标」页添加储蓄目标，Boss 会自动出现在这里
        </p>
      )}

      <ul className="space-y-3">
        {activeBosses.map(boss => (
          <li
            key={boss.goalId}
            className="p-4 rounded-xl space-y-3"
            style={{
              backgroundColor: 'var(--rpg-bg)',
              border: `1px solid ${boss.color}44`,
              boxShadow: boss.canDefeat ? `0 0 20px ${boss.color}33` : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--rpg-text)' }}>
                  <span>👹</span> {boss.name}
                </p>
                <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--rpg-text-secondary)' }}>
                  {formatCurrency(boss.currentAmount, settings.baseCurrency)} / {formatCurrency(boss.targetAmount, settings.baseCurrency)}
                </p>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: `${boss.color}22`, color: boss.color }}
              >
                HP {boss.hpRemaining}%
              </span>
            </div>

            <RPGProgressBar
              label="Boss 血量"
              value={boss.hpRemaining}
              max={100}
              color={boss.color}
              showValues={false}
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono" style={{ color: 'var(--rpg-gold, #FFD700)' }}>
                击败奖励: +{boss.expReward} EXP · +{boss.goldReward} 🪙
              </span>
              {boss.canDefeat ? (
                <button
                  type="button"
                  onClick={() => defeatBoss(boss.goalId, boss.name, boss.expReward, boss.goldReward)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
                    color: '#1a1a1a',
                  }}
                >
                  <Swords className="w-3 h-3" />
                  击败 Boss!
                </button>
              ) : (
                <span className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
                  进度 {boss.progress}% — 存满即可挑战
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {defeatedBosses.length > 0 && (
        <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--rpg-border)' }}>
          <p className="text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--rpg-text-secondary)', opacity: 0.6 }}>
            <Trophy className="w-3 h-3" /> 已击败 {defeatedBosses.length}
          </p>
          {defeatedBosses.map(b => (
            <p key={b.goalId} className="text-xs line-through opacity-50" style={{ color: 'var(--rpg-text-secondary)' }}>
              👹 {b.name}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
