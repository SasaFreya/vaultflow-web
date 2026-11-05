import { useState, useRef, useCallback } from 'react';
import {
  Trash2, Search, Camera,
  Utensils, Bus, ShoppingBag, Home, Gamepad2,
  Heart, BookOpen, Wifi, Users, MoreHorizontal,
  TrendingUp,
} from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { formatCurrency, getToday, getCurrentMonth } from '@/lib/storage';
import { recognizeReceiptFromImage, parseReceiptText } from '@/lib/ocr';
import { BottomInputBar } from '@/components/BottomInputBar';
import { ExpandPanel } from '@/components/ExpandPanel';
import { ImportWizard } from '@/components/ImportWizard';
import type { LifeGameSnapshot } from '@/lib/import-engine';

const expenseCategories = [
  { name: '餐饮美食', icon: Utensils, color: '#EF4444' },
  { name: '交通出行', icon: Bus, color: '#F59E0B' },
  { name: '购物消费', icon: ShoppingBag, color: '#6366F1' },
  { name: '房租水电', icon: Home, color: '#8B5CF6' },
  { name: '娱乐休闲', icon: Gamepad2, color: '#EC4899' },
  { name: '医疗健康', icon: Heart, color: '#10B981' },
  { name: '学习教育', icon: BookOpen, color: '#06B6D4' },
  { name: '通讯网络', icon: Wifi, color: '#14B8A6' },
  { name: '人情往来', icon: Users, color: '#F97316' },
  { name: '其他支出', icon: MoreHorizontal, color: '#64748B' },
];

const incomeCategories = [
  { name: '工资收入', icon: TrendingUp, color: '#10B981' },
  { name: '奖金', icon: TrendingUp, color: '#10B981' },
  { name: '理财收益', icon: TrendingUp, color: '#6366F1' },
  { name: '兼职收入', icon: TrendingUp, color: '#F59E0B' },
  { name: '其他收入', icon: TrendingUp, color: '#94A3B8' },
];

type PanelType = 'import' | 'ocr' | null;

