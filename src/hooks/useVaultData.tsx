import { makeAccountBalancePoint, recordAccountUpdate } from '@/lib/account-balance-history';
import { addCheckpoint, createCheckpoint, shouldReverseTransaction } from '@/lib/asset-checkpoints';
import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { AppData, Account, Transaction, Budget, Goal, CalendarEvent, VaultSettings, ForecastEvent } from '@/types';
import {
  calculateTotals,
  getCurrentMonthTransactions,
  getCategoryTotals,
  updateBudgetSpent,
  generateId,
  getToday,
  fullSyncData,
  getNetWorthChange,
  normalizeDebtBalance,
  applyTransactionToAccount,
  reverseTransactionOnAccount,
  getAccountDeleteBlockers,
  createEmptyAppData,
  loadDemoData as loadDemoDataSync,
  resetData as resetDataSync,
  importData,
  sortAccounts,
} from '@/lib/storage';
import { isElectron } from '@/lib/persistence';
import {
  DEFAULT_SETTINGS,
  loadPersistedData,
  savePersistedData,
  loadPersistedSettings,
  savePersistedSettings,
} from '@/lib/persistence';
import { hashPin, verifyPin, setSessionUnlocked, isSessionUnlocked } from '@/lib/security';

function useVaultDataState() {
  const [data, setData] = useState<AppData | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [loadError, setLoadError] = useState('');
  const [dataSaveError, setDataSaveError] = useState('');
  const [settingsSaveError, setSettingsSaveError] = useState('');
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    Promise.all([
      loadPersistedData(createEmptyAppData()),
      loadPersistedSettings(),
    ]).then(([loadedData, loadedSettings]) => {
      const synced = fullSyncData(loadedData, loadedSettings);
      setData(synced);
      setSettings(loadedSettings);
      const shouldLock = loadedSettings.lockEnabled && loadedSettings.passwordHash && !isSessionUnlocked();
      setLocked(!!shouldLock);
      setReady(true);
    }).catch(e => setLoadError(e instanceof Error ? e.message : '读取账本失败，原文件已保留'));
  }, []);

  useEffect(() => {
    if (!ready || !data) return;
    let active = true;
    void savePersistedData(data).then(() => { if (active) setDataSaveError(''); }).catch(e => { if (active) setDataSaveError(`账本尚未保存：${e instanceof Error ? e.message : '写入失败'}。请导出 JSON 备份，勿关闭应用。`); });
    return () => { active = false; };
  }, [data, ready]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    void savePersistedSettings(settings).then(() => { if (active) setSettingsSaveError(''); }).catch(e => { if (active) setSettingsSaveError(`设置尚未保存：${e instanceof Error ? e.message : '写入失败'}`); });
    return () => { active = false; };
  }, [settings, ready]);

  const syncData = useCallback((next: AppData) => fullSyncData(next, settings), [settings]);

  const refresh = useCallback(async () => {
    const [loadedData, loadedSettings] = await Promise.all([
      loadPersistedData(createEmptyAppData()),
      loadPersistedSettings(),
    ]);
    setData(fullSyncData(loadedData, loadedSettings));
    setSettings(loadedSettings);
    setRefreshKey(k => k + 1);
  }, []);

  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => {
      if (!prev) return prev;
      return syncData(updater(prev));
    });
  }, [syncData]);

  const updateSettings = useCallback((updater: (prev: VaultSettings) => VaultSettings) => {
    setSettings(prev => {
      const next = updater(prev);
      setData(d => (d ? fullSyncData(d, next) : d));
      return next;
    });
  }, [syncData]);

  const totals = calculateTotals(data ?? createEmptyAppData(), settings);
  const currentMonthTransactions = getCurrentMonthTransactions(data ?? createEmptyAppData());
  const categoryTotals = getCategoryTotals(data ?? createEmptyAppData(), settings);
  const budgetsWithSpent = updateBudgetSpent(data ?? createEmptyAppData(), settings);
  const monthlyData = data?.monthlyData ?? [];
  const netWorthChange = getNetWorthChange(data ?? createEmptyAppData());
  const sortedAccounts = sortAccounts(data?.accounts ?? []);

  const saveAssetCheckpoint = useCallback((accounts: Account[], note: string, date = getToday()) => {
    if (!data) throw new Error('数据未加载');
    createCheckpoint(data, accounts, settings, note, date);
    updateData(prev => addCheckpoint(prev, accounts, settings, note, date));
  }, [data, settings, updateData]);

  const addAccount = useCallback((account: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => {
    updateData(prev => {
      const newAccount: Account = {
        ...account,
        currency: account.currency ?? 'CNY',
        balance: normalizeDebtBalance(account.type, account.balance),
        sortOrder: prev.accounts.length,
        id: generateId(),
        createdAt: getToday(),
        updatedAt: getToday(),
      };
      const point = makeAccountBalancePoint(newAccount);
      return { ...prev, accounts: [...prev.accounts, newAccount], accountBalanceHistory: [...(prev.accountBalanceHistory ?? []), ...(point ? [point] : [])] };
    });
  }, [updateData]);

  const updateAccount = useCallback((id: string, updates: Partial<Account>, date = getToday()) => {
    if (!data) throw new Error('数据未加载');
    recordAccountUpdate(data, id, updates, date);
    updateData(prev => recordAccountUpdate(prev, id, updates, date));
  }, [data, updateData]);

  const reorderAccounts = useCallback((orderedIds: string[]) => {
    updateData(prev => {
      const map = new Map(prev.accounts.map(a => [a.id, a]));
      const reordered: Account[] = [];
      orderedIds.forEach((id, index) => {
        const acc = map.get(id);
        if (acc) reordered.push({ ...acc, sortOrder: index });
        map.delete(id);
      });
      map.forEach(acc => reordered.push(acc));
      return { ...prev, accounts: reordered.map((a, i) => ({ ...a, sortOrder: i })) };
    });
  }, [updateData]);

  const deleteAccount = useCallback((id: string): { success: boolean; error?: string } => {
    if (!data) return { success: false, error: '数据未加载' };
    const blockers = getAccountDeleteBlockers(data, id);
    if (blockers.length > 0) {
      return { success: false, error: blockers.join('；') };
    }
    updateData(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id),
    }));
    return { success: true };
  }, [data, updateData]);

  const getDeleteAccountBlockersFn = useCallback((id: string) => {
    if (!data) return [];
    return getAccountDeleteBlockers(data, id);
  }, [data]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
      createdAt: getToday(),
    };
    updateData(prev => ({
      ...prev,
      accounts: transaction.source === 'csv'
        ? prev.accounts
        : prev.accounts.map(a =>
            a.id === transaction.accountId ? applyTransactionToAccount(a, transaction) : a
          ),
      transactions: [newTransaction, ...prev.transactions],
    }));
  }, [updateData]);

  const addTransactions = useCallback((transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => {
    const newTransactions: Transaction[] = transactions.map(t => ({
      ...t,
      id: generateId(),
      createdAt: getToday(),
    }));
    updateData(prev => {
      const historical = newTransactions.every(t => t.source === 'csv');
      let accounts = [...prev.accounts];
      if (!historical) {
        newTransactions.forEach(tx => {
          if (tx.source !== 'csv') {
            accounts = accounts.map(a =>
              a.id === tx.accountId ? applyTransactionToAccount(a, tx) : a
            );
          }
        });
      }
      return {
        ...prev,
        accounts,
        transactions: [...newTransactions, ...prev.transactions],
      };
    });
  }, [updateData]);

  const setLifeGameSnapshot = useCallback((snapshot: AppData['lifeGameSnapshot']) => {
    updateData(prev => ({ ...prev, lifeGameSnapshot: snapshot }));
  }, [updateData]);

  const deleteTransaction = useCallback((id: string) => {
    updateData(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;
      return {
        ...prev,
        accounts: shouldReverseTransaction(prev, id) ? prev.accounts.map(a =>
          a.id === tx.accountId ? reverseTransactionOnAccount(a, tx) : a
        ) : prev.accounts,
        transactions: prev.transactions.filter(t => t.id !== id),
      };
    });
  }, [updateData]);

  const updateBudget = useCallback((id: string, updates: Partial<Budget>) => {
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, budgets: prev.budgets.map(b => b.id === id ? { ...b, ...updates } : b) };
    });
  }, []);

  const addBudget = useCallback((budget: Omit<Budget, 'id' | 'spent'>) => {
    setData(prev => {
      if (!prev) return prev;
      if (prev.budgets.some(b => b.category === budget.category)) return prev;
      return {
        ...prev,
        budgets: [...prev.budgets, { ...budget, id: generateId(), spent: 0 }],
      };
    });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, budgets: prev.budgets.filter(b => b.id !== id) };
    });
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt'>) => {
    updateData(prev => ({
      ...prev,
      goals: [...prev.goals, { ...goal, id: generateId(), createdAt: getToday() }],
    }));
  }, [updateData]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    updateData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, ...updates } : g),
    }));
  }, [updateData]);

  const deleteGoal = useCallback((id: string) => {
    updateData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id),
    }));
  }, [updateData]);

  const addCalendarEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    updateData(prev => ({
      ...prev,
      calendarEvents: [...prev.calendarEvents, { ...event, id: generateId() }],
    }));
  }, [updateData]);

  const deleteCalendarEvent = useCallback((id: string) => {
    updateData(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.filter(e => e.id !== id),
    }));
  }, [updateData]);

  const updateCalendarEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    updateData(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map(e => (e.id === id ? { ...e, ...updates } : e)),
    }));
  }, [updateData]);

  const addForecastEvent = useCallback((event: Omit<ForecastEvent, 'id'>) => {
    updateData(prev => ({
      ...prev,
      forecastEvents: [...(prev.forecastEvents ?? []), { ...event, id: generateId() }],
    }));
  }, [updateData]);

  const updateForecastEvent = useCallback((id: string, updates: Partial<ForecastEvent>) => {
    updateData(prev => ({
      ...prev,
      forecastEvents: (prev.forecastEvents ?? []).map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  }, [updateData]);

  const deleteForecastEvent = useCallback((id: string) => {
    updateData(prev => ({
      ...prev,
      forecastEvents: (prev.forecastEvents ?? []).filter(e => e.id !== id),
    }));
  }, [updateData]);

  const loadDemoData = useCallback(async () => {
    const demo = loadDemoDataSync();
    setData(fullSyncData(demo, settings));
  }, [settings]);

  const resetData = useCallback(async () => {
    const empty = resetDataSync();
    setData(fullSyncData(empty, DEFAULT_SETTINGS));
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const resetSettingsToDefault = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const clearAllTransactions = useCallback(() => {
    updateData(prev => {
      let accounts = [...prev.accounts];
      prev.transactions.forEach(tx => {
        if (shouldReverseTransaction(prev, tx.id)) {
          accounts = accounts.map(a =>
            a.id === tx.accountId ? reverseTransactionOnAccount(a, tx) : a
          );
        }
      });
      return {
        ...prev,
        accounts,
        transactions: [],
        lifeGameSnapshot: undefined,
      };
    });
    if (isElectron() && window.electronAPI?.clearBankParserHistory) {
      void window.electronAPI.clearBankParserHistory();
    }
  }, [updateData]);

  const importJson = useCallback((json: string) => importData(json), []);

  const replaceData = useCallback((next: AppData) => {
    setData(fullSyncData(next, settings));
  }, [settings]);

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    if (!settings.passwordHash) return true;
    const ok = await verifyPin(pin, settings.passwordHash);
    if (ok) {
      setSessionUnlocked(true);
      setLocked(false);
    }
    return ok;
  }, [settings.passwordHash]);

  const lock = useCallback(() => {
    setSessionUnlocked(false);
    if (settings.lockEnabled && settings.passwordHash) setLocked(true);
  }, [settings.lockEnabled, settings.passwordHash]);

  const setupLock = useCallback(async (pin: string, enabled: boolean) => {
    const passwordHash = enabled ? await hashPin(pin) : null;
    updateSettings(prev => ({
      ...prev,
      lockEnabled: enabled,
      passwordHash,
    }));
    if (enabled) {
      setSessionUnlocked(true);
      setLocked(false);
    } else {
      setSessionUnlocked(false);
      setLocked(false);
    }
  }, [settings, updateSettings]);

  const disableLock = useCallback(() => {
    updateSettings(prev => ({
      ...prev,
      lockEnabled: false,
      passwordHash: null,
    }));
    setSessionUnlocked(false);
    setLocked(false);
  }, [updateSettings]);

  return {
    data: data ?? createEmptyAppData(),
    settings,
    ready,
    loadError,
    storageError: dataSaveError || settingsSaveError,
    locked,
    refresh,
    refreshKey,
    totals,
    sortedAccounts,
    saveAssetCheckpoint,
    currentMonthTransactions,
    categoryTotals,
    budgetsWithSpent,
    monthlyData,
    netWorthChange,
    addAccount,
    updateAccount,
    reorderAccounts,
    deleteAccount,
    getDeleteAccountBlockers: getDeleteAccountBlockersFn,
    addTransaction,
    addTransactions,
    setLifeGameSnapshot,
    deleteTransaction,
    updateBudget,
    addBudget,
    deleteBudget,
    addGoal,
    updateGoal,
    deleteGoal,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    addForecastEvent,
    updateForecastEvent,
    deleteForecastEvent,
    updateSettings,
    loadDemoData,
    resetData,
    resetSettingsToDefault,
    clearAllTransactions,
    importJson,
    exportJson: () => JSON.stringify(data ?? createEmptyAppData(), null, 2),
    replaceData,
    unlock,
    lock,
    setupLock,
    disableLock,
  };
}

type VaultDataContextValue = ReturnType<typeof useVaultDataState>;

const VaultDataContext = createContext<VaultDataContextValue | null>(null);

export function VaultDataProvider({ children }: { children: ReactNode }) {
  const value = useVaultDataState();
  return (
    <VaultDataContext.Provider value={value}>
      {children}
    </VaultDataContext.Provider>
  );
}

export function useVaultData() {
  const ctx = useContext(VaultDataContext);
  if (!ctx) {
    throw new Error('useVaultData must be used within VaultDataProvider');
  }
  return ctx;
}
