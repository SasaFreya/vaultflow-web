import { getRouteVisitRecords } from '@/lib/explore-route-trails';
import type { BuildingType } from '@/types/life-town';

export interface HeatmapZone {
  locationId: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** 地表区块与地点映射（viewBox 0-100） */
export const HEATMAP_ZONES: HeatmapZone[] = [
  { locationId: 'home', cx: 50, cy: 58, rx: 14, ry: 11 },
  { locationId: 'company', cx: 62, cy: 40, rx: 12, ry: 10 },
  { locationId: 'library', cx: 22, cy: 48, rx: 11, ry: 9 },
  { locationId: 'gym', cx: 18, cy: 72, rx: 10, ry: 9 },
  { locationId: 'cafe', cx: 72, cy: 52, rx: 11, ry: 9 },
];

export interface ZoneHeat {
  locationId: string;
  count: number;
  heat: number;
  fill: string;
}

function heatColor(t: number): string {
  const r = Math.round(129 + t * 116);
  const g = Math.round(199 - t * 120);
  const b = Math.round(132 - t * 100);
  const a = 0.18 + t * 0.52;
  return `rgba(${r},${g},${b},${a})`;
}

function countVisitsInRange(
  cityId: string,
  startMs: number,
  endMs: number,
): Map<string, number> {
  const records = getRouteVisitRecords(cityId);
  const counts = new Map<string, number>();
  for (const r of records) {
    const t = new Date(r.visitedAt).getTime();
    if (t >= startMs && t < endMs) {
      counts.set(r.locationId, (counts.get(r.locationId) ?? 0) + 1);
    }
  }
  return counts;
}

export function buildZoneHeatmap(cityId: string): ZoneHeat[] {
  const counts = countVisitsInRange(cityId, 0, Number.MAX_SAFE_INTEGER);
  const max = Math.max(1, ...counts.values(), 0);

  return HEATMAP_ZONES.map(zone => {
    const count = counts.get(zone.locationId) ?? 0;
    const heat = count / max;
    return {
      locationId: zone.locationId,
      count,
      heat,
      fill: count > 0 ? heatColor(heat) : 'transparent',
    };
  }).filter(z => z.count > 0);
}

export interface WeekHeatDiff {
  locationId: string;
  thisWeek: number;
  lastWeek: number;
  delta: number;
  isNewFrequent: boolean;
}

/** 本周 vs 上周热力差分 — 高亮新常去地点 */
export function buildWeekHeatmapDiff(cityId: string, now = Date.now()): WeekHeatDiff[] {
  const weekMs = 7 * 24 * 60 * 60_000;
  const thisStart = now - weekMs;
  const lastStart = now - 2 * weekMs;
  const thisCounts = countVisitsInRange(cityId, thisStart, now);
  const lastCounts = countVisitsInRange(cityId, lastStart, thisStart);

  return HEATMAP_ZONES.map(zone => {
    const thisWeek = thisCounts.get(zone.locationId) ?? 0;
    const lastWeek = lastCounts.get(zone.locationId) ?? 0;
    const delta = thisWeek - lastWeek;
    const isNewFrequent = thisWeek >= 2 && lastWeek === 0;
    return { locationId: zone.locationId, thisWeek, lastWeek, delta, isNewFrequent };
  }).filter(d => d.thisWeek > 0 || d.lastWeek > 0);
}

const ZONE_TO_BUILDING: Record<string, BuildingType> = {
  home: 'home',
  company: 'company',
  library: 'library',
  gym: 'gym',
  cafe: 'cafe',
};

export function heatZoneToBuilding(locationId: string): BuildingType | null {
  return ZONE_TO_BUILDING[locationId] ?? null;
}
