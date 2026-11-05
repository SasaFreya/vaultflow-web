import type { AppData, VaultSettings, OCRSettings } from '@/types';
import { fullSyncData, validateAppData } from '@/lib/storage';

const DATA_KEY = 'vaultflow_data';
const SETTINGS_KEY = 'vaultflow_settings';

export const DEFAULT_SETTINGS: VaultSettings = {
  baseCurrency: 'CNY',
  exchangeRates: {
    CNY: 1,
    USD: 7.25,
    HKD: 0.93,
    EUR: 7.85,
    JPY: 0.048,
  },
  lockEnabled: false,
  passwordHash: null,
  monthlyIncome: null,
  monthlyExpense: null,
  chartAxisUnit: '10k',
  goalAllocationMode: 'priority',
  netWorthAnchorDate: undefined,
  ocr: { provider: null },
  ai: {},
};

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

function normalizeSettings(raw: Partial<VaultSettings> | null | undefined): VaultSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    exchangeRates: {
      ...DEFAULT_SETTINGS.exchangeRates,
      ...(raw.exchangeRates ?? {}),
    },
    ocr: {
      provider: (raw.ocr?.provider ?? DEFAULT_SETTINGS.ocr?.provider ?? null) as OCRSettings['provider'],
      baiduApiKey: raw.ocr?.baiduApiKey ?? DEFAULT_SETTINGS.ocr?.baiduApiKey,
      baiduSecretKey: raw.ocr?.baiduSecretKey ?? DEFAULT_SETTINGS.ocr?.baiduSecretKey,
      tencentSecretId: raw.ocr?.tencentSecretId ?? DEFAULT_SETTINGS.ocr?.tencentSecretId,
      tencentSecretKey: raw.ocr?.tencentSecretKey ?? DEFAULT_SETTINGS.ocr?.tencentSecretKey,
      aliyunAccessKeyId: raw.ocr?.aliyunAccessKeyId ?? DEFAULT_SETTINGS.ocr?.aliyunAccessKeyId,
      aliyunAccessKeySecret: raw.ocr?.aliyunAccessKeySecret ?? DEFAULT_SETTINGS.ocr?.aliyunAccessKeySecret,
    },
    ai: {
      dashscopeApiKey: raw.ai?.dashscopeApiKey ?? DEFAULT_SETTINGS.ai?.dashscopeApiKey,
      memoryModel: raw.ai?.memoryModel ?? DEFAULT_SETTINGS.ai?.memoryModel ?? 'qwen-turbo',
      visionModel: raw.ai?.visionModel ?? DEFAULT_SETTINGS.ai?.visionModel ?? 'qwen-vl-plus',
    },
  };
}

export async function loadPersistedData(fallback: AppData): Promise<AppData> {
  if (isElectron()) {
    try {
      const raw = await window.electronAPI!.readFile('data.json');
      if (raw) {
        const result = validateAppData(JSON.parse(raw));
        if (result.success && result.data) return result.data;
      }
    } catch (e) {
      console.error('Electron data load failed:', e);
    }

    const ls = localStorage.getItem(DATA_KEY);
    if (ls) {
      try {
        const result = validateAppData(JSON.parse(ls));
        if (result.success && result.data) {
          await savePersistedData(result.data);
          return result.data;
        }
      } catch { /* ignore */ }
    }

    await savePersistedData(fallback);
    return fallback;
  }

  const stored = localStorage.getItem(DATA_KEY);
  if (stored === null) return fallback;
  let parsed: unknown;
  try { parsed = JSON.parse(stored); } catch { throw new Error('本地账本无法解析，原数据已保留。请先保留浏览器数据并检查备份。'); }
  const result = validateAppData(parsed);
  if (!result.success || !result.data) throw new Error(`本地账本校验失败，原数据已保留：${result.errors.join('；')}`);
  return result.data;
}

export async function savePersistedData(data: AppData): Promise<void> {
  const json = JSON.stringify(data);
  localStorage.setItem(DATA_KEY, json);

  if (isElectron()) {
    try {
      await window.electronAPI!.writeFile('data.json', json);
    } catch (e) {
      console.error('Electron data save failed:', e);
    }
  }
}

export async function loadPersistedSettings(): Promise<VaultSettings> {
  if (isElectron()) {
    try {
      const raw = await window.electronAPI!.readFile('settings.json');
      if (raw) return normalizeSettings(JSON.parse(raw));
    } catch (e) {
      console.error('Electron settings load failed:', e);
    }

    const ls = localStorage.getItem(SETTINGS_KEY);
    if (ls) {
      try {
        const settings = normalizeSettings(JSON.parse(ls));
        await savePersistedSettings(settings);
        return settings;
      } catch { /* ignore */ }
    }

    const defaults = { ...DEFAULT_SETTINGS };
    await savePersistedSettings(defaults);
    return defaults;
  }

  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored === null) return { ...DEFAULT_SETTINGS };
  try { return normalizeSettings(JSON.parse(stored)); }
  catch { throw new Error('本地设置无法解析，原数据已保留，请检查浏览器数据或备份。'); }
}

export async function savePersistedSettings(settings: VaultSettings): Promise<void> {
  const json = JSON.stringify(settings);
  localStorage.setItem(SETTINGS_KEY, json);

  if (isElectron()) {
    try {
      await window.electronAPI!.writeFile('settings.json', json);
    } catch (e) {
      console.error('Electron settings save failed:', e);
    }
  }
}

export async function getDataDirectory(): Promise<string | null> {
  if (!isElectron()) return null;
  try {
    return await window.electronAPI!.getDataDir();
  } catch {
    return null;
  }
}

export async function downloadTextFile(content: string, filename: string, mime = 'text/plain'): Promise<boolean> {
  if (isElectron()) {
    const result = await window.electronAPI!.showSaveDialog({
      title: '保存文件',
      defaultPath: filename,
      filters: [{ name: '文件', extensions: [filename.split('.').pop() || 'txt'] }],
    });
    if (result.canceled || !result.filePath) return false;
    await window.electronAPI!.writeFilePath(result.filePath, content);
    return true;
  }

  const blob = new Blob([content], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
}

export async function pickAndReadTextFile(accept: string): Promise<string | null> {
  if (isElectron()) {
    const ext = accept.replace('.', '');
    const result = await window.electronAPI!.showOpenDialog({
      title: '选择文件',
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return window.electronAPI!.readFilePath(result.filePaths[0]);
  }

  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

export function migrateAndSync(data: AppData): AppData {
  return fullSyncData(data);
}
