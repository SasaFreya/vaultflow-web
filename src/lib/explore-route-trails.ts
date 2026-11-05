const TRAILS_KEY = 'vaultflow_explore_route_trails_v2';

export interface RouteVisitRecord {
  locationId: string;
  visitedAt: string;
}

export type ExploreRouteTrailStore = Record<string, RouteVisitRecord[]>;

function loadStore(): ExploreRouteTrailStore {
  try {
    const raw = localStorage.getItem(TRAILS_KEY);
    if (raw) return JSON.parse(raw) as ExploreRouteTrailStore;
    const legacy = localStorage.getItem('vaultflow_explore_route_trails');
    if (!legacy) return {};
    const old = JSON.parse(legacy) as Record<string, string[]>;
    const migrated: ExploreRouteTrailStore = {};
    const now = new Date().toISOString();
    for (const [cityId, ids] of Object.entries(old)) {
      migrated[cityId] = ids.map(id => ({ locationId: id, visitedAt: now }));
    }
    saveStore(migrated);
    return migrated;
  } catch {
    return {};
  }
}

function saveStore(store: ExploreRouteTrailStore): void {
  localStorage.setItem(TRAILS_KEY, JSON.stringify(store));
}

/** 记录小人跑过 / 用户进入过的路线端点 */
export function markRouteVisited(cityId: string, locationId: string, at = new Date().toISOString()): void {
  const store = loadStore();
  const list = store[cityId] ?? [];
  store[cityId] = [...list, { locationId, visitedAt: at }];
  saveStore(store);
}

export function getRouteVisitRecords(cityId: string): RouteVisitRecord[] {
  return loadStore()[cityId] ?? [];
}

export function getVisitedRoutes(cityId: string): Set<string> {
  return new Set(getRouteVisitRecords(cityId).map(r => r.locationId));
}

export function isRouteVisited(cityId: string, locationId: string): boolean {
  return getVisitedRoutes(cityId).has(locationId);
}

/** 按日期计算轨迹透明度 0.2–1 */
export function trailOpacityForDate(visitedAt: string, now = Date.now()): number {
  const ageDays = (now - new Date(visitedAt).getTime()) / (24 * 60 * 60_000);
  if (ageDays <= 1) return 1;
  if (ageDays <= 7) return 0.75;
  if (ageDays <= 14) return 0.5;
  if (ageDays <= 30) return 0.35;
  return 0.22;
}

export interface RouteTimelineBucket {
  label: string;
  locationIds: string[];
  opacity: number;
}

/** 回放时间轴：本周 / 上周 / 更早 */
export function buildRouteTimelineBuckets(cityId: string, now = Date.now()): RouteTimelineBucket[] {
  const records = getRouteVisitRecords(cityId);
  const thisWeek: string[] = [];
  const lastWeek: string[] = [];
  const earlier: string[] = [];

  const weekStart = now - 7 * 24 * 60 * 60_000;
  const lastWeekStart = now - 14 * 24 * 60 * 60_000;

  for (const r of records) {
    const t = new Date(r.visitedAt).getTime();
    if (t >= weekStart) {
      if (!thisWeek.includes(r.locationId)) thisWeek.push(r.locationId);
    } else if (t >= lastWeekStart) {
      if (!lastWeek.includes(r.locationId)) lastWeek.push(r.locationId);
    } else if (!earlier.includes(r.locationId)) {
      earlier.push(r.locationId);
    }
  }

  return [
    { label: '本周', locationIds: thisWeek, opacity: 1 },
    { label: '上周', locationIds: lastWeek, opacity: 0.55 },
    { label: '更早', locationIds: earlier, opacity: 0.28 },
  ].filter(b => b.locationIds.length > 0);
}

export function getLatestVisitForLocation(cityId: string, locationId: string): string | null {
  const hits = getRouteVisitRecords(cityId).filter(r => r.locationId === locationId);
  if (hits.length === 0) return null;
  return hits[hits.length - 1]!.visitedAt;
}
