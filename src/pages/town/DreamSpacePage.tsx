import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { TownPageShell } from '@/components/town/TownNav';
import {
  DREAM_FURNITURE_CATALOG,
  DREAM_GRID_SIZE,
  DREAM_TEMPLATES,
  getDreamTemplate,
} from '@/lib/dream-space-templates';
import {
  createDreamSpace,
  loadDreamSpaces,
  saveDreamSpaces,
} from '@/lib/dream-space-storage';
import type { DreamPlacedFurniture, DreamSpaceRecord, DreamTemplateId } from '@/types/dream-space';
import '@/styles/dream-space.css';

function canPlace(
  furniture: DreamPlacedFurniture[],
  itemId: string,
  x: number,
  y: number,
  rotation: 0 | 90 | 180 | 270,
  gridW: number,
  gridH: number,
  excludeId?: string,
): boolean {
  const item = DREAM_FURNITURE_CATALOG[itemId];
  if (!item) return false;
  const w = rotation === 90 || rotation === 270 ? item.height : item.width;
  const h = rotation === 90 || rotation === 270 ? item.width : item.height;
  if (x < 0 || y < 0 || x + w > gridW || y + h > gridH) return false;
  for (const f of furniture) {
    if (f.instanceId === excludeId) continue;
    const fi = DREAM_FURNITURE_CATALOG[f.itemId];
    if (!fi) continue;
    const fw = f.rotation === 90 || f.rotation === 270 ? fi.height : fi.width;
    const fh = f.rotation === 90 || f.rotation === 270 ? fi.width : fi.height;
    const overlap =
      x < f.x + fw && x + w > f.x && y < f.y + fh && y + h > f.y;
    if (overlap) return false;
  }
  return true;
}

