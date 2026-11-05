import type { HubBuildingDef } from '@/lib/town-hub-buildings';
import { HUB_BUILDINGS, EXPLORE_HUB } from '@/lib/town-hub-buildings';
import type { HubLayoutMap } from '@/types/life-town';

export const HUB_LAYOUT_IDS = [
  ...HUB_BUILDINGS.map(b => b.id),
  EXPLORE_HUB.id,
] as const;

export type HubLayoutBuildingId = (typeof HUB_LAYOUT_IDS)[number];

export function clampHubPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(Math.min(96, Math.max(4, x)) * 10) / 10,
    y: Math.round(Math.min(94, Math.max(10, y)) * 10) / 10,
  };
}

export function applyHubLayout(
  building: HubBuildingDef,
  layout?: HubLayoutMap,
): HubBuildingDef {
  const saved = layout?.[building.id as HubLayoutBuildingId];
  if (!saved) return building;
  const { x, y } = clampHubPosition(saved.x, saved.y);
  return { ...building, x, y };
}

export function getHubBuildingsWithLayout(layout?: HubLayoutMap): HubBuildingDef[] {
  return HUB_BUILDINGS.map(b => applyHubLayout(b, layout));
}

export function getExploreHubWithLayout(layout?: HubLayoutMap): HubBuildingDef {
  return applyHubLayout(EXPLORE_HUB, layout);
}
