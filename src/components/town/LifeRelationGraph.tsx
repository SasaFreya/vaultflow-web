import { useState } from 'react';
import type { LifeRelationGraphData } from '@/lib/life-relation-graph';
import type { BuildingType } from '@/types/life-town';

interface LifeRelationGraphProps {
  data: LifeRelationGraphData;
  selectedPersons?: string[];
  onTagClick?: (tag: string) => void;
  onPersonClick?: (person: string, event: React.MouseEvent) => void;
  onPersonEdgeClick?: (personA: string, personB: string) => void;
  onDomainClick?: (buildingType: BuildingType) => void;
  onCityClick?: (cityId: string) => void;
}

function parsePersonEdge(source: string, target: string): [string, string] | null {
  if (!source.startsWith('person-') || !target.startsWith('person-')) return null;
  return [source.slice(7), target.slice(7)];
}

function parseNodeId(id: string): { kind: 'tag' | 'domain' | 'city' | 'person'; value: string } {
  if (id.startsWith('tag-')) return { kind: 'tag', value: id.slice(4) };
  if (id.startsWith('person-')) return { kind: 'person', value: id.slice(7) };
  if (id.startsWith('city-')) return { kind: 'city', value: id.slice(5) };
  if (id.startsWith('domain-')) return { kind: 'domain', value: id.slice(7) };
  return { kind: 'domain', value: id };
}

function nodeColor(type: string): string {
  if (type === 'domain') return 'var(--rpg-primary)';
  if (type === 'person') return '#F48FB1';
  return 'var(--rpg-gold, #F5A623)';
}

export default function LifeRelationGraph({
  data,
  selectedPersons = [],
  onTagClick,
  onPersonClick,
  onPersonEdgeClick,
  onDomainClick,
  onCityClick,
}: LifeRelationGraphProps) {
  const [edgeTip, setEdgeTip] = useState<{ x: number; y: number; label: string } | null>(null);

  if (data.nodes.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: 'var(--rpg-text-secondary)' }}>
        给回忆加上标签（如 #同事 #妈妈），关系图谱会自动生长
      </p>
    );
  }

  const handleNode = (id: string, e: React.MouseEvent) => {
    const parsed = parseNodeId(id);
    if (parsed.kind === 'tag') onTagClick?.(parsed.value);
    else if (parsed.kind === 'person') onPersonClick?.(parsed.value, e);
    else if (parsed.kind === 'city') onCityClick?.(parsed.value);
    else onDomainClick?.(parsed.value as BuildingType);
  };

  return (
    <div className="life-relation-graph-wrap">
      {edgeTip && (
        <div
          className="life-relation-graph-edge-tooltip"
          style={{ left: `${edgeTip.x}px`, top: `${edgeTip.y}px` }}
        >
          {edgeTip.label}
        </div>
      )}
      <svg viewBox="0 0 300 300" className="life-relation-graph" aria-label="人生关系图谱">
        {data.edges.map((e, i) => {
          const s = data.nodes.find(n => n.id === e.source);
          const t = data.nodes.find(n => n.id === e.target);
          if (s?.x == null || t?.x == null) return null;
          const personPair = parsePersonEdge(e.source, e.target);
          const tipLabel =
            personPair != null
              ? [
                  `${personPair[0]} ↔ ${personPair[1]} · 共现 ${e.weight} 条回忆`,
                  e.lastCooccurDate ? `最近 ${e.lastCooccurDate}` : null,
                  e.recent30d != null ? `近30天 ${e.recent30d} 条` : null,
                  e.trend === 'rising' ? '↗ 升温' : e.trend === 'fading' ? '↘ 变淡' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : `关联强度 ${e.weight}`;
          return (
            <g key={`${e.source}-${e.target}-${i}`}>
              <line
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="var(--rpg-border)"
                strokeWidth={Math.min(3, 0.5 + e.weight)}
                opacity={0.6}
              />
              <line
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="transparent"
                strokeWidth={14}
                className="life-relation-graph-edge-hit"
                style={{ cursor: personPair && onPersonEdgeClick ? 'pointer' : 'default' }}
                onMouseEnter={ev => {
                  const rect = (ev.currentTarget.closest('.life-relation-graph-wrap') as HTMLElement)?.getBoundingClientRect();
                  if (!rect) return;
                  setEdgeTip({
                    x: ev.clientX - rect.left,
                    y: ev.clientY - rect.top - 28,
                    label: tipLabel,
                  });
                }}
                onMouseLeave={() => setEdgeTip(null)}
                onClick={ev => {
                  if (!personPair || !onPersonEdgeClick) return;
                  ev.stopPropagation();
                  onPersonEdgeClick(personPair[0], personPair[1]);
                }}
              />
            </g>
          );
        })}
        {data.nodes.map(n => {
          const parsed = parseNodeId(n.id);
          const selected =
            parsed.kind === 'person' && selectedPersons.includes(parsed.value);
          return (
          <g
            key={n.id}
            transform={`translate(${n.x ?? 0}, ${n.y ?? 0})`}
            className={`life-relation-graph-node ${selected ? 'life-relation-graph-node--selected' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={e => handleNode(n.id, e)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') handleNode(n.id, e as unknown as React.MouseEvent);
            }}
          >
            <circle
              r={n.size / 2}
              fill={nodeColor(n.type)}
              opacity={selected ? 1 : n.type === 'tag' ? 0.7 : 0.85}
              stroke={selected ? '#fff' : undefined}
              strokeWidth={selected ? 2 : 0}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={n.type === 'domain' ? 9 : 7}
              fill="#fff"
              pointerEvents="none"
            >
              {n.label.length > 6 ? `${n.label.slice(0, 5)}…` : n.label}
            </text>
          </g>
          );
        })}
      </svg>
      <p className="life-relation-graph-legend">
        <span>● 生活域/城市</span>
        <span>● 人物</span>
        <span>● 标签</span>
        {onPersonEdgeClick && <span>· 点两人之间的线 → AND 跨城筛选</span>}
      </p>
    </div>
  );
}
