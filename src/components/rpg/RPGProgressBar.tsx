interface RPGProgressBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  showValues?: boolean;
}

export default function RPGProgressBar({
  label,
  value,
  max,
  color = 'var(--rpg-primary)',
  showValues = true,
}: RPGProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--rpg-text-secondary)' }}>{label}</span>
          {showValues && (
            <span className="font-mono tabular-nums" style={{ color: 'var(--rpg-text)' }}>
              {Math.round(value)}/{max}
            </span>
          )}
        </div>
      ) : null}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--rpg-border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
