import type { PersonTagConfig } from '@/types/life-town';

const EXACT_PERSON_TAGS = new Set([
  '同事', '妈妈', '爸爸', '母亲', '父亲', '朋友', '闺蜜', '兄弟', '姐妹',
  '老师', '老板', '客户', '室友', '爷爷', '奶奶', '外公', '外婆',
  '老公', '老婆', '丈夫', '妻子', '孩子', '儿子', '女儿',
  '学长', '学姐', '学弟', '学妹', '邻居', '恋人', '对象',
]);

const PERSON_SUFFIXES = ['哥', '姐', '弟', '妹', '叔', '姨', '伯', '姑', '舅', '婶', '爷', '奶'];

function builtinPersonTag(tag: string): boolean {
  const t = tag.trim();
  if (!t || t.length > 8) return false;
  if (EXACT_PERSON_TAGS.has(t)) return true;
  if (t.startsWith('老') && t.length <= 4) return true;
  if (PERSON_SUFFIXES.some(s => t.endsWith(s) && t.length >= 2 && t.length <= 4)) return true;
  return false;
}

export function isPersonTag(tag: string, config?: PersonTagConfig): boolean {
  const t = tag.trim();
  if (!t) return false;
  if (config?.excludedTags?.includes(t)) return false;
  if (config?.customTags?.includes(t)) return true;
  return builtinPersonTag(t);
}

export function personNodeLabel(tag: string): string {
  return tag.trim();
}

export function parsePersonTagInput(raw: string): string[] {
  return raw
    .split(/[,，、\s]+/)
    .map(s => s.replace(/^#/, '').trim())
    .filter(Boolean);
}
