import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  TrendingUp,
  BarChart3,
  CreditCard,
  Receipt,
  PiggyBank,
  Settings,
  Menu,
  X,
  Wallet,
  Lock,
  Eye,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { MaskedCurrency } from '@/components/MaskedCurrency';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { isElectron, getDataDirectory } from '@/lib/persistence';

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

const mainNav: NavItem[] = [
  { path: '/', label: '资产大盘', icon: LayoutDashboard },
  { path: '/calendar', label: '现金流日历', icon: CalendarDays },
  { path: '/goals', label: '心愿目标', icon: Target },
  { path: '/trends', label: '资产趋势', icon: TrendingUp },
  { path: '/analysis', label: '分析', icon: BarChart3 },
  { path: '/accounts', label: '账户', icon: CreditCard },
];

const auxNav: NavItem[] = [
  { path: '/transactions', label: '记账', icon: Receipt },
  { path: '/budget', label: '预算', icon: PiggyBank },
];

const bottomNav: NavItem[] = [
  { path: '/settings', label: '设置', icon: Settings },
];

const pathLabels: Record<string, string> = {
  '/': '资产大盘',
  '/town': '人生小镇',
  '/town/explore': '外出地图',
  '/town/loft': '温馨小屋',
  '/calendar': '现金流日历',
  '/goals': '心愿目标',
  '/trends': '资产趋势',
  '/analysis': '分析',
  '/accounts': '账户',
  '/transactions': '记账',
  '/budget': '预算',
  '/settings': '设置',
};

function NavLink({
  item,
  isActive,
  compact,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  compact?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 rounded-lg font-medium transition-all duration-200 ${
        compact ? 'py-2 text-xs' : 'py-2.5 text-sm'
      }`}
      style={{
        backgroundColor: isActive ? 'var(--vault-nav-active-bg)' : 'transparent',
        color: isActive ? 'var(--vault-text)' : 'var(--vault-text-secondary)',
        borderLeft: isActive ? '2px solid var(--vault-primary)' : '2px solid transparent',
      }}
    >
      <item.icon className={`flex-shrink-0 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      {item.label}
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataDir, setDataDir] = useState<string | null>(null);
  const location = useLocation();
  const { totals, data, settings, lock, storageError } = useVaultData();
  const { toggleReveal, revealed } = usePrivacyMode();
  const isEmpty = data.accounts.length === 0;
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    if (isElectron()) {
      getDataDirectory().then(setDataDir);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleReveal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleReveal]);

  const currentLabel = pathLabels[location.pathname] ?? '资产大盘';

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '.');


  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--vault-bg)' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={closeSidebar} />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 flex flex-col border-r transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--vault-bg)', borderColor: 'var(--vault-border)' }}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: 'var(--vault-border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--vault-primary)' }}>
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--vault-text)' }}>VaultFlow</h1>
            <p className="text-[10px]" style={{ color: 'var(--vault-text-secondary)' }}>资产可视化 · 心愿追踪</p>
          </div>
          <button className="ml-auto md:hidden" onClick={closeSidebar}>
            <X className="w-5 h-5" style={{ color: 'var(--vault-text-secondary)' }} />
          </button>
        </div>

        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--vault-border)' }}>
          <p className="text-xs" style={{ color: 'var(--vault-text-secondary)' }}>{today}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--vault-text-secondary)' }}>净资产</p>
          <p className="text-lg font-bold font-mono tabular-nums">
            {isEmpty ? '--' : (
              <MaskedCurrency value={totals.netWorth} currency={settings.baseCurrency} className="text-gradient" />
            )}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          <div className="space-y-0.5">
            {mainNav.map(item => (
              <NavLink
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
                onNavigate={closeSidebar}
              />
            ))}
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--vault-border)' }}>
            <p
              className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--vault-text-secondary)', opacity: 0.55 }}
            >
              辅助功能
            </p>
            <div className="space-y-0.5">
              {auxNav.map(item => (
                <NavLink
                  key={item.path}
                  item={item}
                  isActive={location.pathname === item.path}
                  compact
                  onNavigate={closeSidebar}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--vault-border)' }}>
            {bottomNav.map(item => (
              <NavLink
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
                onNavigate={closeSidebar}
              />
            ))}
          </div>
        </nav>

        <div className="px-5 py-3 border-t text-xs" style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
          <p>{isElectron() ? '数据存储在本地文件' : '数据存储在本地浏览器'}</p>
          {dataDir && <p className="truncate mt-0.5" title={dataDir}>{dataDir}</p>}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 h-14 flex items-center px-4 md:px-6 border-b"
          style={{
            backgroundColor: 'var(--vault-header-bg)',
            backdropFilter: 'blur(12px)',
            borderColor: 'var(--vault-border)',
          }}
        >
          <button className="md:hidden mr-4" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" style={{ color: 'var(--vault-text-secondary)' }} />
          </button>

          <div className="flex-1 flex items-center justify-between">
            <p className="text-xs hidden sm:block vault-muted">{currentLabel}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleReveal}
                title={revealed ? '隐藏金额 (Cmd+B)' : '显示金额 (Cmd+B)'}
                className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--vault-surface)', border: '1px solid var(--vault-border)' }}
              >
                {revealed ? (
                  <EyeOff className="w-3.5 h-3.5" style={{ color: 'var(--vault-text-secondary)' }} />
                ) : (
                  <Eye className="w-3.5 h-3.5" style={{ color: 'var(--vault-text-secondary)' }} />
                )}
              </button>
              <ThemeSwitcher compact />
              {settings.lockEnabled && (
                <button
                  type="button"
                  onClick={lock}
                  title="锁定应用"
                  className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--vault-surface)', border: '1px solid var(--vault-border)' }}
                >
                  <Lock className="w-3.5 h-3.5" style={{ color: 'var(--vault-text-secondary)' }} />
                </button>
              )}
              <div className="hidden sm:block text-right">
                <p className="text-xs vault-muted">净资产</p>
                {isEmpty ? (
                  <p className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--vault-accent)' }}>--</p>
                ) : (
                  <MaskedCurrency
                    value={totals.netWorth}
                    currency={settings.baseCurrency}
                    className="text-sm font-bold font-mono tabular-nums"
                    style={{ color: 'var(--vault-accent)' }}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto">{storageError && <p role="alert" className="vault-card text-sm mb-4" style={{ color: 'var(--vault-red)' }}>{storageError}</p>}{children}</div>
        </div>
      </main>
    </div>
  );
}
