import { Link } from 'react-router-dom';

interface ExploreEcosystemBarProps {
  cityName: string;
  totalMemories: number;
  linkedBills: number;
  financeSignals: number;
  activeDomains: number;
}

export default function ExploreEcosystemBar({
  cityName,
  totalMemories,
  linkedBills,
  financeSignals,
  activeDomains,
}: ExploreEcosystemBarProps) {
  return (
    <div className="explore-ecosystem-bar">
      <div className="explore-ecosystem-bar-main">
        <span className="explore-ecosystem-bar-title">{cityName} · 人生生态</span>
        <span className="explore-ecosystem-bar-desc">
          账单窥见现实 · 自述补充回忆 · 投射到五个生活域
        </span>
      </div>
      <div className="explore-ecosystem-bar-stats">
        <span className="explore-ecosystem-stat">💭 {totalMemories} 条回忆</span>
        <span className="explore-ecosystem-stat">🔗 {linkedBills} 链账单</span>
        <span className="explore-ecosystem-stat">📊 {financeSignals} 笔账单信号</span>
        <span className="explore-ecosystem-stat">🌱 {activeDomains}/5 域活跃</span>
      </div>
      <Link to="/town/loft?tab=memories&compose=1" className="explore-ecosystem-bar-cta">
        补充现实回忆
      </Link>
    </div>
  );
}
