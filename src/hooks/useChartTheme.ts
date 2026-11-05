import { useTheme } from '@/hooks/useTheme';
import { useMemo } from 'react';

function readCssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useChartTheme() {
  const { theme } = useTheme();

  return useMemo(() => ({
    primary: readCssVar('--vault-primary') || '#6366F1',
    accent: readCssVar('--vault-accent') || '#10B981',
    red: readCssVar('--vault-red') || '#EF4444',
    yellow: readCssVar('--vault-yellow') || '#F59E0B',
    purple: '#8B5CF6',
    text: readCssVar('--vault-text') || '#F8FAFC',
    textSecondary: readCssVar('--vault-text-secondary') || '#94A3B8',
    border: readCssVar('--vault-border') || '#1E293B',
    surface: readCssVar('--vault-surface') || '#151A26',
    navActiveBg: readCssVar('--vault-nav-active-bg') || 'rgba(99, 102, 241, 0.15)',
    gridStroke: readCssVar('--vault-border') || '#1E293B',
    axisStroke: readCssVar('--vault-text-secondary') || '#64748B',
  }), [theme]);
}
