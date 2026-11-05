import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Download, Upload, RotateCcw,
  AlertCircle, CheckCircle2, Sparkles,
  Lock, AlertTriangle, CreditCard, ArrowRight, Trash2, Mail,
} from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { CURRENCY_OPTIONS, validateAppData } from '@/lib/storage';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ForecastEventsPanel } from '@/components/ForecastEventsPanel';
import { OCRSettingsPanel } from '@/components/OCRSettingsPanel';
import { CHART_AXIS_OPTIONS } from '@/lib/chart-axis';
import { exportAccountsCsv, exportTransactionsCsv, importAccountsCsv, importDataJsonMerge } from '@/lib/csv';
import { downloadTextFile, pickAndReadTextFile, isElectron } from '@/lib/persistence';
import { validatePinFormat } from '@/lib/security';
import type { CurrencyCode, ChartAxisUnit, GoalAllocationMode } from '@/types';

export default function Settings() {
  const navigate = useNavigate();
  const {
    data, settings, updateSettings,
    loadDemoData, resetData, resetSettingsToDefault, clearAllTransactions,
    exportJson, replaceData,
    setupLock, disableLock,
  } = useVaultData();
  const [importText, setImportText] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLoadDemoConfirm, setShowLoadDemoConfirm] = useState(false);
  const [showClearTxConfirm, setShowClearTxConfirm] = useState(false);
  const [showResetSettingsConfirm, setShowResetSettingsConfirm] = useState(false);
  const [lockPin, setLockPin] = useState('');
  const [lockPinConfirm, setLockPinConfirm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (window.location.hash === '#accounts') {
      navigate('/accounts', { replace: true });
    }
  }, [navigate]);

  const handleExportJson = async () => {
    const ok = await downloadTextFile(exportJson(), `vaultflow_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    showMessage('success', ok ? 'JSON 已导出' : '已取消导出');
  };

  const handleExportAccountsCsv = async () => {
    const ok = await downloadTextFile(exportAccountsCsv(data.accounts), `vaultflow_accounts_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    showMessage('success', ok ? '账户 CSV 已导出' : '已取消导出');
  };

  const handleExportTransactionsCsv = async () => {
    const ok = await downloadTextFile(exportTransactionsCsv(data), `vaultflow_transactions_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    showMessage('success', ok ? '交易 CSV 已导出' : '已取消导出');
  };

  const handleImportJson = () => {
    if (importMode === 'merge') {
      const result = importDataJsonMerge(importText, data);
      if (result.success && result.data) {
        replaceData(result.data);
        setShowImportForm(false);
        setImportText('');
        showMessage('success', '数据已合并导入');
      } else {
        showMessage('error', result.errors[0] || '合并导入失败');
      }
      return;
    }
    let raw: unknown;
    try { raw = JSON.parse(importText); } catch { showMessage('error', 'JSON 格式无效，请检查备份文件'); return; }
    const result = validateAppData(raw);
    if (result.success && result.data) {
      replaceData(result.data);
      setShowImportForm(false);
      setImportText('');
      showMessage('success', '数据导入成功');
    } else {
      showMessage('error', result.errors[0] || '导入失败');
    }
  };

  const handleImportAccountsCsv = async (mode: 'merge' | 'overwrite') => {
    const csv = await pickAndReadTextFile('.csv');
    if (!csv) return;
    const result = importAccountsCsv(csv, data.accounts, mode);
    if (result.success) {
      const checked = validateAppData({ ...data, accounts: result.accounts });
      if (!checked.success || !checked.data) { showMessage('error', '账户替换会使现有流水失去关联，请先核对账户与账单'); return; }
      replaceData(checked.data);
      showMessage('success', mode === 'merge' ? '账户 CSV 已合并' : '账户 CSV 已覆盖');
    } else {
      showMessage('error', result.errors[0] || 'CSV 导入失败');
    }
  };

  const handleReset = async () => {
    await resetData();
    setShowResetConfirm(false);
    showMessage('success', '已全部清空，回到初始空状态');
  };

  const handleResetSettings = () => {
    resetSettingsToDefault();
    setShowResetSettingsConfirm(false);
    showMessage('success', '设置已恢复默认（账户与记账保留）');
  };

  const handleClearTransactions = () => {
    const count = data.transactions.length;
    clearAllTransactions();
    setShowClearTxConfirm(false);
    showMessage('success', count > 0 ? `已清空 ${count} 条记账（未盘点的手工流水已回滚；盘点节点保留）` : '当前没有记账记录');
  };

  const handleLoadDemo = async () => {
    await loadDemoData();
    setShowLoadDemoConfirm(false);
    showMessage('success', '示例数据已加载');
  };

  const handleSetupLock = async () => {
    if (!validatePinFormat(lockPin)) {
      showMessage('error', '请输入 4 位数字密码');
      return;
    }
    if (lockPin !== lockPinConfirm) {
      showMessage('error', '两次密码不一致');
      return;
    }
    await setupLock(lockPin, true);
    setLockPin('');
    setLockPinConfirm('');
    showMessage('success', '密码锁已启用');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const inputStyle = {
    backgroundColor: 'var(--vault-input-bg)',
    borderColor: 'var(--vault-border)',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--vault-text)' }}>设置</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--vault-text-secondary)' }}>管理账户、主题与数据</p>
      </div>

      <div className="vault-card">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--vault-text)' }}>外观主题</h2>
        <ThemeSwitcher />
      </div>

      {/* Currency & finance settings */}
      <div className="vault-card">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--vault-text)' }}>币种与财务指标</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--vault-text-secondary)' }}>主币种（汇总换算）</label>
            <select
              value={settings.baseCurrency}
              onChange={e => updateSettings(s => ({ ...s, baseCurrency: e.target.value as CurrencyCode }))}
              className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
              style={{ ...inputStyle, color: 'var(--vault-text)' }}
            >
              {CURRENCY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--vault-text-secondary)' }}>月支出（应急资金计算）</label>
            <input
              type="number"
              value={settings.monthlyExpense ?? ''}
              onChange={e => updateSettings(s => ({ ...s, monthlyExpense: e.target.value ? parseFloat(e.target.value) : null }))}
              className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
              style={{ ...inputStyle, color: 'var(--vault-text)' }}
              placeholder="例如 8000"
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--vault-text-secondary)' }}>月收入（储蓄率计算）</label>
            <input
              type="number"
              value={settings.monthlyIncome ?? ''}
              onChange={e => updateSettings(s => ({ ...s, monthlyIncome: e.target.value ? parseFloat(e.target.value) : null }))}
              className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono"
              style={{ ...inputStyle, color: 'var(--vault-text)' }}
              placeholder="例如 18000"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CURRENCY_OPTIONS.filter(c => c.code !== settings.baseCurrency).map(c => (
            <div key={c.code}>
              <label className="text-[10px] block mb-1" style={{ color: 'var(--vault-text-secondary)' }}>
                1 {c.code} → {settings.baseCurrency}
              </label>
              <input
                type="number"
                step="0.0001"
                value={settings.exchangeRates[c.code]}
                onChange={e => updateSettings(s => ({
                  ...s,
                  exchangeRates: { ...s.exchangeRates, [c.code]: parseFloat(e.target.value) || 0 },
                }))}
                className="w-full rounded-lg px-2 py-1.5 text-xs border outline-none font-mono"
                style={{ ...inputStyle, color: 'var(--vault-text)' }}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--vault-text-secondary)' }}>趋势图 Y 轴单位</label>
            <select
              value={settings.chartAxisUnit ?? '10k'}
              onChange={e => updateSettings(s => ({ ...s, chartAxisUnit: e.target.value as ChartAxisUnit }))}
              className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
              style={{ ...inputStyle, color: 'var(--vault-text)' }}
            >
              {CHART_AXIS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--vault-text-secondary)' }}>心愿分配模式（默认）</label>
            <select
              value={settings.goalAllocationMode ?? 'priority'}
              onChange={e => updateSettings(s => ({ ...s, goalAllocationMode: e.target.value as GoalAllocationMode }))}
              className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
              style={{ ...inputStyle, color: 'var(--vault-text)' }}
            >
              <option value="priority">优先级队列</option>
              <option value="ratio">按比例分配</option>
              <option value="dedicated">绑定收入来源</option>
            </select>
          </div>
        </div>
      </div>

      <div className="vault-card">
        <h2 className="text-sm font-semibold mb-2 vault-heading">资产盘点与历史</h2>
        <p className="text-xs vault-muted">在账户页保存每次盘点，完整保留当时的余额、汇率和备注。导入历史流水用于收支分析，不会改动余额，也不会倒推或覆盖历史节点。未来计划只用于预测。</p>
      </div>

      <ForecastEventsPanel />
      <OCRSettingsPanel />
      <div className="vault-card">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--vault-text)' }}>
          <Lock className="w-4 h-4" /> 隐私密码锁
        </h2>
        {settings.lockEnabled ? (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--vault-text-secondary)' }}>密码锁已启用，启动时需要 4 位数字密码</p>
            <button
              onClick={() => { disableLock(); showMessage('success', '密码锁已关闭'); }}
              className="px-4 py-2 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
            >
              关闭密码锁
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={lockPin}
              onChange={e => setLockPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4 位数字密码"
              className="rounded-lg px-3 py-2 text-xs border outline-none"
              style={{ ...inputStyle, color: 'var(--vault-text)' }}
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={lockPinConfirm}
              onChange={e => setLockPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="确认密码"
              className="rounded-lg px-3 py-2 text-xs border outline-none"
              style={{ ...inputStyle, color: 'var(--vault-text)' }}
            />
            <button
              onClick={handleSetupLock}
              className="sm:col-span-2 py-2 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--vault-primary)' }}
            >
              启用密码锁
            </button>
          </div>
        )}
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className="fixed top-20 right-4 z-50 px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg"
          style={{
            backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-xs font-medium text-white">{message.text}</span>
        </div>
      )}

      <Link
        to="/accounts"
        className="vault-card flex items-center justify-between hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--vault-nav-active-bg)' }}>
            <CreditCard className="w-5 h-5" style={{ color: 'var(--vault-primary)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold vault-heading">账户管理</h2>
            <p className="text-xs vault-muted">就地添加/编辑 · 分类下点「添加」填写完整信息</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 vault-muted" />
      </Link>

      {/* Data Management */}
      <div className="vault-card">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--vault-text)' }}>数据管理</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <button onClick={handleExportJson} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
            <Download className="w-3.5 h-3.5" />导出 JSON
          </button>
          <button onClick={handleExportAccountsCsv} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
            <Download className="w-3.5 h-3.5" />账户 CSV
          </button>
          <button onClick={handleExportTransactionsCsv} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
            <Download className="w-3.5 h-3.5" />交易 CSV
          </button>
          <button onClick={() => setShowImportForm(!showImportForm)} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
            <Upload className="w-3.5 h-3.5" />导入 JSON
          </button>
          <button onClick={() => handleImportAccountsCsv('merge')} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
            <Upload className="w-3.5 h-3.5" />CSV 合并
          </button>
          <button onClick={() => handleImportAccountsCsv('overwrite')} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
            <Upload className="w-3.5 h-3.5" />CSV 覆盖
          </button>
          <button onClick={() => setShowLoadDemoConfirm(true)} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
            <Sparkles className="w-3.5 h-3.5" />加载示例
          </button>
          <button onClick={() => setShowResetSettingsConfirm(true)} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>
            <RotateCcw className="w-3.5 h-3.5" />恢复默认设置
          </button>
          <button onClick={() => setShowClearTxConfirm(true)} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--vault-yellow, #F59E0B)' }}>
            <Trash2 className="w-3.5 h-3.5" />清空所有记账
          </button>
          <button onClick={() => setShowResetConfirm(true)} className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs font-medium transition-colors sm:col-span-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--vault-red)' }}>
            <RotateCcw className="w-3.5 h-3.5" />清空全部数据
          </button>
        </div>

        <p className="text-[10px] vault-muted mt-3">
          「恢复默认设置」重置偏好；「清空所有记账」回滚未盘点的手工流水，保留盘点；「清空全部数据」清空当前资产账本，不涉及已暂停的小镇数据。
        </p>

        {/* Import Form */}
        {showImportForm && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2 mb-2">
              <button onClick={() => setImportMode('overwrite')} className="px-3 py-1 rounded text-xs" style={{ backgroundColor: importMode === 'overwrite' ? 'var(--vault-primary)' : 'var(--vault-border)', color: importMode === 'overwrite' ? '#fff' : 'var(--vault-text-secondary)' }}>覆盖</button>
              <button onClick={() => setImportMode('merge')} className="px-3 py-1 rounded text-xs" style={{ backgroundColor: importMode === 'merge' ? 'var(--vault-primary)' : 'var(--vault-border)', color: importMode === 'merge' ? '#fff' : 'var(--vault-text-secondary)' }}>合并</button>
            </div>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              className="w-full h-32 rounded-lg px-3 py-2 text-xs border outline-none font-mono resize-none"
              style={{ ...inputStyle, color: 'var(--vault-text)' }}
              placeholder='{"accounts":[...],"transactions":[...],...}'
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleImportJson} className="flex-1 py-2 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: 'var(--vault-primary)' }}>导入</button>
              <button onClick={() => { setShowImportForm(false); setImportText(''); }} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}>取消</button>
            </div>
          </div>
        )}

        {/* Reset Confirmation */}
        {showResetConfirm && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: '#EF4444' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--vault-text)' }}>确定要清空所有数据吗？</p>
                <p className="text-xs mt-1" style={{ color: 'var(--vault-text-secondary)' }}>
                  这将删除你所有的账户、交易记录、预算、目标、盘点历史及未来计划，回到首次使用的空状态。请先导出 JSON 备份。
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: '#EF4444' }}
              >
                确认清空
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {showLoadDemoConfirm && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--vault-primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--vault-primary) 30%, transparent)' }}>
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="w-4 h-4 mt-0.5" style={{ color: 'var(--vault-primary)' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--vault-text)' }}>加载示例数据？</p>
                <p className="text-xs mt-1" style={{ color: 'var(--vault-text-secondary)' }}>
                  将填入演示用的账户、交易和预算数据，方便体验完整功能。你现有的数据会被覆盖。
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLoadDemo}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: 'var(--vault-primary)' }}
              >
                确认加载
              </button>
              <button
                onClick={() => setShowLoadDemoConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--vault-border)', color: 'var(--vault-text-secondary)' }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {showResetSettingsConfirm && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--vault-nav-active-bg)', border: '1px solid var(--vault-border)' }}>
            <p className="text-xs font-medium vault-heading mb-1">恢复默认设置？</p>
            <p className="text-xs vault-muted mb-3">重置主币种、汇率、图表单位、资产基准日等偏好。账户和记账记录不会删除。</p>
            <div className="flex gap-2">
              <button onClick={handleResetSettings} className="px-4 py-2 rounded-lg text-xs font-medium text-white vault-btn-primary">确认恢复</button>
              <button onClick={() => setShowResetSettingsConfirm(false)} className="px-4 py-2 rounded-lg text-xs vault-muted" style={{ backgroundColor: 'var(--vault-border)' }}>取消</button>
            </div>
          </div>
        )}

        {showClearTxConfirm && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <p className="text-xs font-medium vault-heading mb-1">清空所有记账？</p>
            <p className="text-xs vault-muted mb-3">
              将删除 {data.transactions.length} 条交易记录（含导入流水）。账户余额保持不变，可重新导入账单。
            </p>
            <div className="flex gap-2">
              <button onClick={handleClearTransactions} className="px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#F59E0B' }}>确认清空记账</button>
              <button onClick={() => setShowClearTxConfirm(false)} className="px-4 py-2 rounded-lg text-xs vault-muted" style={{ backgroundColor: 'var(--vault-border)' }}>取消</button>
            </div>
          </div>
        )}
      </div>
      <div className="vault-card">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--vault-text)' }}>关于</h2>
        <div className="space-y-2 text-xs" style={{ color: 'var(--vault-text-secondary)' }}>
          <p className="flex justify-between"><span>应用名称</span><span style={{ color: 'var(--vault-text)' }}>数源 · VaultFlow</span></p>
          <p className="flex justify-between"><span>版本</span><span style={{ color: 'var(--vault-text)' }}>v{__APP_VERSION__}</span></p>
          <p className="flex justify-between"><span>数据存储</span><span style={{ color: 'var(--vault-text)' }}>{isElectron() ? '本地文件 (Documents/VaultFlow)' : '浏览器 localStorage'}</span></p>
        </div>
        <div className="mt-4 pt-4 border-t flex items-start gap-3" style={{ borderColor: 'var(--vault-border)' }}>
          <Mail className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--vault-primary)' }} />
          <div>
            <p className="text-xs font-medium vault-heading mb-1">反馈与建议</p>
            <p className="text-[10px] vault-muted mb-2">遇到 Bug 或有功能想法，欢迎发邮件</p>
            <a
              href="mailto:Freya123456@foxmail.com?subject=VaultFlow%20反馈"
              className="text-xs font-mono underline-offset-2 hover:underline"
              style={{ color: 'var(--vault-primary)' }}
            >
              Freya123456@foxmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
