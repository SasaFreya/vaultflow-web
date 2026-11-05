import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { RoomId } from '@/types/town';
import { GRID_SIZE, getShopItem } from '@/lib/town-data';
import { roomComfort } from '@/lib/town-utils';
import { useTown } from '@/hooks/useTown';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { TownPageShell } from '@/components/town/TownNav';
import RPGProgressBar from '@/components/rpg/RPGProgressBar';

export default function HomeEditor() {
  const { data, comfort, placeFurniture, removeFurniture, rotateFurniture, unlockRoom, getUnplacedInventory } = useTown();
  const { levelInfo } = useLifeRPG();
  const [activeRoom, setActiveRoom] = useState<RoomId>('livingRoom');
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const room = data.rooms.find(r => r.id === activeRoom)!;
  const unplaced = getUnplacedInventory();
  const rc = roomComfort(room);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleDrop = useCallback(
    (x: number, y: number) => {
      if (!dragItem) return;
      const ok = placeFurniture(dragItem, activeRoom, x, y);
      showToast(ok ? '放置成功！' : '这里放不下～');
      setDragItem(null);
    },
    [dragItem, activeRoom, placeFurniture],
  );

  return (
    <TownPageShell>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg"
          style={{ backgroundColor: 'var(--rpg-primary)', color: '#fff' }}
        >
          {toast}
        </motion.div>
      )}

      {/* Room tabs */}
      <div className="flex gap-1 flex-wrap">
        {data.rooms.map(r => (
          <button
            key={r.id}
            type="button"
            disabled={!r.unlocked}
            onClick={() => r.unlocked && setActiveRoom(r.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{
              backgroundColor: activeRoom === r.id ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
              color: activeRoom === r.id ? '#fff' : 'var(--rpg-text)',
              border: '1px solid var(--rpg-border)',
            }}
          >
            {r.name}
            {!r.unlocked && ' 🔒'}
          </button>
        ))}
      </div>

      {!room.unlocked && room.unlockRequirement && (
        <div className="p-4 rounded-xl text-center space-y-2" style={{ backgroundColor: 'var(--rpg-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--rpg-text)' }}>
            需要 Lv.{room.unlockRequirement.level} + {room.unlockRequirement.gold} 🪙
          </p>
          <button
            type="button"
            onClick={() => unlockRoom(room.id) && showToast('房间已解锁！')}
            disabled={levelInfo.level < room.unlockRequirement.level}
            className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--rpg-primary)' }}
          >
            解锁 {room.name}
          </button>
        </div>
      )}

      {room.unlocked && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Backpack */}
          <div
            className="lg:col-span-3 rounded-2xl p-4 space-y-2 max-h-[480px] overflow-y-auto"
            style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>🎒 背包</p>
            {unplaced.length === 0 && (
              <p className="text-[10px] py-4 text-center" style={{ color: 'var(--rpg-text-secondary)' }}>
                去商店买点家具吧
              </p>
            )}
            {unplaced.map(entry => {
              const item = getShopItem(entry.itemId);
              if (!item) return null;
              return (
                <div
                  key={entry.instanceId}
                  draggable
                  onDragStart={() => setDragItem(entry.instanceId)}
                  onDragEnd={() => setDragItem(null)}
                  className="flex items-center gap-2 p-2 rounded-xl cursor-grab active:cursor-grabbing"
                  style={{ backgroundColor: 'var(--rpg-bg)', border: '1px dashed var(--rpg-border)' }}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--rpg-text)' }}>{item.name}</p>
                    <p className="text-[9px]" style={{ color: 'var(--rpg-text-secondary)' }}>舒适 +{item.comfort}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room grid */}
          <div className="lg:col-span-9 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--rpg-text)' }}>{room.name} · 舒适 {rc}</span>
              <span style={{ color: 'var(--rpg-text-secondary)' }}>
                总舒适 {comfort.total} · {comfort.label} (+{Math.round(comfort.bonus * 100)}% EXP)
              </span>
            </div>
            <RPGProgressBar label="房间舒适度" value={rc} max={50} color="var(--rpg-primary)" />

            <div
              className="relative overflow-auto rounded-2xl border-2"
              style={{
                backgroundColor: room.wallColor,
                borderColor: 'var(--rpg-border)',
                maxWidth: '100%',
              }}
            >
              <div
                className="relative"
                style={{
                  width: room.size.width * GRID_SIZE,
                  height: room.size.height * GRID_SIZE,
                  backgroundImage: room.floorType === 'grass'
                    ? 'repeating-linear-gradient(45deg, #A5D6A7 0, #A5D6A7 8px, #81C784 8px, #81C784 16px)'
                    : 'repeating-linear-gradient(0deg, transparent, transparent 43px, rgba(0,0,0,0.04) 43px, rgba(0,0,0,0.04) 44px), repeating-linear-gradient(90deg, transparent, transparent 43px, rgba(0,0,0,0.04) 43px, rgba(0,0,0,0.04) 44px)',
                  backgroundColor: room.floorType === 'carpet' ? '#E8D5E0' : room.floorType === 'grass' ? undefined : '#F5E6D3',
                }}
              >
                {/* Grid drop cells */}
                {Array.from({ length: room.size.width * room.size.height }).map((_, i) => {
                  const x = i % room.size.width;
                  const y = Math.floor(i / room.size.width);
                  return (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: x * GRID_SIZE,
                        top: y * GRID_SIZE,
                        width: GRID_SIZE,
                        height: GRID_SIZE,
                      }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        handleDrop(x, y);
                      }}
                    />
                  );
                })}

                {/* Placed furniture */}
                {room.furniture.map(furn => {
                  const item = getShopItem(furn.itemId);
                  if (!item) return null;
                  const w = furn.rotation === 90 || furn.rotation === 270 ? item.size.height : item.size.width;
                  const h = furn.rotation === 90 || furn.rotation === 270 ? item.size.width : item.size.height;
                  return (
                    <motion.div
                      key={furn.instanceId}
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute flex flex-col items-center justify-center cursor-pointer rounded-lg shadow-md"
                      style={{
                        left: furn.position.x * GRID_SIZE,
                        top: furn.position.y * GRID_SIZE,
                        width: w * GRID_SIZE - 4,
                        height: h * GRID_SIZE - 4,
                        backgroundColor: item.color,
                        transform: `rotate(${furn.rotation}deg)`,
                        border: '2px solid rgba(255,255,255,0.6)',
                      }}
                      onClick={() => rotateFurniture(activeRoom, furn.instanceId)}
                      onContextMenu={e => {
                        e.preventDefault();
                        removeFurniture(activeRoom, furn.instanceId);
                        showToast('已收回背包');
                      }}
                      title="点击旋转 · 右键收回"
                    >
                      <span className="text-2xl" style={{ transform: `rotate(-${furn.rotation}deg)` }}>{item.emoji}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
              从背包拖拽家具到网格 · 点击旋转 · 右键收回背包
            </p>

            {/* Yard vehicles */}
            {activeRoom === 'yard' && data.vehicles.filter(v => v.isParked).map(v => (
              <div
                key={v.id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl mr-2"
                style={{ backgroundColor: 'var(--rpg-bg)', border: '1px solid var(--rpg-border)' }}
              >
                <span className="text-2xl">{v.emoji}</span>
                <span className="text-xs" style={{ color: 'var(--rpg-text)' }}>{v.name} 停在院子</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </TownPageShell>
  );
}
