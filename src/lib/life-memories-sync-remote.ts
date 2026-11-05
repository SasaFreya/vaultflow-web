import type { LifeTownMemoriesData } from '@/types/life-town';
import type { LifeMemoriesBackupEnvelope } from '@/lib/life-memories-sync';
import { saveLifeMemoriesData, loadLifeMemoriesData } from '@/lib/life-memories-persistence';
import { enqueueWebDavRetry } from '@/lib/webdav-backup-scheduler';
import {
  loadSyncedMemoryHashes,
  markMemoriesSynced,
  mergeIncrementalIntoRemote,
  mergeIncrementalFromRemote,
} from '@/lib/life-memories-incremental-sync';

const REMOTE_CONFIG_KEY = 'vaultflow_eco_remote_sync';
const CONFLICT_KEY = 'vaultflow_eco_sync_conflict';

export type RemoteSyncProvider = 'webdav' | 'custom';

export interface RemoteSyncConfig {
  enabled: boolean;
  autoSync: boolean;
  scheduledBackup?: boolean;
  scheduledIntervalHours?: number;
  incrementalSync?: boolean;
  provider: RemoteSyncProvider;
  url: string;
  username?: string;
  password?: string;
  filename: string;
  lastPushAt?: string;
  lastScheduledPushAt?: string;
  lastPullAt?: string;
  lastLocalExportedAt?: string;
  lastRemoteExportedAt?: string;
  lastTestOkAt?: string;
  lastTestLatencyMs?: number;
}

export interface SyncConflictInfo {
  at: string;
  message: string;
  localExportedAt?: string;
  remoteExportedAt?: string;
}

export const DEFAULT_REMOTE_SYNC: RemoteSyncConfig = {
  enabled: false,
  autoSync: false,
  incrementalSync: true,
  provider: 'webdav',
  url: '',
  filename: 'vaultflow-life-ecosystem.json',
};

export function loadRemoteSyncConfig(): RemoteSyncConfig {
  try {
    const raw = localStorage.getItem(REMOTE_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_REMOTE_SYNC };
    return { ...DEFAULT_REMOTE_SYNC, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_REMOTE_SYNC };
  }
}

export function saveRemoteSyncConfig(config: RemoteSyncConfig): void {
  localStorage.setItem(REMOTE_CONFIG_KEY, JSON.stringify(config));
}

export function loadSyncConflict(): SyncConflictInfo | null {
  try {
    const raw = localStorage.getItem(CONFLICT_KEY);
    return raw ? (JSON.parse(raw) as SyncConflictInfo) : null;
  } catch {
    return null;
  }
}

export function clearSyncConflict(): void {
  localStorage.removeItem(CONFLICT_KEY);
}

function setSyncConflict(info: SyncConflictInfo): void {
  localStorage.setItem(CONFLICT_KEY, JSON.stringify(info));
}

function resolveWebDavUrl(base: string, filename: string): string {
  const trimmed = base.replace(/\/$/, '');
  return `${trimmed}/${filename.replace(/^\//, '')}`;
}

function authHeaders(config: RemoteSyncConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.username) {
    headers.Authorization = `Basic ${btoa(`${config.username}:${config.password ?? ''}`)}`;
  }
  return headers;
}

async function webDavRequest(
  config: RemoteSyncConfig,
  method: 'PUT' | 'GET' | 'HEAD',
  body?: string,
): Promise<Response> {
  const url = resolveWebDavUrl(config.url, config.filename);
  const headers: Record<string, string> = {
    ...authHeaders(config),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };
  return fetch(url, { method, headers, body });
}

async function fetchRemoteEnvelope(config: RemoteSyncConfig): Promise<LifeMemoriesBackupEnvelope | null> {
  const res = await webDavRequest(config, 'GET');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`拉取失败 (${res.status})`);
  const text = await res.text();
  return JSON.parse(text) as LifeMemoriesBackupEnvelope;
}

/** 检测远程是否比本地槽位更新 → 冲突则跳过推送 */
export async function checkRemoteSyncConflict(
  data: LifeTownMemoriesData,
  config: RemoteSyncConfig,
): Promise<'ok' | 'conflict' | 'skip'> {
  if (!config.url.trim() || !config.enabled) return 'skip';
  try {
    const remote = await fetchRemoteEnvelope(config);
    if (!remote?.exportedAt) return 'ok';
    const localAt = config.lastLocalExportedAt;
    if (!localAt) return 'ok';
    if (remote.exportedAt > localAt) {
      const localMemCount = data.memories.length;
      const remoteMemCount = remote.data?.memories?.length ?? 0;
      if (remoteMemCount !== localMemCount || remote.exportedAt !== config.lastRemoteExportedAt) {
        setSyncConflict({
          at: new Date().toISOString(),
          message: '远程备份比本机更新，已暂停自动推送。请手动选择拉取或强制推送。',
          localExportedAt: localAt,
          remoteExportedAt: remote.exportedAt,
        });
        return 'conflict';
      }
    }
    return 'ok';
  } catch {
    return 'skip';
  }
}

