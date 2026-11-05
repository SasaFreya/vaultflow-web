import { calculateBalanceExpression } from '@/lib/balance-expression';
import { AssetCheckpointPanel } from '@/components/AssetCheckpointPanel';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Trash2, Save, X, Search, Sparkles,
  ChevronDown, ChevronRight, Edit2,
} from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { formatBalanceInBase, formatCurrency, CURRENCY_OPTIONS, getToday } from '@/lib/storage';
import { SortableAccountList } from '@/components/SortableAccountList';
import WelcomeEmptyState from '@/components/WelcomeEmptyState';
import { accountTypeConfig, ACCOUNT_COLORS, type AccountType } from '@/lib/accountConfig';
import type { Account, CurrencyCode } from '@/types';

type AccountForm = Partial<Account> & { balanceExpression?: string };


const inputStyle = {
  backgroundColor: 'var(--vault-input-bg)',
  borderColor: 'var(--vault-border)',
  color: 'var(--vault-text)',
};

const emptyAccountForm = (type: AccountType = 'cash'): AccountForm => ({
  name: '',
  type,
  balance: null,
  currency: 'CNY',
  color: ACCOUNT_COLORS[0],
  note: '',
});

function AccountFormFields({
  form,
  onChange,
  footer,
}: {
  form: AccountForm;
  onChange: (next: AccountForm) => void;
  footer: ReactNode;
}) {
  const expression = form.balanceExpression ?? String(form.balance ?? '');
  const result = calculateBalanceExpression(expression);
  return (
    <div className="space-y-3">
      <p className="text-[10px] vault-muted">只有名称必填，余额可留空</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] vault-muted block mb-1">账户名称 *</label>
          <input
            value={form.name || ''}
            onChange={e => onChange({ ...form, name: e.target.value })}
            placeholder="如：招商银行、微信零钱"
            className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
            style={inputStyle}
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] vault-muted block mb-1">类型</label>
          <select
            value={form.type}
            onChange={e => onChange({ ...form, type: e.target.value as AccountType })}
            className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
            style={inputStyle}
          >
            {Object.entries(accountTypeConfig).map(([k, c]) => (
              <option key={k} value={k}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] vault-muted block mb-1">余额</label>
          <input
            type="text"
            aria-label="账户余额或加减算式"
            value={expression}
            onChange={e => { const value = e.target.value; const calculated = calculateBalanceExpression(value); onChange({ ...form, balanceExpression: value, balance: calculated.success ? calculated.value : null }); }}
            placeholder="如 1000+200-35.5，可留空"
            className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
            style={inputStyle}
          />
          {expression.trim() && <p className="text-[10px] mt-1" style={{ color: result.success ? 'var(--vault-text-secondary)' : 'var(--vault-red)' }}>{result.success ? `计算结果：${formatCurrency(result.value, form.currency ?? 'CNY')}` : result.error}</p>}
        </div>
        <div>
          <label className="text-[10px] vault-muted block mb-1">币种</label>
          <select
            value={form.currency ?? 'CNY'}
            onChange={e => onChange({ ...form, currency: e.target.value as CurrencyCode })}
            className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
            style={inputStyle}
          >
            {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] vault-muted block mb-1">备注</label>
          <input
            value={form.note || ''}
            onChange={e => onChange({ ...form, note: e.target.value })}
            placeholder="可选"
            className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
            style={inputStyle}
          />
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {ACCOUNT_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ ...form, color: c })}
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: c, boxShadow: form.color === c ? '0 0 0 2px var(--vault-primary)' : 'none' }}
          />
        ))}
      </div>
      {footer}
    </div>
  );
}

