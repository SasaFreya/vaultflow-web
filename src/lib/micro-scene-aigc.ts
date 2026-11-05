import type { BuildingType } from '@/types/life-town';
import type { AISettings } from '@/types';

const CACHE_KEY = 'vaultflow_micro_scene_aigc';

type AigcCache = Record<string, string>;

function loadCache(): AigcCache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as AigcCache;
  } catch {
    return {};
  }
}

function saveCache(cache: AigcCache): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

const PROMPTS: Record<BuildingType, string> = {
  home: '温馨小窝客厅，可爱水彩插画，暖黄灯光，柔软沙发',
  gym: '明亮健身房，瑜伽垫哑铃，可爱水彩插画风格',
  library: '安静图书馆阅读角，书架暖灯，可爱水彩插画',
  company: '现代办公室绿植桌面，可爱水彩插画，柔和色调',
  cafe: '温馨咖啡馆室内，咖啡香气，可爱水彩插画',
};

export function getCachedMicroSceneWallpaper(buildingType: BuildingType): string | null {
  return loadCache()[buildingType] ?? null;
}

/** 可选 AIGC 室内壁纸 — 需百炼 dashscopeApiKey */
export async function generateMicroSceneWallpaper(
  buildingType: BuildingType,
  ai?: AISettings,
): Promise<string | null> {
  const cached = getCachedMicroSceneWallpaper(buildingType);
  if (cached) return cached;

  const apiKey = ai?.dashscopeApiKey?.trim();
  if (!apiKey) return null;

  try {
    const createRes = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'wanx-v1',
          input: { prompt: PROMPTS[buildingType] },
          parameters: { size: '1024*1024', n: 1 },
        }),
      },
    );
    if (!createRes.ok) return null;
    const createJson = (await createRes.json()) as { output?: { task_id?: string } };
    const taskId = createJson.output?.task_id;
    if (!taskId) return null;

    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (!pollRes.ok) continue;
      const pollJson = (await pollRes.json()) as {
        output?: { task_status?: string; results?: { url?: string }[] };
      };
      if (pollJson.output?.task_status === 'SUCCEEDED') {
        const imgUrl = pollJson.output.results?.[0]?.url;
        if (!imgUrl) return null;
        const imgRes = await fetch(imgUrl);
        const blob = await imgRes.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        const cache = loadCache();
        cache[buildingType] = dataUrl;
        saveCache(cache);
        return dataUrl;
      }
      if (pollJson.output?.task_status === 'FAILED') return null;
    }
    return null;
  } catch {
    return null;
  }
}
