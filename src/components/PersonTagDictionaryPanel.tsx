import { useEffect, useState } from 'react';
import { UserRound, Plus, X } from 'lucide-react';
import { parsePersonTagInput } from '@/lib/relation-person-tags';
import type { PersonTagConfig } from '@/types/life-town';
import {
  loadPersonTagConfig,
  savePersonTagConfig,
  EMPTY_PERSON_TAG_CONFIG,
} from '@/lib/person-tag-config-store';

export function PersonTagDictionaryPanel() {
  const [config, setConfig] = useState<PersonTagConfig>(EMPTY_PERSON_TAG_CONFIG);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadPersonTagConfig().then(c => {
      setConfig(c);
      setReady(true);
    });
  }, []);

  const persist = async (next: PersonTagConfig) => {
    setConfig(next);
    await savePersonTagConfig(next);
  };

  const addCustom = () => {
    const tags = parsePersonTagInput(input);
    if (tags.length === 0) return;
    const merged = [...new Set([...config.customTags, ...tags])];
    void persist({ ...config, customTags: merged });
    setInput('');
    setMsg(`已添加 ${tags.join('、')}`);
    setTimeout(() => setMsg(''), 2000);
  };

  const removeCustom = (tag: string) => {
    void persist({
      ...config,
      customTags: config.customTags.filter(t => t !== tag),
    });
  };

  if (!ready) {
    return (
      <div className="vault-card text-xs vault-muted">加载人物词库…</div>
    );
  }

  return (
    <div className="vault-card">
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--vault-text)' }}>
        <UserRound className="w-4 h-4" /> 人物标签词库
      </h2>
      <p className="text-xs vault-muted mb-3">
        自定义「谁是人物」：常联系的昵称会出现在关系图谱的人物节点中。
      </p>
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="如：阿杰、老王（逗号分隔）"
          className="flex-1 rounded-lg px-3 py-2 text-xs border outline-none"
          style={{ borderColor: 'var(--vault-border)', background: 'var(--vault-bg)', color: 'var(--vault-text)' }}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
        />
        <button
          type="button"
          onClick={addCustom}
          className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1"
          style={{ background: 'var(--vault-primary)', color: '#fff' }}
        >
          <Plus className="w-3.5 h-3.5" /> 添加
        </button>
      </div>
      {config.customTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {config.customTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
              style={{ background: 'rgba(74, 144, 226, 0.12)', color: 'var(--vault-text)' }}
            >
              {tag}
              <button type="button" onClick={() => removeCustom(tag)} aria-label={`移除 ${tag}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] vault-muted mb-3">尚未添加自定义人物标签</p>
      )}
      <p className="text-[10px] vault-muted">
        内置识别：同事、朋友、妈妈、老X、X哥/姐 等。
      </p>
      {msg && <p className="text-[10px] mt-2" style={{ color: 'var(--vault-primary)' }}>{msg}</p>}
    </div>
  );
}
