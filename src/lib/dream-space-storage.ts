import type { DreamSpaceData, DreamSpaceRecord, DreamTemplateId } from '@/types/dream-space';
import { getDreamTemplate, presetToFurniture } from '@/lib/dream-space-templates';

const STORAGE_KEY = 'vaultflow-dream-spaces';

function uid(): string {
  return `dream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadDreamSpaces(): DreamSpaceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { spaces: [], activeId: null };
    const parsed = JSON.parse(raw) as DreamSpaceData;
    return {
      spaces: Array.isArray(parsed.spaces) ? parsed.spaces : [],
      activeId: parsed.activeId ?? null,
    };
  } catch {
    return { spaces: [], activeId: null };
  }
}

export function saveDreamSpaces(data: DreamSpaceData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createDreamSpace(
  templateId: DreamTemplateId,
  name?: string,
): DreamSpaceRecord {
  const template = getDreamTemplate(templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: name?.trim() || template.name,
    templateId,
    note: '',
    furniture: presetToFurniture(template.preset),
    createdAt: now,
    updatedAt: now,
  };
}
