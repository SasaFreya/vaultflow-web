import type { LifeTownMemoriesData } from '@/types/life-town';
import {
  loadRemoteSyncConfig,
  pushRemoteBackup,
  saveRemoteSyncConfig,
  type RemoteSyncConfig,
} from '@/lib/life-memories-sync-remote';

const RETRY_QUEUE_KEY = 'vaultflow_webdav_retry_queue';
const MAX_ATTEMPTS = 5;
const DEFAULT_INTERVAL_HOURS = 6;

export interface WebDavRetryItem {
  id: string;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  nextRetryAt: string;
}

function loadRetryQueue(): WebDavRetryItem[] {
  try {
    const raw = localStorage.getItem(RETRY_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as WebDavRetryItem[]) : [];
  } catch {
    return [];
  }
}

function saveRetryQueue(queue: WebDavRetryItem[]): void {
  localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
}

export function getWebDavRetryQueue(): WebDavRetryItem[] {
  return loadRetryQueue();
}

export function enqueueWebDavRetry(error: string): void {
  const queue = loadRetryQueue();
  const now = new Date().toISOString();
  const backoffMin = Math.min(60, 2 ** Math.min(queue.length, 5));
  const nextRetryAt = new Date(Date.now() + backoffMin * 60_000).toISOString();
  queue.push({
    id: `retry_${Date.now()}`,
    queuedAt: now,
    attempts: 0,
    lastError: error,
    nextRetryAt,
  });
  saveRetryQueue(queue.slice(-20));
}

export async function processWebDavRetryQueue(
  data: LifeTownMemoriesData,
): Promise<{ processed: number; remaining: number }> {
  const config = loadRemoteSyncConfig();
  if (!config.enabled || !config.url.trim()) {
    return { processed: 0, remaining: loadRetryQueue().length };
  }

  const now = Date.now();
  const queue = loadRetryQueue();
  const pending = queue.filter(item => new Date(item.nextRetryAt).getTime() <= now);
  if (pending.length === 0) {
    return { processed: 0, remaining: queue.length };
  }

  let processed = 0;
  const remaining: WebDavRetryItem[] = queue.filter(item => !pending.includes(item));

  for (const item of pending) {
    if (item.attempts >= MAX_ATTEMPTS) continue;
    try {
      await pushRemoteBackup(data, config);
      processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '推送失败';
      const attempts = item.attempts + 1;
      if (attempts < MAX_ATTEMPTS) {
        const backoffMin = Math.min(120, 2 ** attempts);
        remaining.push({
          ...item,
          attempts,
          lastError: msg,
          nextRetryAt: new Date(Date.now() + backoffMin * 60_000).toISOString(),
        });
      }
    }
  }

  saveRetryQueue(remaining);
  return { processed, remaining: remaining.length };
}

function shouldRunScheduledBackup(config: RemoteSyncConfig): boolean {
  if (!config.enabled || !config.scheduledBackup || !config.url.trim()) return false;
  const hours = config.scheduledIntervalHours ?? DEFAULT_INTERVAL_HOURS;
  const last = config.lastScheduledPushAt ?? config.lastPushAt;
  if (!last) return true;
  return Date.now() - new Date(last).getTime() >= hours * 60 * 60_000;
}

export async function runScheduledWebDavBackup(
  data: LifeTownMemoriesData,
): Promise<'ok' | 'queued' | 'skip'> {
  const config = loadRemoteSyncConfig();
  if (!shouldRunScheduledBackup(config)) return 'skip';
  try {
    await pushRemoteBackup(data, config);
    saveRemoteSyncConfig({
      ...loadRemoteSyncConfig(),
      lastScheduledPushAt: new Date().toISOString(),
    });
    return 'ok';
  } catch (e) {
    enqueueWebDavRetry(e instanceof Error ? e.message : '定时备份失败');
    return 'queued';
  }
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

/** 应用内定时备份 + 失败重试（需 LifeMemoriesProvider 挂载） */
export function startWebDavBackupScheduler(getData: () => LifeTownMemoriesData | null): () => void {
  if (schedulerTimer) clearInterval(schedulerTimer);

  const tick = () => {
    const data = getData();
    if (!data) return;
    void runScheduledWebDavBackup(data);
    void processWebDavRetryQueue(data);
  };

  tick();
  schedulerTimer = setInterval(tick, 5 * 60_000);

  const onFocus = () => tick();
  window.addEventListener('focus', onFocus);

  return () => {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
    window.removeEventListener('focus', onFocus);
  };
}
