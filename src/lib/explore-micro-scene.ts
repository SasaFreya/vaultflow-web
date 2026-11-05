import type { BuildingType } from '@/types/life-town';
import type { SceneHotspot, TownLocation } from '@/types/town';
import { LOCATION_SCENE_PACKS } from '@/lib/town-micro-scenes';
import { getLocation } from '@/lib/town-data';
import { LIFE_DOMAIN_META } from '@/lib/explore-ecosystem';
import type { TownData } from '@/types/town';

const BUILDING_ICONS: Record<BuildingType, string> = {
  home: '🏠',
  company: '🏢',
  library: '📚',
  gym: '💪',
  cafe: '☕',
};

export interface ExploreMicroSceneView {
  buildingType: BuildingType;
  name: string;
  icon: string;
  category: TownLocation['category'] | 'home';
  micro: (typeof LOCATION_SCENE_PACKS)['gym']['micro'];
  hotspots: SceneHotspot[];
  gradient: [string, string];
}

function mergeHotspots(locationId: string, base: SceneHotspot[]): SceneHotspot[] {
  const pack = LOCATION_SCENE_PACKS[locationId];
  if (!pack) return base;
  const pointMap = new Map(pack.points.map(p => [p.id, p]));
  return base.map(p => ({ ...p, ...pointMap.get(p.id) }));
}

export function buildFallbackMicroScene(
  buildingType: BuildingType,
  displayName: string,
): ExploreMicroSceneView {
  const pack = LOCATION_SCENE_PACKS[buildingType];
  return {
    buildingType,
    name: displayName,
    icon: BUILDING_ICONS[buildingType] ?? '📍',
    category:
      buildingType === 'home'
        ? 'home'
        : buildingType === 'company'
          ? 'vocation'
          : buildingType === 'gym'
            ? 'body'
            : buildingType === 'library'
              ? 'mind'
              : 'spirit',
    micro: pack?.micro ?? { story: displayName, ambient: '', props: [] },
    hotspots: pack?.points ?? [],
    gradient: ['#FFF8E7', '#FFE0B2'],
  };
}

export function resolveExploreMicroScene(
  buildingType: BuildingType,
  townData: TownData,
  displayName: string,
): ExploreMicroSceneView | null {
  const pack = LOCATION_SCENE_PACKS[buildingType];
  if (!pack) return buildFallbackMicroScene(buildingType, displayName);

  if (buildingType === 'home') {
    return {
      buildingType: 'home',
      name: displayName,
      icon: '🏠',
      category: 'home',
      micro: pack.micro,
      hotspots: pack.points,
      gradient: ['#FFF8E7', '#FFE0B2'],
    };
  }

  const loc = getLocation(buildingType, townData);
  const meta = LIFE_DOMAIN_META[buildingType];

  return {
    buildingType,
    name: displayName,
    icon: loc?.icon ?? BUILDING_ICONS[buildingType] ?? '📍',
    category: (loc?.category ?? (
      buildingType === 'company' ? 'vocation' :
      buildingType === 'gym' ? 'body' :
      buildingType === 'library' ? 'mind' : 'spirit'
    )) as TownLocation['category'],
    micro: pack.micro,
    hotspots: loc
      ? mergeHotspots(buildingType, loc.scene.interactivePoints)
      : pack.points,
    gradient: loc?.scene.gradient ?? [meta.hue, '#FFF8E7'],
  };
}