export default function Accounts() {
  const {
    data, settings, sortedAccounts, totals,
    addAccount, updateAccount, reorderAccounts,
    deleteAccount, getDeleteAccountBlockers, loadDemoData,
  } = useVaultData();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inlineAddType, setInlineAddType] = useState<AccountType | null>(null);
  const [addForm, setAddForm] = useState<AccountForm>(emptyAccountForm());
  const [collapsedGroups, setCollapsedGroups] = useState<Record<AccountType, boolean>>({
    cash: false, investment: false, debt: false, fixed: false,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editForm, setEditForm] = useState<AccountForm>({});
  const [editDate, setEditDate] = useState(getToday());

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredAccounts = sortedAccounts.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedAccounts = {
    cash: filteredAccounts.filter(a => a.type === 'cash'),
    investment: filteredAccounts.filter(a => a.type === 'investment'),
    debt: filteredAccounts.filter(a => a.type === 'debt'),
    fixed: filteredAccounts.filter(a => a.type === 'fixed'),
  };

  const startInlineAdd = (type: AccountType) => {
    setExpandedId(null);
    setInlineAddType(type);
    setAddForm(emptyAccountForm(type));
  };

  const cancelInlineAdd = () => {
    setInlineAddType(null);
    setAddForm(emptyAccountForm());
  };

  const handleAddSave = () => {
    if (!addForm.name?.trim()) return;
    if (addForm.balanceExpression?.trim() && !calculateBalanceExpression(addForm.balanceExpression).success) { showMessage('error', '请先完成余额算式'); return; }
    addAccount({
      name: addForm.name.trim(),
      type: addForm.type ?? 'cash',
      balance: addForm.balance ?? null,
      currency: addForm.currency ?? 'CNY',
      color: addForm.color ?? ACCOUNT_COLORS[0],
      note: addForm.note,
    });
    cancelInlineAdd();
    showMessage('success', '账户已添加');
  };

  const openExpand = (account: Account) => {
    cancelInlineAdd();
    setExpandedId(expandedId === account.id ? null : account.id);
    setEditDate(getToday());
    setEditForm({
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency ?? 'CNY',
      color: account.color,
      note: account.note,
    });
  };

  const handleSave = (id: string) => {
    if (!editForm.name?.trim()) return;
    if (editForm.balanceExpression?.trim() && !calculateBalanceExpression(editForm.balanceExpression).success) { showMessage('error', '请先完成余额算式'); return; }
    try { updateAccount(id, {
      name: editForm.name.trim(),
      type: editForm.type,
      balance: editForm.balance ?? null,
      currency: editForm.currency,
      color: editForm.color,
      note: editForm.note,
    }, editDate);
    showMessage('success', editDate < getToday() ? '历史余额节点已补录，当前余额未改变' : '余额节点已保存，可到资产趋势页查看');
    } catch (e) { showMessage('error', e instanceof Error ? e.message : '保存失败'); }
  };

  const handleDelete = (account: Account) => {
    const blockers = getDeleteAccountBlockers(account.id);
    if (blockers.length > 0) {
      showMessage('error', `无法删除：${blockers.join('；')}`);
      return;
    }
    if (confirm(`确定删除「${account.name}」？`)) {
      const result = deleteAccount(account.id);
      if (result.success) {
        setExpandedId(null);
        showMessage('success', '账户已删除');
      } else {
        showMessage('error', result.error || '删除失败');
      }
    }
  };

  const renderInlineAddForm = (type: AccountType) => (
    <div
      className="px-4 py-4 border-t"
      style={{ borderColor: 'var(--vault-border)', backgroundColor: 'var(--vault-nav-active-bg)' }}
    >
      <p className="text-xs font-medium vault-heading mb-3">新增{accountTypeConfig[type].label}账户</p>
      <AccountFormFields
        form={addForm}
        onChange={setAddForm}
        footer={
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAddSave}
              disabled={!addForm.name?.trim()}
              className="flex-1 py-2 rounded-lg text-xs font-medium text-white vault-btn-primary disabled:opacity-40 flex items-center justify-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />保存账户
            </button>
            <button
              type="button"
              onClick={cancelInlineAdd}
              className="px-3 py-2 rounded-lg text-xs vault-muted"
              style={{ backgroundColor: 'var(--vault-border)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />
    </div>
  );

  if (data.accounts.length === 0) {
    return (
      <div className="pb-12 space-y-4">
        <WelcomeEmptyState />
        {inlineAddType ? (
          <div className="vault-card !p-0 overflow-hidden">{renderInlineAddForm(inlineAddType)}</div>
        ) : (
          <div className="vault-card">
            <button
              type="button"
              onClick={() => startInlineAdd('cash')}
              className="w-full py-3 rounded-lg text-sm font-medium text-white vault-btn-primary flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />添加我的第一个账户
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {message && (
        <div
          className="fixed top-20 right-4 z-50 px-4 py-3 rounded-lg text-xs font-medium text-white shadow-lg"
          style={{ backgroundColor: message.type === 'success' ? 'var(--vault-accent)' : 'var(--vault-red)' }}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold vault-heading">账户</h1>
          <p className="text-sm mt-1 vault-muted">每次保存余额都会保留节点 · 图表集中在资产趋势页查看</p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 vault-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索账户…"
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-none w-40"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="vault-card">
          <p className="text-xs vault-muted mb-1">净资产</p>
          <p className="text-xl font-bold font-mono vault-heading">{formatCurrency(totals.netWorth, settings.baseCurrency)}</p>
        </div>
        <div className="vault-card">
          <p className="text-xs vault-muted mb-1">总资产</p>
          <p className="text-xl font-bold font-mono vault-heading">{formatCurrency(totals.totalAssets, settings.baseCurrency)}</p>
        </div>
        <div className="vault-card">
          <p className="text-xs vault-muted mb-1">总负债</p>
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--vault-red)' }}>{formatCurrency(totals.totalDebt, settings.baseCurrency)}</p>
        </div>
        <div className="vault-card">
          <p className="text-xs vault-muted mb-1">账户数</p>
          <p className="text-xl font-bold font-mono vault-heading">{data.accounts.length}</p>
        </div>
      </div>

      <div className="flex justify-end"><Link to="/trends?view=accounts" className="text-xs underline vault-heading">查看各账户趋势 →</Link></div>
      <AssetCheckpointPanel />

      {!searchQuery && (
        <div className="vault-card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--vault-border)' }}>
            <p className="text-sm font-medium vault-heading">拖拽排序</p>
            <p className="text-[10px] vault-muted">按住 ⋮⋮ 拖动调整顺序</p>
          </div>
          <SortableAccountList
            accounts={sortedAccounts}
            onReorder={reorderAccounts}
            renderAccount={(account, dragHandle) => (
              <button type="button" onClick={() => openExpand(account)} className="w-full px-4 py-3 group flex items-center justify-between text-left hover:opacity-90">
                <div className="flex items-center gap-2">
                  {dragHandle}
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color }} />
                  <span className="text-xs vault-heading">{account.name}</span>
                </div>
                <span className="text-xs font-mono vault-heading">
                  {formatBalanceInBase(account.balance, account.currency, settings)}
                </span>
              </button>
            )}
          />
        </div>
      )}

      <div className="space-y-3">
        {(Object.entries(groupedAccounts) as [AccountType, Account[]][]).map(([type, accounts]) => {
          const config = accountTypeConfig[type];
          const Icon = config.icon;
          return (
            <div key={type} className="vault-card !p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => setCollapsedGroups(g => ({ ...g, [type]: !g[type] }))}
                className="w-full px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: 'var(--vault-border)' }}
              >
                {collapsedGroups[type] ? <ChevronRight className="w-4 h-4 vault-muted" /> : <ChevronDown className="w-4 h-4 vault-muted" />}
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <span className="text-sm font-medium vault-heading">{config.label}</span>
                <span className="text-xs font-mono ml-auto vault-muted">{accounts.length} 个</span>
              </button>
              {!collapsedGroups[type] && (
                <div className="divide-y" style={{ borderColor: 'var(--vault-border)' }}>
                  {accounts.map(account => (
                    <div key={account.id}>
                      <button
                        type="button"
                        onClick={() => openExpand(account)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:opacity-90 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color || config.color }} />
                          <span className="text-sm vault-heading">{account.name}</span>
                          {expandedId === account.id && <Edit2 className="w-3 h-3" style={{ color: 'var(--vault-primary)' }} />}
                        </div>
                        <span className="text-sm font-mono font-semibold vault-heading">
                          {account.type === 'debt' && account.balance !== null
                            ? formatBalanceInBase(Math.abs(account.balance), account.currency, settings)
                            : formatBalanceInBase(account.balance, account.currency, settings)}
                        </span>
                      </button>
                      {expandedId === account.id && (
                        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--vault-border)', backgroundColor: 'var(--vault-input-bg)' }}>
                          <div className="pt-3">
                            <label className="flex flex-wrap items-center gap-2 text-xs vault-muted mb-3">余额日期<input aria-label={`${account.name}余额日期`} type="date" max={getToday()} value={editDate} onChange={e => setEditDate(e.target.value)} onInput={e => setEditDate(e.currentTarget.value)} className="rounded-lg border px-3 py-2" style={inputStyle} /></label>
                            {editDate < getToday() && <p className="text-xs vault-muted mb-3">仅补录这一天的余额节点，不覆盖今天的账户信息和余额。</p>}
                            <AccountFormFields
                              form={editForm}
                              onChange={setEditForm}
                              footer={
                                <div className="flex gap-2 pt-1">
                                  <button onClick={() => handleSave(account.id)} className="flex-1 py-2 rounded-lg text-xs font-medium text-white vault-btn-primary flex items-center justify-center gap-1">
                                    <Save className="w-3.5 h-3.5" />保存余额节点
                                  </button>
                                  <button onClick={() => handleDelete(account)} className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--vault-red)' }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setExpandedId(null)} className="px-3 py-2 rounded-lg text-xs vault-muted" style={{ backgroundColor: 'var(--vault-border)' }}>
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              }
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                  {inlineAddType === type ? (
                    renderInlineAddForm(type)
                  ) : (
                    <button
                      type="button"
                      onClick={() => startInlineAdd(type)}
                      className="w-full px-4 py-3 flex items-center gap-2 text-left text-xs vault-muted hover:opacity-80"
                      style={{ backgroundColor: 'var(--vault-input-bg)' }}
                    >
                      <Plus className="w-3.5 h-3.5" style={{ color: 'var(--vault-primary)' }} />
                      <span style={{ color: 'var(--vault-primary)' }}>添加{config.label}账户</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          onClick={() => loadDemoData()}
          className="px-4 py-2 rounded-lg text-xs vault-muted flex items-center gap-1"
          style={{ backgroundColor: 'var(--vault-border)' }}
        >
          <Sparkles className="w-3.5 h-3.5" />加载示例数据
        </button>
      </div>

      <p className="text-xs vault-muted text-center">
        导入的历史流水不会改动余额 · <Link to="/transactions" className="underline" style={{ color: 'var(--vault-primary)' }}>去记账</Link>
      </p>
    </div>
  );
}
