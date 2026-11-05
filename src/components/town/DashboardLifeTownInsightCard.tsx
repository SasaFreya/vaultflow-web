import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { loadLifeMemoriesData } from '@/lib/life-memories-persistence';
import type { LifeTownMemoriesData } from '@/types/life-town';
import { buildCityLifeReport } from '@/lib/life-town-report';
import { generateLifeTownInsights } from '@/lib/life-town-insights';
import { projectNetWorthThroughEndOfMonth } from '@/lib/calendar-projection';
import { LifeTownInsightsPanel } from '@/components/town/LifeTownInsightsPanel';

/** 资产大盘 · P3 共生反哺卡片（独立加载回忆数据，不依赖 Town Provider） */
export function DashboardLifeTownInsightCard() {
  const { data, totals } = useVaultData();
  const [townData, setTownData] = useState<LifeTownMemoriesData | null>(null);

  useEffect(() => {
    loadLifeMemoriesData().then(setTownData).catch(() => setTownData(null));
  }, []);

  const insights = useMemo(() => {
    if (!townData) return [];
    const projectedNetWorth = projectNetWorthThroughEndOfMonth(totals.netWorth, data.calendarEvents);
    const report = buildCityLifeReport(
      townData.activeCityId,
      townData.memories,
      data.transactions,
      'month',
    );
    return generateLifeTownInsights({
      memories: townData.memories,
      transactions: data.transactions,
      calendarEvents: data.calendarEvents,
      netWorth: totals.netWorth,
      projectedNetWorth,
      period: 'month',
      report,
    }).slice(0, 2);
  }, [townData, data.transactions, data.calendarEvents, totals.netWorth]);

  if (!townData || insights.length === 0) return null;

  return (
    <div className="vault-card animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--vault-primary)' }} />
          <h3 className="text-sm font-semibold vault-heading">人生小镇 · 生活洞察</h3>
        </div>
        <Link to="/town/memories/report" className="text-[10px] vault-muted hover:underline">
          完整报告
        </Link>
      </div>
      <div className="space-y-2">
        <LifeTownInsightsPanel insights={insights} title="" compact surface="vault" />
      </div>
    </div>
  );
}
