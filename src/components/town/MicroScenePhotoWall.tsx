import { useEffect, useState } from 'react';
import type { LifeMemory } from '@/types/life-town';
import { loadMemoryPhotoThumbs } from '@/lib/memory-photo-store';

interface MicroScenePhotoWallProps {
  memories: LifeMemory[];
}

/** 框内回忆照片墙 — IndexedDB 缩略图时间线 */
export default function MicroScenePhotoWall({ memories }: MicroScenePhotoWallProps) {
  const [thumbs, setThumbs] = useState<Array<{ memoryId: string; dataUrl: string; date: string }>>([]);

  useEffect(() => {
    const withPhoto = memories.filter(m => m.imageUrl || m.source === 'photo').slice(0, 12);
    if (withPhoto.length === 0) {
      setThumbs([]);
      return;
    }
    void loadMemoryPhotoThumbs(withPhoto.map(m => m.id)).then(loaded => {
      const map = new Map(loaded.map(t => [t.memoryId, t.dataUrl]));
      setThumbs(
        withPhoto
          .map(m => ({
            memoryId: m.id,
            dataUrl: map.get(m.id) ?? m.imageUrl ?? '',
            date: m.date,
          }))
          .filter(t => t.dataUrl),
      );
    });
  }, [memories]);

  if (thumbs.length === 0) return null;

  return (
    <div className="micro-scene-photo-wall" aria-label="回忆照片墙">
      <p className="micro-scene-photo-wall-title">📷 照片墙</p>
      <div className="micro-scene-photo-wall-track">
        {thumbs.map(t => (
          <figure key={t.memoryId} className="micro-scene-photo-wall-item">
            <img src={t.dataUrl} alt="" loading="lazy" />
            <figcaption>{t.date}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
