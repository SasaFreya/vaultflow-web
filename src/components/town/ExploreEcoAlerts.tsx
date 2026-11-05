import type { EcoAlert } from '@/lib/explore-ecology-ext';
import type { BuildingType } from '@/types/life-town';

interface ExploreEcoAlertsProps {
  alerts: EcoAlert[];
  onAlertClick: (buildingType: BuildingType, action?: EcoAlert['action']) => void;
}

export default function ExploreEcoAlerts({ alerts, onAlertClick }: ExploreEcoAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="explore-eco-alerts">
      {alerts.map(a => (
        <button
          key={a.id}
          type="button"
          className={`explore-eco-alert explore-eco-alert--${a.severity} ${a.action === 'ai_echo' ? 'explore-eco-alert--echo' : ''}`}
          onClick={() => onAlertClick(a.buildingType, a.action)}
        >
          <span className="explore-eco-alert-emoji">{a.emoji}</span>
          <span className="explore-eco-alert-text">
            <strong>{a.title}</strong>
            <small>{a.body}</small>
          </span>
          {a.action === 'ai_echo' && <span className="explore-eco-alert-action">✨ AI</span>}
        </button>
      ))}
    </div>
  );
}
