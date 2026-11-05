import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ShopCategory } from '@/types/town';
import { SHOP_ITEMS } from '@/lib/town-data';
import { useTown } from '@/hooks/useTown';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import { TownPageShell } from '@/components/town/TownNav';

const CATEGORIES: { id: ShopCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: '全部', emoji: '🏪' },
  { id: 'furniture', label: '家具', emoji: '🛋️' },
  { id: 'decor', label: '装饰', emoji: '🖼️' },
  { id: 'vehicle', label: '交通', emoji: '🚗' },
  { id: 'room', label: '扩建', emoji: '🏠' },
];

export default function ShopPage() {
  const { purchaseItem, data } = useTown();
  const { data: rpg, levelInfo } = useLifeRPG();
  const [category, setCategory] = useState<ShopCategory | 'all'>('all');
  const [flash, setFlash] = useState<string | null>(null);

  const items = SHOP_ITEMS.filter(i => category === 'all' || i.category === category);

  const handleBuy = (itemId: string) => {
    const result = purchaseItem(itemId);
    setFlash(result.message);
    setTimeout(() => setFlash(null), 2500);
  };

  const ownsVehicle = (itemId: string) => data.vehicles.some(v => v.itemId === itemId);

  return (
    <TownPageShell>
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-medium text-sm shadow-xl"
            style={{ backgroundColor: 'var(--rpg-primary)', color: '#fff' }}
          >
            {flash}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: category === c.id ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
              color: category === c.id ? '#fff' : 'var(--rpg-text)',
              border: '1px solid var(--rpg-border)',
            }}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(item => {
          const locked = item.unlockRequirement && levelInfo.level < item.unlockRequirement.level;
          const noGold = rpg.gold < item.price;
          const owned = item.category === 'vehicle' && ownsVehicle(item.id);
          const disabled = locked || noGold || owned;

          return (
            <div
              key={item.id}
              className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
            >
              <div
                className="w-full aspect-square rounded-xl flex items-center justify-center text-4xl"
                style={{ backgroundColor: item.color + '33' }}
              >
                {item.emoji}
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>{item.name}</p>
              <p className="text-[10px] flex-1" style={{ color: 'var(--rpg-text-secondary)' }}>{item.description}</p>
              {item.comfort > 0 && (
                <p className="text-[10px]" style={{ color: 'var(--rpg-accent)' }}>舒适 +{item.comfort}</p>
              )}
              <div className="flex items-center justify-between mt-auto">
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--rpg-gold, #F5A623)' }}>
                  🪙 {item.price}
                </span>
                <button
                  type="button"
                  disabled={!!disabled}
                  onClick={() => handleBuy(item.id)}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: owned ? 'var(--rpg-border)' : 'var(--rpg-primary)' }}
                >
                  {owned ? '已拥有' : locked ? `Lv.${item.unlockRequirement!.level}` : noGold ? '金币不足' : '购买'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </TownPageShell>
  );
}
