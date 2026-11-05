import type { TownLocation } from '@/types/town';
import type { HubLayoutPosition } from '@/types/life-town';

export const EXPLORE_HOME_ID = 'home';

export const DEFAULT_EXPLORE_HOME: HubLayoutPosition = { x: 50, y: 58 };

/** Keep pins inside the visible play area (below HUD, above bottom legend). */
export function clampExplorePosition(x: number, y: number): HubLayoutPosition {
  return {
    x: Math.round(Math.min(92, Math.max(8, x)) * 10) / 10,
    y: Math.round(Math.min(84, Math.max(26, y)) * 10) / 10,
  };
}

export type ExploreLayoutMap = Partial<Record<string, HubLayoutPosition>>;

export function applyExplorePosition(
  id: string,
  defaultPos: HubLayoutPosition,
  layout?: ExploreLayoutMap,
): HubLayoutPosition {
  const saved = layout?.[id];
  if (!saved) return defaultPos;
  return clampExplorePosition(saved.x, saved.y);
}

export function getExploreHome(layout?: ExploreLayoutMap): HubLayoutPosition {
  return applyExplorePosition(EXPLORE_HOME_ID, DEFAULT_EXPLORE_HOME, layout);
}

export function getLocationsWithExploreLayout(
  locations: TownLocation[],
  layout?: ExploreLayoutMap,
): TownLocation[] {
  return locations.map(loc => ({
    ...loc,
    position: applyExplorePosition(loc.id, loc.position, layout),
  }));
}

export const EXPLORE_LOCATION_IDS = ['home', 'company', 'gym', 'library', 'cafe'] as const;
