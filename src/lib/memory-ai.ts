import type { AISettings, OCRSettings } from '@/types';
import type { BuildingType, LifeCityId, MemoryMood } from '@/types/life-town';
import { BUILDING_META, LIFE_CITY_DEFS, MOOD_OPTIONS } from '@/lib/life-memories-data';
import { recognizeImageText } from '@/lib/ocr';

export interface MemoryDraftInput {
  cityId: LifeCityId;
  buildingType: BuildingType;
  date?: string;
  imageBase64?: string;
  userHint?: string;
}

export interface MemoryDraftResult {
  content: string;
  mood: MemoryMood;
  tags: string[];
  source: 'ai_chat' | 'manual';
}

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

function cityName(cityId: LifeCityId): string {
  return LIFE_CITY_DEFS.find(c => c.id === cityId)?.name ?? cityId;
}

function fallbackDraft(input: MemoryDraftInput, ocrHint?: string): MemoryDraftResult {
  const building = BUILDING_META[input.buildingType].label;
  const place = cityName(input.cityId);
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const hint = input.userHint?.trim() || ocrHint?.trim();

  let content: string;
  if (hint) {
    content = `${date}，在${place}的${building}。${hint.slice(0, 120)}`;
  } else {
    content = `${date}，在${place}的${building}度过了一段时光。`;
  }

  return {
    content,
    mood: 'neutral',
    tags: [building],
    source: 'manual',
  };
}

async function callDashScope(
  ai: AISettings,
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
  model: string,
): Promise<string> {
  const apiKey = ai.dashscopeApiKey?.trim();
  if (!apiKey) throw new Error('NO_API_KEY');

  const res = await fetch(DASHSCOPE_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 280,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || data.message || `AI 请求失败 (${res.status})`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('AI 返回为空');
  return text;
}

function parseMoodFromText(text: string): MemoryMood {
  const lower = text.toLowerCase();
  if (/开心|快乐|高兴|愉快/.test(text)) return 'happy';
  if (/兴奋|激动|期待/.test(text)) return 'excited';
  if (/平静|安静|放松|治愈/.test(text)) return 'calm';
  if (/累|疲惫|困|加班/.test(text)) return 'tired';
  if (/sad|low/.test(lower)) return 'neutral';
  return 'neutral';
}

function buildTags(buildingType: BuildingType, content: string): string[] {
  const base = [BUILDING_META[buildingType].label];
  const extras = content.match(/[\u4e00-\u9fa5]{2,6}/g)?.slice(0, 3) ?? [];
  return [...new Set([...base, ...extras.filter(w => w.length <= 4)])].slice(0, 4);
}

/** 生成回忆草稿：优先百炼多模态，无 Key 时 OCR + 本地模板 */
export async function generateMemoryDraft(
  input: MemoryDraftInput,
  ai: AISettings | undefined,
  ocr: OCRSettings | undefined,
): Promise<MemoryDraftResult> {
  const building = BUILDING_META[input.buildingType].label;
  const place = cityName(input.cityId);
  const date = input.date ?? new Date().toISOString().slice(0, 10);

  let ocrHint = '';
  if (input.imageBase64 && ocr?.provider === 'baidu') {
    try {
      ocrHint = await recognizeImageText(input.imageBase64, ocr);
    } catch {
      /* OCR 可选 */
    }
  }

  const apiKey = ai?.dashscopeApiKey?.trim();
  if (!apiKey) {
    return fallbackDraft(input, ocrHint);
  }

  const systemPrompt =
    '你是人生小镇的回忆助手。用第一人称写 50-120 字今日回忆，口语化、温暖，不要列表和标题。' +
    '末尾单独一行输出 JSON：{"mood":"happy|calm|excited|tired|neutral","tags":["标签1","标签2"]}';

  const userText =
    `城市：${place}。场景/建筑：${building}。日期：${date}。` +
    (input.userHint ? `补充：${input.userHint}。` : '') +
    (ocrHint ? `图片文字参考：${ocrHint.slice(0, 200)}。` : '');

  try {
    let raw: string;
    if (input.imageBase64) {
      const model = ai?.visionModel ?? 'qwen-vl-plus';
      raw = await callDashScope(ai!, [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: input.imageBase64 } },
          ],
        },
      ], model);
    } else {
      const model = ai?.memoryModel ?? 'qwen-turbo';
      raw = await callDashScope(ai!, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ], model);
    }

    const jsonMatch = raw.match(/\{[\s\S]*"mood"[\s\S]*\}\s*$/);
    let mood: MemoryMood = parseMoodFromText(raw);
    let tags = buildTags(input.buildingType, raw);
    let content = raw;

    if (jsonMatch) {
      content = raw.slice(0, jsonMatch.index).trim();
      try {
        const meta = JSON.parse(jsonMatch[0]) as { mood?: MemoryMood; tags?: string[] };
        if (meta.mood && MOOD_OPTIONS.some(m => m.value === meta.mood)) mood = meta.mood!;
        if (Array.isArray(meta.tags) && meta.tags.length) tags = meta.tags.slice(0, 5);
      } catch {
        /* 忽略 JSON 解析失败 */
      }
    }

    if (!content) content = raw.replace(jsonMatch?.[0] ?? '', '').trim();

    return {
      content,
      mood,
      tags,
      source: 'ai_chat',
    };
  } catch (e) {
    if (e instanceof Error && e.message === 'NO_API_KEY') {
      return fallbackDraft(input, ocrHint);
    }
    console.warn('AI memory generation failed, using fallback:', e);
    return fallbackDraft(input, ocrHint);
  }
}

export function checkInMemoryContent(buildingType: BuildingType, cityId: LifeCityId): string {
  const building = BUILDING_META[buildingType].label;
  const place = cityName(cityId);
  const date = new Date().toISOString().slice(0, 10);
  return `${date} · 在${place}${building}打卡`;
}

export interface BillEchoInput {
  cityId: LifeCityId;
  buildingType: BuildingType;
  bills: Array<{ label: string; amount: number; date: string }>;
}

/** 根据域内账单生成回忆草稿提示（AI 回声） */
export async function generateBillEchoDraft(
  input: BillEchoInput,
  ai: AISettings | undefined,
): Promise<MemoryDraftResult> {
  const building = BUILDING_META[input.buildingType].label;
  const date = input.bills[0]?.date ?? new Date().toISOString().slice(0, 10);
  const billLine = input.bills
    .slice(0, 3)
    .map(b => `${b.label} ¥${b.amount}`)
    .join('、');
  const userHint = billLine
    ? `今天${billLine}，发生了什么？`
    : `今天在${building}有什么值得记录的事？`;

  return generateMemoryDraft(
    { cityId: input.cityId, buildingType: input.buildingType, date, userHint },
    ai,
    undefined,
  );
}
