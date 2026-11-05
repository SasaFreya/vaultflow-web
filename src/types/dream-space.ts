export type DreamTemplateId =
  | 'nordic-living'
  | 'gaming-room'
  | 'studio'
  | 'sewing-room'
  | 'reading-nook'
  | 'city-balcony'
  | 'ikea-bedroom'
  | 'open-kitchen';

export interface DreamFurnitureItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  width: number;
  height: number;
}

export interface DreamPlacedFurniture {
  instanceId: string;
  itemId: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface DreamTemplateDef {
  id: DreamTemplateId;
  name: string;
  emoji: string;
  tagline: string;
  wallColor: string;
  floorColor: string;
  gridWidth: number;
  gridHeight: number;
  palette: string[];
  preset: Omit<DreamPlacedFurniture, 'instanceId'>[];
}

export interface DreamSpaceRecord {
  id: string;
  name: string;
  templateId: DreamTemplateId;
  note: string;
  furniture: DreamPlacedFurniture[];
  createdAt: string;
  updatedAt: string;
}

export interface DreamSpaceData {
  spaces: DreamSpaceRecord[];
  activeId: string | null;
}
