import type { RemoteSyncConfig } from '@/lib/life-memories-sync-remote';

export interface WebDavPreset {
  id: string;
  label: string;
  hint: string;
  url: string;
  filename: string;
}

export const WEBDAV_PRESETS: WebDavPreset[] = [
  {
    id: 'jianguoyun',
    label: '坚果云',
    hint: '在坚果云「账户信息 → 安全选项」开启 WebDAV，服务器填 dav.jianguoyun.com',
    url: 'https://dav.jianguoyun.com/dav/',
    filename: 'vaultflow-life-ecosystem.json',
  },
  {
    id: 'icloud',
    label: 'iCloud',
    hint: '使用 Apple 专用密码；地址格式 https://p数字.webdav.icloud.com/你的目录/',
    url: 'https://p123.webdav.icloud.com/Documents/VaultFlow/',
    filename: 'vaultflow-life-ecosystem.json',
  },
  {
    id: 'nextcloud',
    label: 'Nextcloud',
    hint: '自建或托管 Nextcloud 的 WebDAV 根路径',
    url: 'https://cloud.example.com/remote.php/dav/files/用户名/',
    filename: 'vaultflow-life-ecosystem.json',
  },
];

export function applyWebDavPreset(preset: WebDavPreset, current: RemoteSyncConfig): RemoteSyncConfig {
  return {
    ...current,
    enabled: true,
    provider: 'webdav',
    url: preset.url,
    filename: preset.filename,
  };
}
