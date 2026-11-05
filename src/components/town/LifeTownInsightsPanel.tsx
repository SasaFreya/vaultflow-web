import { Link } from 'react-router-dom';
import type { LifeTownInsight } from '@/lib/life-town-insights';

type Surface = 'rpg' | 'vault';

const KIND_ACCENT: Record<LifeTownInsight['kind'], string> = {
  reminder: 'var(--insight-primary)',
  celebration: 'var(--insight-gold)',
  finance: 'var(--insight-accent)',
  wellbeing: '#A78BFA',
};

function InsightItem({
  insight,
  compact,
  surface,
}: {
  insight: LifeTownInsight;
  compact?: boolean;
  surface: Surface;
}) {
  const accent = KIND_ACCENT[insight.kind];
  const bg = surface === 'vault' ? 'var(--vault-surface)' : 'var(--rpg-surface)';

  return (
    <div
      className={`rounded-xl ${compact ? 'p-3' : 'p-4'} space-y-1.5`}
      style={{
        background: bg,
        border: `1px solid ${accent}`,
        boxShadow: surface === 'rpg' ? 'var(--rpg-glow, none)' : 'none',
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none shrink-0">{insight.emoji}</span>
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}
            style={{ color: 'var(--insight-text)' }}
          >
            {insight.title}
          </p>
          <p
            className={`mt-0.5 leading-relaxed ${compact ? 'text-[10px]' : 'text-xs'}`}
            style={{ color: 'var(--insight-text-secondary)' }}
          >
            {insight.body}
          </p>
          {insight.actionPath && insight.actionLabel && (
            <Link
              to={insight.actionPath}
              className={`inline-block mt-2 font-medium underline-offset-2 hover:underline ${compact ? 'text-[10px]' : 'text-xs'}`}
              style={{ color: 'var(--insight-primary)' }}
            >
              {insight.actionLabel} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function LifeTownInsightsPanel({
  insights,
  title = '反哺现实',
  subtitle = '从小镇数据提炼的可行动建议',
  compact,
  surface = 'rpg',
}: {
  insights: LifeTownInsight[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
  surface?: Surface;
}) {
  if (insights.length === 0) return null;

  const cssVars =
    surface === 'vault'
      ? ({
          '--insight-text': 'var(--vault-text)',
          '--insight-text-secondary': 'var(--vault-text-secondary)',
          '--insight-primary': 'var(--vault-primary)',
          '--insight-accent': 'var(--vault-accent)',
          '--insight-gold': 'var(--vault-yellow)',
        } as Record<string, string>)
      : ({
          '--insight-text': 'var(--rpg-text)',
          '--insight-text-secondary': 'var(--rpg-text-secondary)',
          '--insight-primary': 'var(--rpg-primary)',
          '--insight-accent': 'var(--rpg-accent)',
          '--insight-gold': 'var(--rpg-gold, #F5A623)',
        } as Record<string, string>);

  return (
    <section className="space-y-3" style={cssVars}>
      {title && (
        <div>
          <h3
            className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}
            style={{ color: 'var(--insight-text)' }}
          >
            {title}
          </h3>
          {!compact && subtitle && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--insight-text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className={`space-y-2 ${compact ? '' : 'space-y-3'}`}>
        {insights.map(i => (
          <InsightItem key={i.id} insight={i} compact={compact} surface={surface} />
        ))}
      </div>
    </section>
  );
}
