import type { LifeMemory, BuildingType, PersonTagConfig } from '@/types/life-town';
import { LIFE_DOMAIN_META } from '@/lib/explore-ecosystem';
import { BUILDING_TYPES } from '@/lib/life-memories-data';
import { isPersonTag } from '@/lib/relation-person-tags';

export interface RelationNode {
  id: string;
  label: string;
  type: 'domain' | 'tag' | 'person';
  size: number;
  x?: number;
  y?: number;
}

export interface RelationEdge {
  source: string;
  target: string;
  weight: number;
  lastCooccurDate?: string;
  recent30d?: number;
  trend?: 'rising' | 'stable' | 'fading';
}

export interface LifeRelationGraphData {
  nodes: RelationNode[];
  edges: RelationEdge[];
}

const DOMAIN_IDS = BUILDING_TYPES;

export function buildLifeRelationGraph(
  cityId: string,
  memories: LifeMemory[],
  personTagConfig?: PersonTagConfig,
): LifeRelationGraphData {
  const cityMemories = memories.filter(m => m.cityId === cityId);
  const tagCounts = new Map<string, number>();
  const personCounts = new Map<string, number>();
  const domainTagCounts = new Map<string, Map<string, number>>();
  const domainPersonCounts = new Map<string, Map<string, number>>();
  const personTagCooccur = new Map<string, Map<string, number>>();

  const personPairCooccur = new Map<string, { dates: string[] }>();

  for (const m of cityMemories) {
    const dKey = m.buildingType;
    if (!domainTagCounts.has(dKey)) domainTagCounts.set(dKey, new Map());
    if (!domainPersonCounts.has(dKey)) domainPersonCounts.set(dKey, new Map());
    const dm = domainTagCounts.get(dKey)!;
    const dp = domainPersonCounts.get(dKey)!;

    const persons = m.tags.map(t => t.trim()).filter(t => t && isPersonTag(t, personTagConfig));
    const genericTags = m.tags.map(t => t.trim()).filter(t => t && !isPersonTag(t, personTagConfig) && t.length <= 12);

    for (const tag of genericTags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      dm.set(tag, (dm.get(tag) ?? 0) + 1);
    }
    for (const person of persons) {
      personCounts.set(person, (personCounts.get(person) ?? 0) + 1);
      dp.set(person, (dp.get(person) ?? 0) + 1);
      for (const tag of genericTags) {
        if (!personTagCooccur.has(person)) personTagCooccur.set(person, new Map());
        const pm = personTagCooccur.get(person)!;
        pm.set(tag, (pm.get(tag) ?? 0) + 1);
      }
      for (const other of persons) {
        if (other === person) continue;
        if (!personTagCooccur.has(person)) personTagCooccur.set(person, new Map());
        const pm = personTagCooccur.get(person)!;
        pm.set(`__person__${other}`, (pm.get(`__person__${other}`) ?? 0) + 1);
        const pairKey = [person, other].sort().join('|||');
        const bucket = personPairCooccur.get(pairKey) ?? { dates: [] };
        bucket.dates.push(m.date);
        personPairCooccur.set(pairKey, bucket);
      }
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const topPersons = [...personCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const nodes: RelationNode[] = DOMAIN_IDS.map(bt => ({
    id: `domain-${bt}`,
    label: LIFE_DOMAIN_META[bt].label,
    type: 'domain',
    size: 12 + cityMemories.filter(m => m.buildingType === bt).length * 2,
  }));

  for (const [tag, count] of topTags) {
    nodes.push({
      id: `tag-${tag}`,
      label: `#${tag}`,
      type: 'tag',
      size: 8 + count * 2,
    });
  }

  for (const [person, count] of topPersons) {
    nodes.push({
      id: `person-${person}`,
      label: person,
      type: 'person',
      size: 10 + count * 2,
    });
  }

  const edges: RelationEdge[] = [];
  for (const [bt, tagMap] of domainTagCounts) {
    for (const [tag, w] of tagMap) {
      if (!topTags.some(([t]) => t === tag)) continue;
      edges.push({ source: `domain-${bt}`, target: `tag-${tag}`, weight: w });
    }
  }
  for (const [bt, personMap] of domainPersonCounts) {
    for (const [person, w] of personMap) {
      if (!topPersons.some(([p]) => p === person)) continue;
      edges.push({ source: `domain-${bt}`, target: `person-${person}`, weight: w });
    }
  }
  for (const [person, tagMap] of personTagCooccur) {
    if (!topPersons.some(([p]) => p === person)) continue;
    for (const [target, w] of tagMap) {
      if (target.startsWith('__person__')) {
        const other = target.slice(10);
        if (topPersons.some(([p]) => p === other)) {
          const pairKey = [person, other].sort().join('|||');
          const meta = personPairCooccur.get(pairKey);
          const edgeMeta = edgeDecayMeta(meta?.dates ?? []);
          edges.push({
            source: `person-${person}`,
            target: `person-${other}`,
            weight: w,
            ...edgeMeta,
          });
        }
      } else if (topTags.some(([t]) => t === target)) {
        edges.push({ source: `person-${person}`, target: `tag-${target}`, weight: w });
      }
    }
  }

  layoutRelationNodes(nodes, edges);
  return { nodes, edges };
}

function edgeDecayMeta(dates: string[]): Pick<RelationEdge, 'lastCooccurDate' | 'recent30d' | 'trend'> {
  if (dates.length === 0) return {};
  const sorted = [...dates].sort();
  const last = sorted[sorted.length - 1];
  const now = Date.now();
  const d30 = now - 30 * 24 * 60 * 60_000;
  const recent30d = dates.filter(d => new Date(d).getTime() >= d30).length;
  const d60 = now - 60 * 24 * 60 * 60_000;
  const prev30 = dates.filter(d => {
    const t = new Date(d).getTime();
    return t >= d60 && t < d30;
  }).length;
  const trend: RelationEdge['trend'] =
    recent30d > prev30 ? 'rising' : recent30d < prev30 && prev30 > 0 ? 'fading' : 'stable';
  return { lastCooccurDate: last, recent30d, trend };
}

function layoutRelationNodes(nodes: RelationNode[], edges: RelationEdge[]) {
  const domains = nodes.filter(n => n.type === 'domain');
  const persons = nodes.filter(n => n.type === 'person');
  const tags = nodes.filter(n => n.type === 'tag');
  const cx = 150;
  const cy = 150;
  const rDomain = 58;

  domains.forEach((n, i) => {
    const angle = (i / domains.length) * Math.PI * 2 - Math.PI / 2;
    n.x = cx + Math.cos(angle) * rDomain;
    n.y = cy + Math.sin(angle) * rDomain;
  });

  persons.forEach((n, i) => {
    const angle = (i / Math.max(persons.length, 1)) * Math.PI * 2;
    n.x = cx + Math.cos(angle) * 95;
    n.y = cy + Math.sin(angle) * 95;
  });

  tags.forEach((n, i) => {
    const linked = edges.filter(e => e.target === n.id);
    const sourceId = linked[0]?.source;
    const anchor = nodes.find(d => d.id === sourceId);
    const baseAngle = anchor?.x != null
      ? Math.atan2((anchor.y ?? cy) - cy, (anchor.x ?? cx) - cx)
      : (i / tags.length) * Math.PI * 2;
    const jitter = ((i % 3) - 1) * 0.35;
    const rTag = 128 + (i % 4) * 6;
    n.x = cx + Math.cos(baseAngle + jitter) * rTag;
    n.y = cy + Math.sin(baseAngle + jitter) * rTag;
  });
}

export function computeDomainGoalsProgress(
  cityId: string,
  memories: LifeMemory[],
  goals: Partial<Record<BuildingType, number>> | undefined,
  month?: string,
): { total: number; done: number; pct: number; byDomain: Array<{ bt: BuildingType; goal: number; done: number }> } {
  const monthPrefix = month ?? new Date().toISOString().slice(0, 7);
  const byDomain = BUILDING_TYPES.map(bt => {
    const goal = goals?.[bt] ?? 0;
    const done = memories.filter(
      m => m.cityId === cityId && m.buildingType === bt && m.date.startsWith(monthPrefix),
    ).length;
    return { bt, goal, done };
  }).filter(d => d.goal > 0);

  const total = byDomain.reduce((s, d) => s + d.goal, 0);
  const done = byDomain.reduce((s, d) => s + Math.min(d.done, d.goal), 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct, byDomain };
}

export interface CrossCityRelationGraphData extends LifeRelationGraphData {
  cityLabels: Record<string, string>;
}

/** 跨城：城市节点 + 共享标签 + 跨城人物共现 */
export function buildCrossCityRelationGraph(
  cities: Array<{ id: string; name: string }>,
  memories: LifeMemory[],
  personTagConfig?: PersonTagConfig,
): CrossCityRelationGraphData {
  const tagCityCounts = new Map<string, Map<string, number>>();
  const personCityCounts = new Map<string, Map<string, number>>();
  const cityMemCounts = new Map<string, number>();

  for (const m of memories) {
    cityMemCounts.set(m.cityId, (cityMemCounts.get(m.cityId) ?? 0) + 1);
    const persons = m.tags.map(t => t.trim()).filter(t => t && isPersonTag(t, personTagConfig));
    const genericTags = m.tags.map(t => t.trim()).filter(t => t && !isPersonTag(t, personTagConfig) && t.length <= 12);

    for (const tag of genericTags) {
      if (!tagCityCounts.has(tag)) tagCityCounts.set(tag, new Map());
      const cm = tagCityCounts.get(tag)!;
      cm.set(m.cityId, (cm.get(m.cityId) ?? 0) + 1);
    }
    for (const person of persons) {
      if (!personCityCounts.has(person)) personCityCounts.set(person, new Map());
      const pm = personCityCounts.get(person)!;
      pm.set(m.cityId, (pm.get(m.cityId) ?? 0) + 1);
    }
  }

  const topTags = [...tagCityCounts.entries()]
    .filter(([, cm]) => cm.size >= 2 || [...cm.values()].reduce((a, b) => a + b, 0) >= 3)
    .sort((a, b) => {
      const sa = [...a[1].values()].reduce((x, y) => x + y, 0);
      const sb = [...b[1].values()].reduce((x, y) => x + y, 0);
      return sb - sa;
    })
    .slice(0, 6);

  const topPersons = [...personCityCounts.entries()]
    .filter(([, cm]) => cm.size >= 2)
    .sort((a, b) => {
      const sa = [...a[1].values()].reduce((x, y) => x + y, 0);
      const sb = [...b[1].values()].reduce((x, y) => x + y, 0);
      return sb - sa;
    })
    .slice(0, 6);

  const activeCities = cities.filter(c => (cityMemCounts.get(c.id) ?? 0) > 0);
  const nodes: RelationNode[] = activeCities.map(c => ({
    id: `city-${c.id}`,
    label: c.name,
    type: 'domain',
    size: 14 + (cityMemCounts.get(c.id) ?? 0) * 1.5,
  }));

  for (const [tag, cityMap] of topTags) {
    nodes.push({
      id: `tag-${tag}`,
      label: `#${tag}`,
      type: 'tag',
      size: 8 + [...cityMap.values()].reduce((a, b) => a + b, 0) * 2,
    });
  }

  for (const [person, cityMap] of topPersons) {
    nodes.push({
      id: `person-${person}`,
      label: person,
      type: 'person',
      size: 10 + [...cityMap.values()].reduce((a, b) => a + b, 0) * 2,
    });
  }

  const edges: RelationEdge[] = [];
  for (const [tag, cityMap] of topTags) {
    for (const [cityId, w] of cityMap) {
      edges.push({ source: `city-${cityId}`, target: `tag-${tag}`, weight: w });
    }
  }
  for (const [person, cityMap] of topPersons) {
    for (const [cityId, w] of cityMap) {
      edges.push({ source: `city-${cityId}`, target: `person-${person}`, weight: w });
    }
  }

  layoutRelationNodes(nodes, edges);
  return {
    nodes,
    edges,
    cityLabels: Object.fromEntries(cities.map(c => [c.id, c.name])),
  };
}
