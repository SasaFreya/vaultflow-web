import { Link } from 'react-router-dom';
import { getShopItem } from '@/lib/town-data';
import { useTown } from '@/hooks/useTown';
import { TownPageShell } from '@/components/town/TownNav';

export default function InventoryPage() {
  const { data } = useTown();

  const furniture = data.inventory.filter(i => {
    const item = getShopItem(i.itemId);
    return item && (item.category === 'furniture' || item.category === 'decor');
  });

  return (
    <TownPageShell>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>🛋️ 家具 & 装饰</h2>
          {furniture.length === 0 && (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--rpg-text-secondary)' }}>背包空空，去商店逛逛</p>
          )}
          <ul className="space-y-2">
            {furniture.map(entry => {
              const item = getShopItem(entry.itemId)!;
              return (
                <li
                  key={entry.instanceId}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--rpg-bg)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.emoji}</span>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--rpg-text)' }}>{item.name}</p>
                      <p className="text-[9px]" style={{ color: 'var(--rpg-text-secondary)' }}>
                        {entry.isPlaced ? `已放置 · ${entry.placedIn}` : '未使用'}
                      </p>
                    </div>
                  </div>
                  {!entry.isPlaced && (
                    <Link
                      to="/town/home"
                      className="text-[10px] px-2 py-1 rounded-lg text-white"
                      style={{ backgroundColor: 'var(--rpg-primary)' }}
                    >
                      去布置
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>🚗 交通工具</h2>
          {data.vehicles.length === 0 && (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--rpg-text-secondary)' }}>还没有交通工具</p>
          )}
          <ul className="space-y-2">
            {data.vehicles.map(v => (
              <li
                key={v.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--rpg-bg)' }}
              >
                <span className="text-2xl">{v.emoji}</span>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--rpg-text)' }}>{v.name}</p>
                  <p className="text-[9px]" style={{ color: 'var(--rpg-text-secondary)' }}>
                    {v.isParked ? `停在${v.parkLocation === 'garage' ? '车库' : '院子'}` : '使用中'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/town" className="block text-center text-xs py-2" style={{ color: 'var(--rpg-primary)' }}>
            在地图查看停车位置 →
          </Link>
        </section>
      </div>
    </TownPageShell>
  );
}
