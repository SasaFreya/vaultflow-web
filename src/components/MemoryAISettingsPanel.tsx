import { useVaultData } from '@/hooks/useVaultData';
import type { AISettings } from '@/types';

export function MemoryAISettingsPanel() {
  const { settings, updateSettings } = useVaultData();
  const ai: AISettings = settings.ai ?? {};

  const save = (patch: Partial<AISettings>) => {
    updateSettings(s => ({
      ...s,
      ai: { ...s.ai, ...patch },
    }));
  };

  const inputStyle = {
    backgroundColor: 'var(--vault-input-bg)',
    borderColor: 'var(--vault-border)',
    color: 'var(--vault-text)',
  };

  return (
    <div className="vault-card space-y-3">
      <div>
        <h2 className="text-sm font-semibold vault-heading">回忆 AI（百炼 / DashScope）</h2>
        <p className="text-xs mt-1 vault-muted">
          用于「拍下今天」自动生成回忆文字。使用 OpenAI 兼容接口，Key 仅存本地。
        </p>
      </div>

      <div>
        <label className="text-xs block mb-1 vault-muted">API Key</label>
        <input
          type="password"
          value={ai.dashscopeApiKey ?? ''}
          onChange={e => save({ dashscopeApiKey: e.target.value })}
          className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
          style={inputStyle}
          placeholder="sk-..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs block mb-1 vault-muted">文本模型</label>
          <input
            value={ai.memoryModel ?? 'qwen-turbo'}
            onChange={e => save({ memoryModel: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-xs block mb-1 vault-muted">视觉模型（带图）</label>
          <input
            value={ai.visionModel ?? 'qwen-vl-plus'}
            onChange={e => save({ visionModel: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
            style={inputStyle}
          />
        </div>
      </div>

      <p className="text-[10px] vault-muted">
        未配置 Key 时，将使用百度 OCR（若已配置）+ 本地模板生成简短回忆。
      </p>
    </div>
  );
}
