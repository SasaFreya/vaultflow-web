import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, ShoppingBag, Backpack, BookHeart, BarChart3, Map, Settings } from 'lucide-react';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import RPGThemeSwitcher from '@/components/rpg/RPGThemeSwitcher';

const TOWN_LINKS = [
  { to: '/town', label: '小镇', icon: Map, exact: true },
  { to: '/town/explore', label: '外出', icon: Map },
  { to: '/town/memories', label: '回忆', icon: BookHeart },
  { to: '/town/memories/report', label: '报告', icon: BarChart3 },
  { to: '/town/home', label: '小窝', icon: Home },
  { to: '/town/shop', label: '商店', icon: ShoppingBag },
  { to: '/town/inventory', label: '背包', icon: Backpack },
] as const;

interface TownHudProps {
  minimal?: boolean;
  locationName?: string;
}

function TownHud({ minimal = false, locationName = '人生小镇' }: TownHudProps) {
  const { data } = useLifeRPG();
  const location = useLocation();

  if (minimal) {
    return (
      <header className="town-hud shrink-0">
        <div className="town-hud-inner">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="town-hud-pill town-hud-pill--ghost">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">返回</span>
            </Link>
            <h1 className="town-hud-title truncate">{locationName}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="town-hud-gold">🪙 {data.gold}</span>
            <Link to="/settings" className="town-hud-pill town-hud-pill--ghost" aria-label="设置">
              <Settings className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="town-hud shrink-0">
      <div className="town-hud-inner">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/town/loft" className="town-hud-pill town-hud-pill--ghost">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RPG</span>
          </Link>
          <h1 className="town-hud-title truncate">🌸 {locationName}</h1>
        </div>

        <nav className="town-hud-nav hidden md:flex">
          {TOWN_LINKS.map(item => {
            const active =
              'exact' in item && item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`town-hud-pill ${active ? 'town-hud-pill--active' : ''}`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <span className="town-hud-gold">🪙 {data.gold}</span>
          <RPGThemeSwitcher />
        </div>
      </div>

      <nav className="town-hud-nav-mobile md:hidden">
        {TOWN_LINKS.map(item => {
          const active =
            'exact' in item && item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`town-hud-pill town-hud-pill--compact ${active ? 'town-hud-pill--active' : ''}`}
            >
              <item.icon className="w-3.5 h-3.5" />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

interface TownPageShellProps {
  children: React.ReactNode;
  /** 地图等全屏画布：无内边距、不滚动 */
  fullBleed?: boolean;
  /** 首页小镇：精简顶栏（返回+位置+货币+设置） */
  minimalHud?: boolean;
  locationName?: string;
}

export function TownPageShell({
  children,
  fullBleed = false,
  minimalHud = false,
  locationName,
}: TownPageShellProps) {
  const { data } = useLifeRPG();

  return (
    <div className="rpg-root town-root town-immersive h-full flex flex-col" data-rpg-theme={data.theme} data-aobi-season="summer">
      <TownHud minimal={minimalHud} locationName={locationName} />
      <div
        className={`town-immersive-body flex-1 min-h-0 ${
          fullBleed ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {fullBleed ? children : <div className="town-immersive-scroll">{children}</div>}
      </div>
    </div>
  );
}

export default TownHud;