export default function Transactions() {
  const { data, settings, addTransaction, addTransactions, setLifeGameSnapshot, deleteTransaction, clearAllTransactions } = useVaultData();
  const [openPanel, setOpenPanel] = useState<PanelType>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [importToast, setImportToast] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<{ amount: number; type: string; category: string; date: string; description: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Manual transaction form
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '餐饮美食',
    accountId: data.accounts.find(a => a.type === 'cash')?.id || '',
    date: getToday(),
    description: '',
  });

  const currentMonth = getCurrentMonth();

  // Filter transactions
  const filteredTransactions = data.transactions
    .filter(t => {
      const matchesSearch = !searchTerm || t.description.includes(searchTerm) || t.category.includes(searchTerm);
      const matchesType = filterType === 'all' || t.type === filterType;
      return matchesSearch && matchesType;
    })
    .slice(0, 100);

  // Monthly summary
  const monthTransactions = data.transactions.filter(t => t.date.startsWith(currentMonth));
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleImportConfirm = useCallback((
    items: Parameters<typeof addTransactions>[0],
    gameSnapshot: LifeGameSnapshot,
  ) => {
    if (items.length > 0) addTransactions(items);
    setLifeGameSnapshot({
      generatedAt: gameSnapshot.generatedAt,
      totalEvents: gameSnapshot.totalEvents,
      monthlyNet: gameSnapshot.monthlyNet,
      categoryTotals: gameSnapshot.categoryTotals,
      tagTotals: gameSnapshot.tagTotals,
    });
    setImportToast(`已入库 ${items.length} 条。当前余额与历史盘点不变，可查看期间收支分析`);
    setOpenPanel(null);
  }, [addTransactions, setLifeGameSnapshot]);

  const handleOcrImage = useCallback(async (file: File) => {
    setOcrLoading(true);
    setOcrPreview(null);
    try {
      const parsed = await recognizeReceiptFromImage(file, settings.ocr ?? { provider: null });
      setOcrPreview(parsed);
      setOcrText('');
    } catch (e) {
      setOcrError(e instanceof Error ? e.message : 'OCR 识别失败');
    } finally {
      setOcrLoading(false);
    }
  }, [settings.ocr]);

  const handleParseOcrText = () => {
    const parsed = parseReceiptText(ocrText);
    if (parsed) setOcrPreview(parsed);
    else setOcrError('未能从文本中提取金额');
  };

  const saveOcrTransaction = () => {
    if (!ocrPreview || !formData.accountId) return;
    addTransaction({
      date: ocrPreview.date,
      amount: ocrPreview.amount,
      type: ocrPreview.type as 'income' | 'expense',
      category: ocrPreview.category,
      accountId: formData.accountId,
      description: ocrPreview.description,
      source: 'manual',
    });
    setOcrPreview(null);
    setOcrText('');
  };

  const quickSubmit = () => {
    if (!formData.amount || !formData.accountId) return;
    addTransaction({
      date: formData.date,
      amount: parseFloat(formData.amount),
      type: formData.type,
      category: formData.category,
      accountId: formData.accountId,
      description: formData.description || formData.category,
      source: 'manual',
    });
    setFormData(prev => ({ ...prev, amount: '', description: '' }));
  };

  const categories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-6 pb-36">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold vault-heading">记账</h1>
          <p className="text-sm mt-1 vault-muted">底部栏快速记一笔 · 展开面板智能导入 / OCR</p>
        </div>
        {data.transactions.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`确定清空全部 ${data.transactions.length} 条记账？账户余额不会改动。`)) {
                clearAllTransactions();
                setImportToast('已清空所有记账');
              }
            }}
            className="text-[10px] px-3 py-1.5 rounded-lg border vault-muted self-start"
            style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-red)' }}
          >
            清空所有记账
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="vault-card">
          <p className="text-xs vault-muted mb-1">本月交易</p>
          <p className="text-xl font-bold font-mono vault-heading">{monthTransactions.length}</p>
        </div>
        <div className="vault-card">
          <p className="text-xs vault-muted mb-1">收入</p>
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--vault-accent)' }}>{formatCurrency(monthIncome)}</p>
        </div>
        <div className="vault-card">
          <p className="text-xs vault-muted mb-1">支出</p>
          <p className="text-xl font-bold font-mono" style={{ color: 'var(--vault-red)' }}>{formatCurrency(monthExpense)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 vault-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg pl-9 pr-3 py-2 text-xs border outline-none"
            style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
            placeholder="搜索交易…"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
          className="rounded-lg px-3 py-2 text-xs border outline-none"
          style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
        >
          <option value="all">全部</option>
          <option value="income">收入</option>
          <option value="expense">支出</option>
        </select>
      </div>

      <div className="vault-card !p-0 overflow-hidden">
        <div className="max-h-[420px] overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-10 vault-muted text-xs">暂无交易 · 用底部栏记第一笔</div>
          ) : (
            filteredTransactions.map(t => {
              const categoryInfo = [...expenseCategories, ...incomeCategories].find(c => c.name === t.category);
              const Icon = categoryInfo?.icon || MoreHorizontal;
              const color = categoryInfo?.color || 'var(--vault-text-secondary)';
              const account = data.accounts.find(a => a.id === t.accountId);
              return (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0" style={{ borderColor: 'var(--vault-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-xs vault-heading">{t.description || t.category}</p>
                      <p className="text-[10px] vault-muted">{t.date} · {account?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold" style={{ color: t.type === 'income' ? 'var(--vault-accent)' : 'var(--vault-red)' }}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                    <button onClick={() => deleteTransaction(t.id)} className="p-1 rounded hover:opacity-70">
                      <Trash2 className="w-3.5 h-3.5 vault-muted" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ExpandPanel title="智能导入" open={openPanel === 'import'} onToggle={() => setOpenPanel(openPanel === 'import' ? null : 'import')} badge="微信/支付宝/银行">
        <ImportWizard
          accounts={data.accounts}
          existing={data.transactions}
          onConfirm={handleImportConfirm}
        />
        {importToast && (
          <p className="text-xs mt-2" style={{ color: 'var(--vault-accent)' }}>{importToast}</p>
        )}
      </ExpandPanel>

      <ExpandPanel title="截图 OCR" open={openPanel === 'ocr'} onToggle={() => setOpenPanel(openPanel === 'ocr' ? null : 'ocr')}>
        <div onClick={() => imageInputRef.current?.click()} className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-3" style={{ borderColor: 'var(--vault-border)', backgroundColor: 'var(--vault-input-bg)' }}>
          <Camera className="w-6 h-6 mx-auto mb-2 vault-muted" />
          <p className="text-xs vault-heading">{ocrLoading ? '识别中…' : '上传账单截图'}</p>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleOcrImage(f); e.target.value = ''; }} />
        </div>
        <textarea value={ocrText} onChange={e => setOcrText(e.target.value)} className="w-full h-20 rounded-lg px-3 py-2 text-xs border outline-none resize-none mb-2" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }} placeholder="或粘贴 OCR 文本…" />
        <button onClick={handleParseOcrText} className="px-3 py-1.5 rounded-lg text-xs text-white vault-btn-primary mb-2">解析</button>
        {ocrError && <p className="text-xs mb-2" style={{ color: 'var(--vault-red)' }}>{ocrError}</p>}
        {ocrPreview && (
          <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--vault-nav-active-bg)' }}>
            <p className="vault-heading">{formatCurrency(ocrPreview.amount)} · {ocrPreview.category}</p>
            <button onClick={saveOcrTransaction} className="mt-2 w-full py-2 rounded-lg text-xs text-white vault-btn-primary">保存</button>
          </div>
        )}
      </ExpandPanel>

      <BottomInputBar>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" onClick={() => setFormData({ ...formData, type: 'expense', category: '餐饮美食' })} className="px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: formData.type === 'expense' ? 'rgba(239,68,68,0.2)' : 'var(--vault-border)', color: formData.type === 'expense' ? 'var(--vault-red)' : 'var(--vault-text-secondary)' }}>支出</button>
            <button type="button" onClick={() => setFormData({ ...formData, type: 'income', category: '工资收入' })} className="px-2 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: formData.type === 'income' ? 'rgba(16,185,129,0.2)' : 'var(--vault-border)', color: formData.type === 'income' ? 'var(--vault-accent)' : 'var(--vault-text-secondary)' }}>收入</button>
            <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="金额" className="w-24 rounded-lg px-3 py-2 text-xs border outline-none font-mono" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }} onKeyDown={e => e.key === 'Enter' && quickSubmit()} />
            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="flex-1 min-w-[100px] rounded-lg px-2 py-2 text-xs border outline-none" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button type="button" onClick={quickSubmit} className="px-4 py-2 rounded-lg text-xs font-medium text-white vault-btn-primary">记一笔</button>
          </div>
          {showAdvanced && (
            <div className="flex flex-wrap gap-2 pt-1 border-t" style={{ borderColor: 'var(--vault-border)' }}>
              <select value={formData.accountId} onChange={e => setFormData({ ...formData, accountId: e.target.value })} className="rounded-lg px-2 py-1.5 text-xs border outline-none" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}>
                {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="rounded-lg px-2 py-1.5 text-xs border outline-none font-mono" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }} />
              <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="备注" className="flex-1 min-w-[120px] rounded-lg px-2 py-1.5 text-xs border outline-none" style={{ backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }} />
            </div>
          )}
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] vault-muted">
            {showAdvanced ? '收起' : '更多选项（账户/日期/备注）'}
          </button>
        </div>
      </BottomInputBar>
    </div>
  );
}
