import type { LifeTownMemoriesData } from '@/types/life-town';
import { saveLifeMemoriesData, loadLifeMemoriesData } from '@/lib/life-memories-persistence';
import { isElectron } from '@/lib/persistence';

const CLOUD_BACKUP_KEY = 'vaultflow_life_memories_cloud_backup';
const CLOUD_BACKUP_FILE = 'life-memories-cloud-backup.json';

export interface LifeMemoriesBackupEnvelope {
  version: 1;
  exportedAt: string;
  device: string;
  data: LifeTownMemoriesData;
}

export function serializeLifeMemoriesBackup(data: LifeTownMemoriesData): string {
  const envelope: LifeMemoriesBackupEnvelope = {
    version: 1,
    exportedAt: new Date().toISOString(),
    device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'unknown',
    data,
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseLifeMemoriesBackup(raw: string): LifeTownMemoriesData {
  const parsed = JSON.parse(raw) as LifeMemoriesBackupEnvelope | LifeTownMemoriesData;
  if ('data' in parsed && parsed.data?.cities) return parsed.data;
  if ('cities' in parsed) return parsed as LifeTownMemoriesData;
  throw new Error('无效的备份格式');
}

export function downloadLifeMemoriesBackup(data: LifeTownMemoriesData, filename?: string): void {
  const json = serializeLifeMemoriesBackup(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `vaultflow-life-ecosystem-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 本地「云端槽位」— Electron 写独立文件，Web 写 localStorage */
export async function pushCloudBackupSlot(data: LifeTownMemoriesData): Promise<string> {
  const json = serializeLifeMemoriesBackup(data);
  localStorage.setItem(CLOUD_BACKUP_KEY, json);
  if (isElectron()) {
    await window.electronAPI!.writeFile(CLOUD_BACKUP_FILE, json);
  }
  return new Date().toISOString();
}

export async function pullCloudBackupSlot(): Promise<LifeMemoriesBackupEnvelope | null> {
  if (isElectron()) {
    try {
      const raw = await window.electronAPI!.readFile(CLOUD_BACKUP_FILE);
      if (raw) return JSON.parse(raw) as LifeMemoriesBackupEnvelope;
    } catch {
      /* fall through */
    }
  }
  const stored = localStorage.getItem(CLOUD_BACKUP_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as LifeMemoriesBackupEnvelope;
  } catch {
    return null;
  }
}

export async function restoreFromCloudBackupSlot(): Promise<LifeTownMemoriesData | null> {
  const slot = await pullCloudBackupSlot();
  if (!slot?.data) return null;
  await saveLifeMemoriesData(slot.data);
  return slot.data;
}

export async function getLastCloudBackupTime(): Promise<string | null> {
  const slot = await pullCloudBackupSlot();
  return slot?.exportedAt ?? null;
}

export async function importBackupFromFile(file: File): Promise<LifeTownMemoriesData> {
  const text = await file.text();
  const data = parseLifeMemoriesBackup(text);
  await saveLifeMemoriesData(data);
  await pushCloudBackupSlot(data);
  return loadLifeMemoriesData();
}
