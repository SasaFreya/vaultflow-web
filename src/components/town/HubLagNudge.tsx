import type { EcoAlert } from '@/lib/explore-ecology-ext';
import type { BuildingType } from '@/types/life-town';

interface HubLagNudgeProps {
  alerts: EcoAlert[];
  onOpenDomain: (buildingType: BuildingType) => void;
  onAiEcho: (buildingType: BuildingType) => void;
}

/** Hub 时钟塔区域的滞后提醒条 */
export default function HubLagNudge({ alerts, onOpenDomain, onAiEcho }: HubLagNudgeProps) {
  const lagAlerts = alerts.filter(a => a.action === 'ai_echo');
  if (lagAlerts.length === 0) return null;

  const first = lagAlerts[0];

  return (
    <div className="hub-lag-nudge">
      <span className="hub-lag-nudge-emoji">⏳</span>
      <div className="hub-lag-nudge-text">
        <strong>{lagAlerts.length} 条账单等待回忆回声</strong>
        <small>{first.title}</small>
      </div>
      <button type="button" className="hub-lag-nudge-btn" onClick={() => onAiEcho(first.buildingType)}>
        AI 回声
      </button>
      <button type="button" className="hub-lag-nudge-btn hub-lag-nudge-btn--ghost" onClick={() => onOpenDomain(first.buildingType)}>
        查看
      </button>
    </div>
  );
}