export async function pushRemoteBackup(
  data: LifeTownMemoriesData,
  config: RemoteSyncConfig,
  force = false,
): Promise<string> {
  if (!config.url.trim()) throw new Error('请填写 WebDAV 地址');
  if (!force) {
    const status = await checkRemoteSyncConflict(data, config);
    if (status === 'conflict') throw new Error('检测到同步冲突，请先处理后再推送');
  }

  const prevHashes = loadSyncedMemoryHashes();
  let payloadData = data;

  if (config.incrementalSync !== false && !force) {
    const remote = await fetchRemoteEnvelope(config).catch(() => null);
    const { merged, changedCount, deletedCount } = mergeIncrementalIntoRemote(
      data,
      remote?.data ?? null,
      prevHashes,
    );
    if (changedCount === 0 && deletedCount === 0 && Object.keys(prevHashes).length > 0) {
      return config.lastPushAt ?? new Date().toISOString();
    }
    payloadData = merged;
  }

  const exportedAt = new Date().toISOString();
  const envelope: LifeMemoriesBackupEnvelope = {
    version: 1,
    exportedAt,
    device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'unknown',
    data: payloadData,
  };
  const json = JSON.stringify(envelope, null, 2);
  const res = await webDavRequest(config, 'PUT', json);
  if (!res.ok) throw new Error(`推送失败 (${res.status})`);
  markMemoriesSynced(data);
  const next: RemoteSyncConfig = {
    ...config,
    lastPushAt: exportedAt,
    lastLocalExportedAt: exportedAt,
    lastRemoteExportedAt: exportedAt,
  };
  saveRemoteSyncConfig(next);
  clearSyncConflict();
  return exportedAt;
}

/** 测试 WebDAV 连通性（HEAD） */
export async function testWebDavConnection(config: RemoteSyncConfig): Promise<{
  ok: boolean;
  status: number;
  message: string;
  latencyMs: number;
}> {
  if (!config.url.trim()) {
    return { ok: false, status: 0, message: '请填写 WebDAV 地址', latencyMs: 0 };
  }
  const started = performance.now();
  try {
    const res = await webDavRequest(config, 'HEAD');
    const latencyMs = Math.round(performance.now() - started);
    const next: RemoteSyncConfig = {
      ...config,
      ...(res.ok || res.status === 404
        ? { lastTestOkAt: new Date().toISOString(), lastTestLatencyMs: latencyMs }
        : {}),
    };
    saveRemoteSyncConfig(next);
    if (res.ok || res.status === 404) {
      return {
        ok: true,
        status: res.status,
        latencyMs,
        message: res.status === 404
          ? `连接成功 ${latencyMs}ms（远程文件尚未创建）`
          : `连接成功 ${latencyMs}ms，账号密码有效`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: res.status, latencyMs, message: `认证失败 (${res.status}) · ${latencyMs}ms` };
    }
    return { ok: false, status: res.status, latencyMs, message: `服务器响应 ${res.status} · ${latencyMs}ms` };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - started);
    return {
      ok: false,
      status: 0,
      latencyMs,
      message: e instanceof Error ? e.message : '网络请求失败',
    };
  }
}

/** 拉取远程备份信封（不写入本地） */
export async function pullRemoteEnvelope(
  config: RemoteSyncConfig,
): Promise<LifeMemoriesBackupEnvelope | null> {
  if (!config.url.trim()) throw new Error('请填写 WebDAV 地址');
  return fetchRemoteEnvelope(config);
}

export async function applyRemoteBackupData(
  data: LifeTownMemoriesData,
  config: RemoteSyncConfig,
  exportedAt?: string,
): Promise<void> {
  await saveLifeMemoriesData(data);
  const now = exportedAt ?? new Date().toISOString();
  saveRemoteSyncConfig({
    ...config,
    lastPullAt: now,
    lastRemoteExportedAt: now,
    lastLocalExportedAt: now,
  });
  clearSyncConflict();
}

export async function pullRemoteBackup(
  config: RemoteSyncConfig,
  forceFull = false,
): Promise<LifeTownMemoriesData> {
  if (!config.url.trim()) throw new Error('请填写 WebDAV 地址');
  const remote = await fetchRemoteEnvelope(config);
  if (!remote?.data) throw new Error('远程文件为空');

  if (config.incrementalSync !== false && !forceFull) {
    const local = await loadLifeMemoriesData();
    const { merged, importedCount, updatedCount } = mergeIncrementalFromRemote(local, remote.data);
    if (importedCount === 0 && updatedCount === 0) {
      await applyRemoteBackupData(local, config, remote.exportedAt);
      return local;
    }
    await applyRemoteBackupData(merged, config, remote.exportedAt);
    markMemoriesSynced(merged);
    return merged;
  }

  await applyRemoteBackupData(remote.data, config, remote.exportedAt);
  markMemoriesSynced(remote.data);
  return remote.data;
}

/** 写回忆后静默推送（需开启 autoSync） */
export async function autoSyncMemoriesAfterWrite(data: LifeTownMemoriesData): Promise<void> {
  const config = loadRemoteSyncConfig();
  if (!config.enabled || !config.autoSync || !config.url.trim()) return;
  try {
    await pushRemoteBackup(data, config);
  } catch (e) {
    enqueueWebDavRetry(e instanceof Error ? e.message : '自动同步失败');
  }
}
