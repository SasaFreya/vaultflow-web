import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { PrivacyProvider } from '@/hooks/usePrivacyMode';
import { VaultDataProvider, useVaultData } from '@/hooks/useVaultData';
import Layout from '@/sections/Layout';
import Dashboard from '@/pages/Dashboard';
import Trends from '@/pages/Trends';
import Budget from '@/pages/Budget';
import CalendarPage from '@/pages/CalendarPage';
import Goals from '@/pages/Goals';
import Transactions from '@/pages/Transactions';
import Accounts from '@/pages/Accounts';
import Analysis from '@/pages/Analysis';
import Settings from '@/pages/Settings';
import LockScreen from '@/components/LockScreen';

function AppRoutes() {
  const { ready, locked, unlock, loadError } = useVaultData();

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--vault-bg)', color: 'var(--vault-text-secondary)' }}
      >
        <p role={loadError ? 'alert' : 'status'} className="text-sm max-w-lg px-6">{loadError || '正在加载 VaultFlow…'}</p>
      </div>
    );
  }

  if (locked) {
    return <LockScreen onUnlock={unlock} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/settings" element={<Settings />} />
        {/* 详情页保留，可从分析页进入 */}
        <Route path="/trends" element={<Trends />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/rpg/*" element={<Navigate to="/" replace />} />
        <Route path="/town/*" element={<Navigate to="/" replace />} />
        <Route path="/settings/accounts" element={<Navigate to="/accounts" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <VaultDataProvider>
          <PrivacyProvider>
            <AppRoutes />
          </PrivacyProvider>
        </VaultDataProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
