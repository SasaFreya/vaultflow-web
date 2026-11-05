import { useMemo, useState, useEffect } from 'react';
import { BarChart3, BookHeart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TownPageShell } from '@/components/town/TownNav';
import { useLifeMemories } from '@/hooks/useLifeMemories';
import { useVaultData } from '@/hooks/useVaultData';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import type { ReportPeriod } from '@/lib/life-town-report';
import { buildCityLifeReport } from '@/lib/life-town-report';
import {
  BUILDING_META,
  BUILDING_TYPES,
  MOOD_OPTIONS,
} from '@/lib/life-memories-data';
import { LIFE_DOMAIN_META } from '@/lib/explore-ecosystem';
import { formatCurrency } from '@/lib/storage';
import { findTransactionById } from '@/lib/life-town-link';
import { projectNetWorthThroughEndOfMonth } from '@/lib/calendar-projection';
import { generateLifeTownInsights } from '@/lib/life-town-insights';
import { LifeTownInsightsPanel } from '@/components/town/LifeTownInsightsPanel';
import DomainBalanceRadar from '@/components/town/DomainBalanceRadar';
import SeasonReportSection from '@/components/town/SeasonReportSection';
import DomainGoalsPanel from '@/components/town/DomainGoalsPanel';
import EcoSyncPanel from '@/components/town/EcoSyncPanel';
import LifeRelationGraph from '@/components/town/LifeRelationGraph';
import {
  computeDomainRadarData,
  buildSeasonQuarterReport,
  computeDomainBalanceScore,
} from '@/lib/explore-ecology-ext';
import { computeExploreEcosystem } from '@/lib/explore-ecosystem';
import { buildLifeRelationGraph, buildCrossCityRelationGraph } from '@/lib/life-relation-graph';
import {
  shouldPromptSeasonShare,
  markSeasonSharePrompted,
} from '@/lib/season-auto-share';
import SeasonSharePreviewCard from '@/components/town/SeasonSharePreviewCard';
import type { BuildingType } from '@/types/life-town';
import { onPersonTagConfigUpdated } from '@/lib/eco-data-events';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <p className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>{label}</p>
      <p className="text-lg font-bold font-mono mt-0.5" style={{ color: 'var(--rpg-text)' }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--rpg-text-secondary)' }}>{sub}</p>}
    </div>
  );
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]" style={{ color: 'var(--rpg-text)' }}>
        <span>{label}</span>
        <span className="font-mono">{count}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--rpg-bg)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color ?? 'var(--rpg-primary)' }}
        />
      </div>
    </div>
  );
}

