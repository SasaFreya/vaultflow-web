import { useState } from 'react';
import { useVaultData } from '@/hooks/useVaultData';
import type { OCRProvider } from '@/types';

const inputStyle = {
  backgroundColor: 'var(--vault-input-bg)',
  borderColor: 'var(--vault-border)',
  color: 'var(--vault-text)',
};

export function OCRSettingsPanel() {
  const { settings, updateSettings } = useVaultData();
  const ocr = settings.ocr ?? { provider: null };
  const [provider, setProvider] = useState<OCRProvider>(ocr.provider ?? null);

  const save = (patch: Partial<typeof ocr>) => {
    updateSettings(prev => ({
      ...prev,
      ocr: { ...prev.ocr, provider: prev.ocr?.provider ?? null, ...patch },
    }));
  };

  return (
    <div className="vault-card">
      <h2 className="text-sm font-semibold vault-heading mb-1">截图 OCR 识别</h2>
      <p className="text-xs vault-muted mb-4">配置 API 密钥后，可在记账页上传账单截图自动识别。桌面版体验更佳。</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs block mb-1 vault-muted">服务商</label>
          <select
            value={provider ?? ''}
            onChange={e => {
              const p = (e.target.value || null) as OCRProvider;
              setProvider(p);
              save({ provider: p });
            }}
            className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
            style={inputStyle}
          >
            <option value="">未启用</option>
            <option value="baidu">百度 OCR</option>
            <option value="tencent">腾讯云 OCR（即将支持）</option>
            <option value="aliyun">阿里云 OCR（即将支持）</option>
          </select>
        </div>

        {provider === 'baidu' && (
          <>
            <div>
              <label className="text-xs block mb-1 vault-muted">API Key</label>
              <input
                type="password"
                value={ocr.baiduApiKey ?? ''}
                onChange={e => save({ baiduApiKey: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
                style={inputStyle}
                placeholder="百度智能云 API Key"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 vault-muted">Secret Key</label>
              <input
                type="password"
                value={ocr.baiduSecretKey ?? ''}
                onChange={e => save({ baiduSecretKey: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
                style={inputStyle}
                placeholder="百度智能云 Secret Key"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
