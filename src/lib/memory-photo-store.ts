const DB_NAME = 'vaultflow_memory_photos';
const STORE = 'photos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function compressDataUrl(dataUrl: string, maxW = 960): Promise<string> {
  if (!dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

export async function saveMemoryPhoto(memoryId: string, dataUrl: string): Promise<string> {
  const compressed = await compressDataUrl(dataUrl);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(compressed, memoryId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return compressed;
}

export async function loadMemoryPhoto(memoryId: string): Promise<string | null> {
  const db = await openDb();
  const result = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(memoryId);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export interface MemoryPhotoThumb {
  memoryId: string;
  dataUrl: string;
}

/** 按回忆 ID 批量加载 IndexedDB 缩略图 */
export async function loadMemoryPhotoThumbs(memoryIds: string[]): Promise<MemoryPhotoThumb[]> {
  const db = await openDb();
  const thumbs: MemoryPhotoThumb[] = [];
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    for (const id of memoryIds.slice(0, 24)) {
      const req = store.get(id);
      req.onsuccess = () => {
        const data = req.result as string | undefined;
        if (data) thumbs.push({ memoryId: id, dataUrl: data });
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return thumbs;
}
