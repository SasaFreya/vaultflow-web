import { useEffect, useRef, useState } from 'react';
import { CloudUpload, CloudDownload, Download, Upload, Globe } from 'lucide-react';
import type { LifeTownMemoriesData } from '@/types/life-town';
import {
  downloadLifeMemoriesBackup,
  pushCloudBackupSlot,
  restoreFromCloudBackupSlot,
  importBackupFromFile,
  getLastCloudBackupTime,
} from '@/lib/life-memories-sync';
import {
  loadRemoteSyncConfig,
  saveRemoteSyncConfig,
  pushRemoteBackup,
  pullRemoteBackup,
  pullRemoteEnvelope,
  loadSyncConflict,
  testWebDavConnection,
  type RemoteSyncConfig,
} from '@/lib/life-memories-sync-remote';
import { getWebDavRetryQueue, processWebDavRetryQueue } from '@/lib/webdav-backup-scheduler';
import { WEBDAV_PRESETS, applyWebDavPreset } from '@/lib/webdav-presets';
import EcoSyncConflictPanel from '@/components/town/EcoSyncConflictPanel';
import EcoSyncPullPreviewPanel from '@/components/town/EcoSyncPullPreviewPanel';
import { previewIncrementalPull } from '@/lib/life-memories-incremental-sync';

interface EcoSyncPanelProps {
  data: LifeTownMemoriesData;
  onRestored: () => void;
}