export default function DreamSpacePage() {
  const [data, setData] = useState(() => loadDreamSpaces());
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const active = useMemo(
    () => data.spaces.find(s => s.id === data.activeId) ?? data.spaces[0] ?? null,
    [data],
  );

  const template = active ? getDreamTemplate(active.templateId) : null;

  const persist = useCallback((next: typeof data) => {
    setData(next);
    saveDreamSpaces(next);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const selectSpace = (id: string) => {
    persist({ ...data, activeId: id });
  };

  const handleCreate = (templateId: DreamTemplateId) => {
    const space = createDreamSpace(templateId);
    const next = {
      spaces: [...data.spaces, space],
      activeId: space.id,
    };
    persist(next);
    setShowTemplates(false);
    showToast(`已创建「${space.name}」`);
  };

  const updateActive = (patch: Partial<DreamSpaceRecord>) => {
    if (!active) return;
    const spaces = data.spaces.map(s =>
      s.id === active.id
        ? { ...s, ...patch, updatedAt: new Date().toISOString() }
        : s,
    );
    persist({ ...data, spaces });
  };

  const handleDrop = (x: number, y: number) => {
    if (!dragItem || !active || !template) return;
    const ok = canPlace(
      active.furniture,
      dragItem,
      x,
      y,
      0,
      template.gridWidth,
      template.gridHeight,
    );
    if (!ok) {
      showToast('这里放不下～');
      setDragItem(null);
      return;
    }
    const instanceId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    updateActive({
      furniture: [
        ...active.furniture,
        { instanceId, itemId: dragItem, x, y, rotation: 0 },
      ],
    });
    setDragItem(null);
    showToast('放置成功');
  };

  const rotateFurniture = (instanceId: string) => {
    if (!active || !template) return;
    const furniture = active.furniture.map(f => {
      if (f.instanceId !== instanceId) return f;
      const nextRot = ((f.rotation + 90) % 360) as 0 | 90 | 180 | 270;
      if (
        !canPlace(
          active.furniture,
          f.itemId,
          f.x,
          f.y,
          nextRot,
          template.gridWidth,
          template.gridHeight,
          instanceId,
        )
      ) {
        return f;
      }
      return { ...f, rotation: nextRot };
    });
    updateActive({ furniture });
  };

  const removeFurniture = (instanceId: string) => {
    if (!active) return;
    updateActive({
      furniture: active.furniture.filter(f => f.instanceId !== instanceId),
    });
  };

  const deleteSpace = (id: string) => {
    const spaces = data.spaces.filter(s => s.id !== id);
    const activeId =
      data.activeId === id ? (spaces[0]?.id ?? null) : data.activeId;
    persist({ spaces, activeId });
    showToast('已删除梦想空间');
  };

  return (
    <TownPageShell locationName="梦想馆">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="dream-space-toast"
        >
          {toast}
        </motion.div>
      )}

      <section className="dream-space-hero aobi-card">
        <div className="dream-space-hero-icon">✨</div>
        <div>
          <h2 className="dream-space-hero-title">梦想空间</h2>
          <p className="dream-space-hero-desc">
            像宜家样板间那样，搭一间你向往却还没来得及住进去的房间——电竞房、工作室、缝纫房，或一座平行城市里的阳台。
          </p>
        </div>
      </section>

      <div className="dream-space-layout">
        <aside className="dream-space-sidebar aobi-card">
          <div className="dream-space-sidebar-head">
            <span className="dream-space-sidebar-label">我的平行空间</span>
            <button
              type="button"
              className="btn-aobi-action dream-space-add-btn"
              onClick={() => setShowTemplates(v => !v)}
              aria-label="新建梦想空间"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="dream-space-template-picker"
              >
                <p className="dream-space-picker-hint">选一个样板间开始搭建</p>
                {DREAM_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className="dream-space-template-btn"
                    onClick={() => handleCreate(t.id)}
                  >
                    <span className="text-lg">{t.emoji}</span>
                    <span>
                      <span className="dream-space-template-name">{t.name}</span>
                      <span className="dream-space-template-tag">{t.tagline}</span>
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {data.spaces.length === 0 && !showTemplates && (
            <div className="dream-space-empty">
              <Sparkles className="w-8 h-8 opacity-40" />
              <p>还没有梦想空间</p>
              <button
                type="button"
                className="aobi-btn-primary"
                onClick={() => setShowTemplates(true)}
              >
                从样板间开始
              </button>
            </div>
          )}

          <ul className="dream-space-list">
            {data.spaces.map(s => {
              const t = getDreamTemplate(s.templateId);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`dream-space-list-item${s.id === active?.id ? ' dream-space-list-item--active' : ''}`}
                    onClick={() => selectSpace(s.id)}
                  >
                    <span>{t?.emoji ?? '✨'}</span>
                    <span className="dream-space-list-name">{s.name}</span>
                  </button>
                  <button
                    type="button"
                    className="dream-space-delete-btn"
                    onClick={() => deleteSpace(s.id)}
                    aria-label={`删除 ${s.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {active && template ? (
          <main className="dream-space-main">
            <div className="dream-space-toolbar">
              <input
                className="dream-space-name-input"
                value={active.name}
                onChange={e => updateActive({ name: e.target.value })}
                placeholder="给这个空间起个名字"
              />
              <span className="dream-space-template-badge">
                {template.emoji} {template.name}
              </span>
            </div>

            <div className="dream-space-editor">
              <div className="dream-space-palette aobi-card">
                <p className="dream-space-palette-label">家具栏</p>
                {template.palette.map(itemId => {
                  const item = DREAM_FURNITURE_CATALOG[itemId];
                  if (!item) return null;
                  return (
                    <div
                      key={itemId}
                      draggable
                      onDragStart={() => setDragItem(itemId)}
                      onDragEnd={() => setDragItem(null)}
                      className="dream-space-palette-item"
                    >
                      <span className="text-xl">{item.emoji}</span>
                      <span className="dream-space-palette-name">{item.name}</span>
                    </div>
                  );
                })}
                <p className="dream-space-hint">拖到房间网格 · 点击旋转 · 右键移除</p>
              </div>

              <div
                className="dream-space-room aobi-card"
                style={{ backgroundColor: template.wallColor }}
              >
                <div
                  className="dream-space-grid"
                  style={{
                    width: template.gridWidth * DREAM_GRID_SIZE,
                    height: template.gridHeight * DREAM_GRID_SIZE,
                    backgroundColor: template.floorColor,
                  }}
                >
                  {Array.from({ length: template.gridWidth * template.gridHeight }).map(
                    (_, i) => {
                      const x = i % template.gridWidth;
                      const y = Math.floor(i / template.gridWidth);
                      return (
                        <div
                          key={i}
                          className="dream-space-cell"
                          style={{
                            left: x * DREAM_GRID_SIZE,
                            top: y * DREAM_GRID_SIZE,
                            width: DREAM_GRID_SIZE,
                            height: DREAM_GRID_SIZE,
                          }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            e.preventDefault();
                            handleDrop(x, y);
                          }}
                        />
                      );
                    },
                  )}

                  {active.furniture.map(furn => {
                    const item = DREAM_FURNITURE_CATALOG[furn.itemId];
                    if (!item) return null;
                    const w =
                      furn.rotation === 90 || furn.rotation === 270
                        ? item.height
                        : item.width;
                    const h =
                      furn.rotation === 90 || furn.rotation === 270
                        ? item.width
                        : item.height;
                    return (
                      <motion.div
                        key={furn.instanceId}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="dream-space-furniture"
                        style={{
                          left: furn.x * DREAM_GRID_SIZE,
                          top: furn.y * DREAM_GRID_SIZE,
                          width: w * DREAM_GRID_SIZE - 4,
                          height: h * DREAM_GRID_SIZE - 4,
                          backgroundColor: item.color,
                          transform: `rotate(${furn.rotation}deg)`,
                        }}
                        onClick={() => rotateFurniture(furn.instanceId)}
                        onContextMenu={e => {
                          e.preventDefault();
                          removeFurniture(furn.instanceId);
                        }}
                        title={`${item.name} · 点击旋转`}
                      >
                        <span
                          className="dream-space-furniture-emoji"
                          style={{ transform: `rotate(-${furn.rotation}deg)` }}
                        >
                          {item.emoji}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            <label className="dream-space-note aobi-card">
              <span className="dream-space-note-label">梦想笔记</span>
              <textarea
                className="dream-space-note-input"
                value={active.note}
                onChange={e => updateActive({ note: e.target.value })}
                placeholder="这间屋子对你意味着什么？还没实现的兴趣、想去的城市、或某段想重新开始的时光…"
                rows={3}
              />
            </label>
          </main>
        ) : (
          <main className="dream-space-placeholder aobi-card">
            <p>选一间样板间，开始搭建你的平行现实。</p>
          </main>
        )}
      </div>
    </TownPageShell>
  );
}
