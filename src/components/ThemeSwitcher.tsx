import { useTheme, THEMES } from '@/hooks/useTheme';

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={compact ? 'flex items-center gap-1' : 'space-y-2'}>
      {!compact && (
        <p className="text-xs" style={{ color: 'var(--vault-text-secondary)' }}>外观主题</p>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {THEMES.map(t => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => setTheme(t.id)}
            className="relative rounded-lg transition-all duration-300"
            style={{
              width: compact ? 28 : 36,
              height: compact ? 28 : 36,
              backgroundColor: t.preview,
              border: theme === t.id
                ? '2px solid var(--vault-primary)'
                : '2px solid var(--vault-border)',
              boxShadow: theme === t.id ? '0 0 0 2px color-mix(in srgb, var(--vault-primary) 30%, transparent)' : 'none',
              transform: theme === t.id ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {!compact && (
              <span
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap"
                style={{ color: theme === t.id ? 'var(--vault-primary)' : 'var(--vault-text-secondary)' }}
              >
                {t.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
