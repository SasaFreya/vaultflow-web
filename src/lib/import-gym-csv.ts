import type { BuildingType, LifeCityId, MemoryMood } from '@/types/life-town';

export interface GymCsvDraft {
  date: string;
  content: string;
  mood: MemoryMood;
  tags: string[];
  buildingType: BuildingType;
  cityId: LifeCityId;
}

const MAX_ROWS = 200;
const MAX_LINE_LEN = 500;

/** 解析 Apple Health 导出 / 备忘录风格 CSV，生成健身回忆草稿 */
export function parseGymCsv(text: string, cityId: LifeCityId): GymCsvDraft[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, MAX_ROWS + 1);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const drafts: GymCsvDraft[] = [];

  const dateIdx = header.includes('date') ? header.split(',').findIndex(c => c.includes('date')) : 0;
  const typeIdx = header.includes('type') ? header.split(',').findIndex(c => c.includes('type')) : -1;
  const durIdx = header.includes('duration') ? header.split(',').findIndex(c => c.includes('duration')) : -1;

  for (const line of lines.slice(1, MAX_ROWS + 1)) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const rawDate = cols[dateIdx] ?? '';
    const date = normalizeDate(rawDate);
    if (!date) continue;

    const workoutType = typeIdx >= 0 ? cols[typeIdx] : '';
    const duration = durIdx >= 0 ? cols[durIdx] : '';
    const note = cols.find(c => c.length > 8 && !c.match(/^\d/)) ?? '';

    const parts = [workoutType, duration, note].filter(Boolean);
    const content = `在健身房${parts.length ? `：${parts.join(' · ').slice(0, MAX_LINE_LEN)}` : '完成了一次训练'}`;

    drafts.push({
      date,
      content,
      mood: 'excited',
      tags: ['健身', workoutType || '训练'].filter(Boolean),
      buildingType: 'gym',
      cityId,
    });
  }
  return drafts;
}

function normalizeDate(raw: string): string | null {
  const d = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
