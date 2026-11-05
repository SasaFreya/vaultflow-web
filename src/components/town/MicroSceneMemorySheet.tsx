import { useState, useEffect } from 'react';
import { Camera, PenLine, X } from 'lucide-react';
import type { BuildingType, MemoryMood } from '@/types/life-town';
import { useLifeMemories } from '@/hooks/useLifeMemories';
import { useVaultData } from '@/hooks/useVaultData';
import { generateMemoryDraft } from '@/lib/memory-ai';
import { suggestLinkedTransactionId } from '@/lib/life-town-link';
import { extractGeoFromDataUrl } from '@/lib/photo-geo';
import { saveMemoryPhoto } from '@/lib/memory-photo-store';

const MOODS: MemoryMood[] = ['happy', 'calm', 'excited', 'tired', 'neutral'];

interface MicroSceneMemorySheetProps {
  buildingType: BuildingType;
  placeName: string;
  initialContent?: string;
  initialMood?: MemoryMood;
  initialTags?: string[];
  initialPhotoFile?: File | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

/** 地图内写回忆 — 不跳转 Loft */
export default function MicroSceneMemorySheet({
  buildingType,
  placeName,
  initialContent = '',
  initialMood = 'neutral',
  initialTags = [],
  initialPhotoFile = null,
  onClose,
  onSaved,
}: MicroSceneMemorySheetProps) {
  const { activeCityId, addMemory } = useLifeMemories();
  const { data: vaultData, settings } = useVaultData();
  const [content, setContent] = useState(initialContent);
  const [mood, setMood] = useState<MemoryMood>(initialMood);
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '));
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handlePhoto = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result);
      setImagePreview(base64);
      setBusy(true);
      setError('');
      void generateMemoryDraft(
        { cityId: activeCityId, buildingType, imageBase64: base64 },
        settings.ai,
        settings.ocr,
      )
        .then(draft => {
          setContent(draft.content);
          setMood(draft.mood);
          setTagsInput(draft.tags.join(', '));
        })
        .catch(e => setError(e instanceof Error ? e.message : 'AI 生成失败'))
        .finally(() => setBusy(false));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (initialPhotoFile) handlePhoto(initialPhotoFile);
  }, [initialPhotoFile]);

  const handleSave = async () => {
    if (!content.trim()) {
      setError('写点什么吧');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const date = new Date().toISOString().slice(0, 10);
      const tags = tagsInput.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean);
      let geo;
      if (imagePreview) {
        geo = await extractGeoFromDataUrl(imagePreview);
      }
      const linkedTransactionId = suggestLinkedTransactionId(
        vaultData.transactions,
        date,
        buildingType,
      );
      const mem = addMemory({
        cityId: activeCityId,
        buildingType,
        content: content.trim(),
        date,
        mood,
        tags,
        source: imagePreview ? 'photo' : 'manual',
        imageUrl: imagePreview ?? undefined,
        linkedTransactionId: linkedTransactionId ?? undefined,
        geo: geo ? { ...geo, source: 'exif', label: '照片定位' } : undefined,
      });
      if (imagePreview) {
        await saveMemoryPhoto(mem.id, imagePreview);
      }
      onSaved('回忆已记录在本页');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="micro-scene-memory-sheet" role="dialog" aria-label="写回忆">
      <header className="micro-scene-memory-sheet-header">
        <span className="micro-scene-memory-sheet-title">
          <PenLine className="w-3.5 h-3.5" /> {placeName} · 写回忆
        </span>
        <button type="button" onClick={onClose} aria-label="关闭">
          <X className="w-4 h-4" />
        </button>
      </header>
      {imagePreview && (
        <img src={imagePreview} alt="今日照片" className="micro-scene-memory-photo" />
      )}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={4}
        placeholder={`今天在${placeName}…`}
        className="micro-scene-memory-textarea"
      />
      <div className="micro-scene-memory-moods">
        {MOODS.map(m => (
          <button
            key={m}
            type="button"
            className={`micro-scene-memory-mood ${mood === m ? 'micro-scene-memory-mood--active' : ''}`}
            onClick={() => setMood(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <input
        value={tagsInput}
        onChange={e => setTagsInput(e.target.value)}
        placeholder="标签，逗号分隔"
        className="micro-scene-memory-tags"
      />
      {error && <p className="micro-scene-memory-error">{error}</p>}
      <div className="micro-scene-memory-actions">
        <label className="micro-scene-memory-photo-btn">
          <Camera className="w-3.5 h-3.5" />
          拍下今天
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              handlePhoto(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </label>
        <button
          type="button"
          className="micro-scene-memory-save"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          {busy ? '保存中…' : '记录'}
        </button>
      </div>
      <p className="micro-scene-memory-hint">
        照片存为回忆附图 · AI 根据画面生成文字（需设置 API Key）
      </p>
    </div>
  );
}
