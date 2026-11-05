import { RPG_THEMES } from '@/lib/rpg-themes';
import { useLifeRPG } from '@/hooks/useLifeRPG';

export default function RPGThemeSwitcher() {
  const { data, setTheme } = useLifeRPG();

  return (
    <div className="flex flex-wrap gap-1.5">
      {RPG_THEMES.map(theme => (
        <button
          key={theme.id}
          type="button"
          onClick={() => setTheme(theme.id)}
          className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
          style={{
            backgroundColor: data.theme === theme.id ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
            color: data.theme === theme.id ? '#fff' : 'var(--rpg-text-secondary)',
            border: `1px solid ${data.theme === theme.id ? 'var(--rpg-primary)' : 'var(--rpg-border)'}`,
            boxShadow: data.theme === theme.id ? 'var(--rpg-glow, none)' : 'none',
          }}
        >
          {theme.emoji} {theme.label}
        </button>
      ))}
    </div>
  );
}