export default function MemoriesReportPage() {
  const navigate = useNavigate();
  const { data: rpg } = useLifeRPG();
  const { data: vaultData, totals } = useVaultData();
  const { data, activeCityId, activeCity, setActiveCityId, updateDomainGoals, reloadFromDisk } = useLifeMemories();
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [graphMode, setGraphMode] = useState<'city' | 'cross'>('city');
  const [graphPersonPick, setGraphPersonPick] = useState<string[]>([]);
  const [seasonShareMsg, setSeasonShareMsg] = useState('');
  const [seasonPreviewOpen, setSeasonPreviewOpen] = useState(false);
  const [graphEpoch, setGraphEpoch] = useState(0);

  const jumpCrossCityMemories = (mode: 'and' | 'or') => {
    if (graphPersonPick.length === 0) return;
    const tags = graphPersonPick.map(encodeURIComponent).join(',');
    navigate(`/town/loft?tab=memories&scope=crosscity&tags=${tags}&tagMode=${mode}`);
  };

  const handleGraphPersonClick = (person: string, e: React.MouseEvent) => {
    if (e.shiftKey || graphMode === 'cross') {
      setGraphPersonPick(prev => {
        if (prev.includes(person)) return prev.filter(p => p !== person);
        return [...prev, person].slice(0, 4);
      });
      return;
    }
    navigate(`/town/loft?tab=memories&scope=crosscity&tags=${encodeURIComponent(person)}&tagMode=or`);
  };

  const handlePersonEdgeClick = (personA: string, personB: string) => {
    const tags = [personA, personB].map(encodeURIComponent).join(',');
    navigate(`/town/loft?tab=memories&scope=crosscity&tags=${tags}&tagMode=and`);
  };

  useEffect(() => onPersonTagConfigUpdated(() => {
    void reloadFromDisk();
    setGraphEpoch(e => e + 1);
  }), [reloadFromDisk]);

  const report = useMemo(
    () => buildCityLifeReport(
      activeCityId,
      data.memories,
      vaultData.transactions,
      period,
    ),
    [activeCityId, data.memories, vaultData.transactions, period],
  );

  const insights = useMemo(() => {
    const projectedNetWorth = projectNetWorthThroughEndOfMonth(totals.netWorth, vaultData.calendarEvents);
    return generateLifeTownInsights({
      memories: data.memories,
      transactions: vaultData.transactions,
      calendarEvents: vaultData.calendarEvents,
      netWorth: totals.netWorth,
      projectedNetWorth,
      period,
      report,
    });
  }, [data.memories, vaultData.transactions, vaultData.calendarEvents, totals.netWorth, period, report]);

  const radarData = useMemo(
    () => computeDomainRadarData(activeCityId, activeCity, data.memories, vaultData.transactions),
    [activeCityId, activeCity, data.memories, vaultData.transactions],
  );

  const seasonReport = useMemo(
    () => buildSeasonQuarterReport(activeCityId, activeCity.name, activeCity, data.memories, vaultData.transactions),
    [activeCityId, activeCity, data.memories, vaultData.transactions],
  );

  const balanceScore = useMemo(() => {
    const eco = computeExploreEcosystem(activeCityId, activeCity, data.memories, vaultData.transactions);
    return computeDomainBalanceScore(eco);
  }, [activeCityId, activeCity, data.memories, vaultData.transactions]);

  const relationGraph = useMemo(
    () => buildLifeRelationGraph(activeCityId, data.memories, data.personTagConfig),
    [activeCityId, data.memories, data.personTagConfig],
  );

  const crossCityGraph = useMemo(
    () => buildCrossCityRelationGraph(data.cities, data.memories, data.personTagConfig),
    [data.cities, data.memories, data.personTagConfig],
  );

  const highlightSnippets = useMemo(
    () =>
      report.highlights
        .map(m => m.content)
        .filter(Boolean)
        .slice(0, 2),
    [report.highlights],
  );

  useEffect(() => {
    if (!shouldPromptSeasonShare(seasonReport.quarterLabel)) return;
    setSeasonPreviewOpen(true);
  }, [seasonReport.quarterLabel]);

  const handleUpdateGoal = (buildingType: BuildingType, value: number) => {
    updateDomainGoals(activeCityId, { [buildingType]: value });
  };

  const maxBuilding = Math.max(...BUILDING_TYPES.map(bt => report.buildingBreakdown[bt]), 1);
  const maxMood = Math.max(...MOOD_OPTIONS.map(m => report.moodBreakdown[m.value]), 1);
  const dominantMood = MOOD_OPTIONS.find(m => m.value === report.dominantMood);

  return (
    <TownPageShell>
      {seasonPreviewOpen && (
        <SeasonSharePreviewCard
          cityName={activeCity.name}
          report={seasonReport}
          onClose={() => {
            setSeasonPreviewOpen(false);
            markSeasonSharePrompted(seasonReport.quarterLabel);
          }}
          onDone={result => {
            if (result === 'shared') setSeasonShareMsg('季末分享已唤起系统分享面板');
            else if (result === 'copied') setSeasonShareMsg('季末叙事已复制到剪贴板');
            markSeasonSharePrompted(seasonReport.quarterLabel);
          }}
        />
      )}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--rpg-text)' }}>
              <BarChart3 className="w-4 h-4" />
              {report.cityName} · 人生生态报告
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--rpg-text-secondary)' }}>
              {report.rangeLabel} · 五域平衡 {balanceScore} 分 · <Link to="/town/explore" className="underline">打开生态地图</Link>
            </p>
          </div>
          <div className="flex gap-1.5">
            {(['week', 'month'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: period === p ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
                  color: period === p ? '#fff' : 'var(--rpg-text)',
                  border: '1px solid var(--rpg-border)',
                }}
              >
                {p === 'week' ? '本周' : '本月'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.cities.map(city => (
            <button
              key={city.id}
              type="button"
              onClick={() => setActiveCityId(city.id)}
              className="px-3 py-1.5 rounded-lg text-xs shrink-0"
              style={{
                background: city.id === activeCityId ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
                color: city.id === activeCityId ? '#fff' : 'var(--rpg-text)',
                border: '1px solid var(--rpg-border)',
              }}
            >
              {city.name}
            </button>
          ))}
        </div>

        {seasonShareMsg && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-primary)' }}>
            {seasonShareMsg}
          </p>
        )}

        <SeasonReportSection
          cityName={activeCity.name}
          report={seasonReport}
          radar={radarData}
          adventurerName={rpg.characterName}
          highlightSnippets={highlightSnippets}
        />

        <DomainGoalsPanel
          cityId={activeCityId}
          memories={data.memories}
          goals={activeCity.domainGoals}
          streakMonths={activeCity.domainGoalStreakMonths}
          onUpdateGoal={handleUpdateGoal}
        />

        <EcoSyncPanel data={data} onRestored={() => void reloadFromDisk()} />

        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>
              人生关系图谱
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                className={`domain-timeline-mode-tab ${graphMode === 'city' ? 'domain-timeline-mode-tab--active' : ''}`}
                onClick={() => setGraphMode('city')}
              >
                单城
              </button>
              <button
                type="button"
                className={`domain-timeline-mode-tab ${graphMode === 'cross' ? 'domain-timeline-mode-tab--active' : ''}`}
                onClick={() => setGraphMode('cross')}
              >
                跨城
              </button>
            </div>
          </div>
          {graphPersonPick.length > 0 && (
            <div className="life-relation-graph-actions">
              <span className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
                已选 {graphPersonPick.map(p => `#${p}`).join(' ')}
              </span>
              <button type="button" className="season-report-btn text-[10px]" onClick={() => jumpCrossCityMemories('or')}>
                OR 查看跨城回忆
              </button>
              {graphPersonPick.length >= 2 && (
                <button type="button" className="season-report-btn text-[10px]" onClick={() => jumpCrossCityMemories('and')}>
                  AND 全部匹配
                </button>
              )}
              <button type="button" className="text-[10px] underline" onClick={() => setGraphPersonPick([])}>
                清除
              </button>
            </div>
          )}
          <LifeRelationGraph
            key={graphEpoch}
            data={graphMode === 'city' ? relationGraph : crossCityGraph}
            selectedPersons={graphPersonPick}
            onTagClick={tag =>
              navigate(
                graphMode === 'cross'
                  ? `/town/loft?tab=memories&scope=crosscity&tags=${encodeURIComponent(tag)}&tagMode=or`
                  : `/town/loft?tab=memories&tag=${encodeURIComponent(tag)}`,
              )}
            onPersonClick={handleGraphPersonClick}
            onPersonEdgeClick={handlePersonEdgeClick}
            onDomainClick={bt => navigate(`/town/explore?building=${bt}`)}
            onCityClick={cityId => {
              setActiveCityId(cityId);
              setGraphMode('city');
            }}
          />
        </div>

        <div
          className="rounded-xl p-4 text-sm leading-relaxed"
          style={{ background: 'var(--rpg-bg)', border: '1px solid var(--rpg-border)', color: 'var(--rpg-text)' }}
        >
          {report.narrative}
        </div>

        <LifeTownInsightsPanel insights={insights} />

        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
        >
          <h3 className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>
            五域平衡雷达 · 本月 vs 上月
          </h3>
          <DomainBalanceRadar data={radarData} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="回忆条数" value={String(report.memoryCount)} sub={`打卡 ${report.checkInCount} 次`} />
          <StatCard label="获得 EXP" value={String(report.expEarned)} />
          <StatCard
            label="主导心情"
            value={dominantMood ? `${dominantMood.emoji} ${dominantMood.label}` : '—'}
          />
          <StatCard
            label="关联流水"
            value={String(report.linkedTransactionCount)}
            sub="含手动 + 自动匹配"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
          >
            <h3 className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>生活域活跃度</h3>
            {BUILDING_TYPES.map(bt => (
              <BarRow
                key={bt}
                label={`${BUILDING_META[bt].icon} ${LIFE_DOMAIN_META[bt].label}`}
                count={report.buildingBreakdown[bt]}
                max={maxBuilding}
              />
            ))}
          </div>

          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
          >
            <h3 className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>心情分布</h3>
            {MOOD_OPTIONS.map(m => (
              <BarRow
                key={m.value}
                label={`${m.emoji} ${m.label}`}
                count={report.moodBreakdown[m.value]}
                max={maxMood}
                color="var(--rpg-gold, #F5A623)"
              />
            ))}
          </div>
        </div>

        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
        >
          <h3 className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>财务镜像（同期）</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div style={{ color: 'var(--rpg-text)' }}>
              <p className="vault-muted text-[10px] mb-1">收入</p>
              <p className="font-mono font-semibold">{formatCurrency(report.financeSummary.incomeAmount)}</p>
              <p style={{ color: 'var(--rpg-text-secondary)' }}>{report.financeSummary.incomeCount} 笔 → 职域 Lv.{report.buildingLevels.company.effectiveLevel}</p>
            </div>
            <div style={{ color: 'var(--rpg-text)' }}>
              <p className="vault-muted text-[10px] mb-1">支出</p>
              <p className="font-mono font-semibold">{formatCurrency(report.financeSummary.expenseAmount)}</p>
              <p style={{ color: 'var(--rpg-text-secondary)' }}>{report.financeSummary.expenseCount} 笔</p>
            </div>
          </div>
        </div>

        {report.topTags.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
          >
            <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--rpg-text)' }}>标签云</h3>
            <div className="flex flex-wrap gap-2">
              {report.topTags.map(({ tag, count }) => (
                <span
                  key={tag}
                  className="text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-primary)' }}
                >
                  #{tag} <span className="opacity-70">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {report.highlights.length > 0 && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
          >
            <h3 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--rpg-text)' }}>
              <BookHeart className="w-3.5 h-3.5" /> 精选回忆
            </h3>
            {report.highlights.map(m => {
              const linked = findTransactionById(vaultData.transactions, m.linkedTransactionId);
              return (
                <div
                  key={m.id}
                  className="rounded-lg p-3 text-sm"
                  style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text)' }}
                >
                  <p className="text-[10px] mb-1" style={{ color: 'var(--rpg-text-secondary)' }}>
                    {m.date} · {LIFE_DOMAIN_META[m.buildingType].label}
                    {linked && ` · 🔗 ${formatCurrency(linked.amount)}`}
                    {m.geo && ' · 📍'}
                  </p>
                  <p className="leading-relaxed line-clamp-3">{m.content}</p>
                </div>
              );
            })}
          </div>
        )}

        {report.memoryCount === 0 && (
          <div
            className="rounded-xl p-8 text-center text-sm"
            style={{ background: 'var(--rpg-bg)', color: 'var(--rpg-text-secondary)' }}
          >
            {period === 'week' ? '本周' : '本月'}还没有回忆，去生态地图或回忆页记录第一条吧。
          </div>
        )}
      </div>
    </TownPageShell>
  );
}
