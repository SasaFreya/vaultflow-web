import { CHARACTER_PRESETS } from '@/lib/rpg-characters';
import { useLifeRPG } from '@/hooks/useLifeRPG';

export default function CharacterSelector() {
  const { data, setCharacterPreset } = useLifeRPG();

  return (
    <div
      className="rounded-2xl p-4 rpg-panel space-y-3"
      style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <p className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>
        选择角色
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {CHARACTER_PRESETS.map(preset => {
          const selected = data.selectedCharacterId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setCharacterPreset(preset.id)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
              style={{
                backgroundColor: selected ? 'var(--rpg-primary)' : 'var(--rpg-bg)',
                border: `2px solid ${selected ? 'var(--rpg-primary)' : 'var(--rpg-border)'}`,
                boxShadow: selected ? 'var(--rpg-glow, 0 0 12px rgba(74,144,226,0.3))' : 'none',
                transform: selected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <span className="text-2xl">{preset.emoji}</span>
              <span
                className="text-[10px] font-medium truncate w-full text-center"
                style={{ color: selected ? '#fff' : 'var(--rpg-text-secondary)' }}
              >
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