export default function EcoSyncPanel({ data, onRestored }: EcoSyncPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [remote, setRemote] = useState<RemoteSyncConfig>(() => loadRemoteSyncConfig());
  const [showRemote, setShowRemote] = useState(remote.enabled);
  const [conflict, setConflict] = useState(() => loadSyncConflict());
  const [testing, setTesting] = useState(false);
  const [retryQueue, setRetryQueue] = useState(() => getWebDavRetryQueue());
  const [pullPreview, setPullPreview] = useState<{
    remote: LifeTownMemoriesData;
    exportedAt?: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    const result = await testWebDavConnection(remote);
    setRemote(loadRemoteSyncConfig());
    setMsg(result.message);
    setTesting(false);
  };

  useEffect(() => {
    void getLastCloudBackupTime().then(setLastSync);
    setRetryQueue(getWebDavRetryQueue());
  }, []);

  const handlePush = async () => {
    const t = await pushCloudBackupSlot(data);
    setLastSync(t);
    setMsg('已写入本地云端槽位');
  };

  const handlePull = async () => {
    const restored = await restoreFromCloudBackupSlot();
    if (!restored) {
      setMsg('云端槽位为空');
      return;
    }
    setMsg('已从云端槽位恢复');
    onRestored();
  };

  const handleImport = async (file: File) => {
    await importBackupFromFile(file);
    setMsg('导入成功');
    onRestored();
  };

  const handleRemotePush = async (force = false) => {
    try {
      saveRemoteSyncConfig({ ...remote, enabled: true });
      const t = await pushRemoteBackup(data, remote, force);
      setMsg(`已推送到 WebDAV · ${new Date(t).toLocaleString()}`);
      setRemote(loadRemoteSyncConfig());
      setConflict(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '远程推送失败');
      setConflict(loadSyncConflict());
    }
  };

  const handleRemotePull = async () => {
    try {
      if (remote.incrementalSync !== false) {
        const envelope = await pullRemoteEnvelope(remote);
        if (!envelope?.data) throw new Error('远程文件为空');
        const preview = previewIncrementalPull(data, envelope.data);
        if (preview.length > 0) {
          setPullPreview({ remote: envelope.data, exportedAt: envelope.exportedAt });
          setMsg(`发现 ${preview.length} 条远程增量，请预览后确认合并`);
          return;
        }
      }
      await pullRemoteBackup(remote);
      setMsg('已从 WebDAV 拉取并恢复');
      onRestored();
      setRemote(loadRemoteSyncConfig());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '远程拉取失败');
    }
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3 eco-sync-panel"
      style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <div>
        <h3 className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>
          跨设备生态备份
        </h3>
        <p className="text-[10px] mt-1" style={{ color: 'var(--rpg-text-secondary)' }}>
          本地槽位 / JSON 文件 / WebDAV（iCloud、坚果云、自建 NAS）
        </p>
        {lastSync && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--rpg-text-secondary)' }}>
            上次本地槽位：{new Date(lastSync).toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="season-report-btn" onClick={() => downloadLifeMemoriesBackup(data)}>
          <Download className="w-3.5 h-3.5" /> 导出 JSON
        </button>
        <button type="button" className="season-report-btn" onClick={() => void handlePush()}>
          <CloudUpload className="w-3.5 h-3.5" /> 推送到槽位
        </button>
        <button type="button" className="season-report-btn" onClick={() => void handlePull()}>
          <CloudDownload className="w-3.5 h-3.5" /> 从槽位恢复
        </button>
        <button type="button" className="season-report-btn" onClick={() => inputRef.current?.click()}>
          <Upload className="w-3.5 h-3.5" /> 导入 JSON
        </button>
        <button type="button" className="season-report-btn" onClick={() => setShowRemote(v => !v)}>
          <Globe className="w-3.5 h-3.5" /> WebDAV
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
            e.target.value = '';
          }}
        />
      </div>

      {showRemote && (
        <div className="eco-sync-remote space-y-2 pt-2 border-t" style={{ borderColor: 'var(--rpg-border)' }}>
          <div className="flex flex-wrap gap-1.5">
            {WEBDAV_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                className="season-report-btn text-[10px]"
                title={preset.hint}
                onClick={() => {
                  const next = applyWebDavPreset(preset, remote);
                  setRemote(next);
                  saveRemoteSyncConfig(next);
                  setMsg(`已填入 ${preset.label} 模板`);
                }}
              >
                {preset.label} 预设
              </button>
            ))}
          </div>
          <input
            type="url"
            placeholder="WebDAV 地址 https://dav.example.com/backup/"
            value={remote.url}
            onChange={e => setRemote({ ...remote, url: e.target.value })}
            className="w-full px-2 py-1.5 rounded text-xs"
            style={{ border: '1px solid var(--rpg-border)', background: 'var(--rpg-bg)' }}
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="用户名"
              value={remote.username ?? ''}
              onChange={e => setRemote({ ...remote, username: e.target.value })}
              className="flex-1 px-2 py-1.5 rounded text-xs"
              style={{ border: '1px solid var(--rpg-border)', background: 'var(--rpg-bg)' }}
            />
            <input
              type="password"
              placeholder="密码"
              value={remote.password ?? ''}
              onChange={e => setRemote({ ...remote, password: e.target.value })}
              className="flex-1 px-2 py-1.5 rounded text-xs"
              style={{ border: '1px solid var(--rpg-border)', background: 'var(--rpg-bg)' }}
            />
          </div>
          <input
            type="text"
            placeholder="文件名"
            value={remote.filename}
            onChange={e => setRemote({ ...remote, filename: e.target.value })}
            className="w-full px-2 py-1.5 rounded text-xs"
            style={{ border: '1px solid var(--rpg-border)', background: 'var(--rpg-bg)' }}
          />
          <label className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--rpg-text)' }}>
            <input
              type="checkbox"
              checked={remote.incrementalSync !== false}
              onChange={e => {
                const next = { ...remote, incrementalSync: e.target.checked, enabled: true };
                setRemote(next);
                saveRemoteSyncConfig(next);
              }}
            />
            增量同步（仅合并变更回忆，降低冲突）
          </label>
          <label className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--rpg-text)' }}>
            <input
              type="checkbox"
              checked={remote.autoSync}
              onChange={e => {
                const next = { ...remote, autoSync: e.target.checked, enabled: true };
                setRemote(next);
                saveRemoteSyncConfig(next);
              }}
            />
            写回忆后自动静默推送（冲突时暂停并提示）
          </label>
          <label className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--rpg-text)' }}>
            <input
              type="checkbox"
              checked={remote.scheduledBackup ?? false}
              onChange={e => {
                const next = {
                  ...remote,
                  scheduledBackup: e.target.checked,
                  enabled: true,
                  scheduledIntervalHours: remote.scheduledIntervalHours ?? 6,
                };
                setRemote(next);
                saveRemoteSyncConfig(next);
              }}
            />
            定时自动备份（默认每 6 小时，失败进入重试队列）
          </label>
          {(remote.scheduledBackup ?? false) && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--rpg-text-secondary)' }}>
              <span>间隔</span>
              <select
                value={remote.scheduledIntervalHours ?? 6}
                onChange={e => {
                  const next = { ...remote, scheduledIntervalHours: Number(e.target.value) };
                  setRemote(next);
                  saveRemoteSyncConfig(next);
                }}
                className="px-2 py-1 rounded text-xs"
                style={{ border: '1px solid var(--rpg-border)', background: 'var(--rpg-bg)' }}
              >
                <option value={1}>1 小时</option>
                <option value={6}>6 小时</option>
                <option value={12}>12 小时</option>
                <option value={24}>24 小时</option>
              </select>
              {remote.lastScheduledPushAt && (
                <span>上次定时：{new Date(remote.lastScheduledPushAt).toLocaleString()}</span>
              )}
            </div>
          )}
          {retryQueue.length > 0 && (
            <div className="rounded-lg px-2 py-1.5 text-[10px] space-y-1" style={{ background: 'rgba(255, 183, 77, 0.12)', border: '1px solid var(--rpg-border)' }}>
              <p style={{ color: 'var(--rpg-text)' }}>重试队列 {retryQueue.length} 条</p>
              {retryQueue.slice(0, 3).map(item => (
                <p key={item.id} style={{ color: 'var(--rpg-text-secondary)' }}>
                  {item.lastError ?? '等待重试'} · 第 {item.attempts + 1} 次 · {new Date(item.nextRetryAt).toLocaleString()}
                </p>
              ))}
              <button
                type="button"
                className="season-report-btn text-[10px]"
                onClick={() => {
                  void processWebDavRetryQueue(data).then(r => {
                    setRetryQueue(getWebDavRetryQueue());
                    setMsg(r.processed > 0 ? `已重试成功 ${r.processed} 条` : `队列剩余 ${r.remaining} 条`);
                  });
                }}
              >
                立即重试队列
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="season-report-btn"
              disabled={testing || !remote.url.trim()}
              onClick={() => void handleTestConnection()}
            >
              {testing ? '测试中…' : '测试连接'}
            </button>
            <button type="button" className="season-report-btn" onClick={() => void handleRemotePush()}>
              推送到 WebDAV
            </button>
            <button type="button" className="season-report-btn" onClick={() => void handleRemotePush(true)}>
              强制覆盖推送
            </button>
            <button type="button" className="season-report-btn" onClick={() => void handleRemotePull()}>
              从 WebDAV 拉取
            </button>
          </div>
          {pullPreview && (
            <EcoSyncPullPreviewPanel
              local={data}
              remote={pullPreview.remote}
              config={remote}
              exportedAt={pullPreview.exportedAt}
              onMerged={() => {
                setPullPreview(null);
                setRemote(loadRemoteSyncConfig());
                setMsg('已合并选中的远程回忆');
                onRestored();
              }}
              onCancel={() => setPullPreview(null)}
            />
          )}
          {conflict && (
            <EcoSyncConflictPanel
              local={data}
              config={remote}
              conflict={conflict}
              onResolved={() => {
                setConflict(null);
                setRemote(loadRemoteSyncConfig());
                setMsg('冲突已处理');
                onRestored();
              }}
            />
          )}
          {remote.lastTestOkAt && (
            <p className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
              上次连通：{new Date(remote.lastTestOkAt).toLocaleString()}
              {remote.lastTestLatencyMs != null && ` · ${remote.lastTestLatencyMs}ms`}
            </p>
          )}
          {remote.lastPushAt && (
            <p className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
              上次远程推送：{new Date(remote.lastPushAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {msg && <p className="text-[10px]" style={{ color: 'var(--rpg-primary)' }}>{msg}</p>}
    </div>
  );
}
