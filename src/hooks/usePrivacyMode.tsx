import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'vaultflow-privacy-reveal';
const AUTO_HIDE_MS = 30_000;

interface PrivacyContextValue {
  revealed: boolean;
  toggleReveal: () => void;
  hide: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setRevealed(false);
    try { sessionStorage.setItem(STORAGE_KEY, '0'); } catch { /* ignore */ }
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const toggleReveal = useCallback(() => {
    setRevealed(prev => {
      const next = !prev;
      try { sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (next) {
        timerRef.current = setTimeout(hide, AUTO_HIDE_MS);
      }
      return next;
    });
  }, [hide]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <PrivacyContext.Provider value={{ revealed, toggleReveal, hide }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacyMode() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    return {
      revealed: true,
      toggleReveal: () => {},
      hide: () => {},
    };
  }
  return ctx;
}
