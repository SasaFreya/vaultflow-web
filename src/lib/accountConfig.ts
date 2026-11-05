import { Wallet, CreditCard, Building2, TrendingUp, type LucideIcon } from 'lucide-react';
import type { Account } from '@/types';

export type AccountType = Account['type'];

export const accountTypeConfig: Record<AccountType, { label: string; icon: LucideIcon; color: string }> = {
  cash: { label: '现金账户', icon: Wallet, color: '#10B981' },
  investment: { label: '投资账户', icon: TrendingUp, color: '#6366F1' },
  debt: { label: '负债账户', icon: CreditCard, color: '#EF4444' },
  fixed: { label: '固定资产', icon: Building2, color: '#F59E0B' },
};

export const ACCOUNT_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#6366F1', '#8B5CF6',
  '#EC4899', '#06B6D4', '#14B8A6', '#F97316', '#64748B',
];
