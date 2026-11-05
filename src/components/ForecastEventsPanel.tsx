import { useId, useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { formatCurrency, getToday } from '@/lib/storage';
import { FORECAST_FREQUENCY_LABELS } from '@/lib/forecast';
import type { ForecastFrequency } from '@/types';

const inputStyle = {
  backgroundColor: 'var(--vault-input-bg)',
  borderColor: 'var(--vault-border)',
  color: 'var(--vault-text)',
};

export function ForecastEventsPanel() {
  const { data, settings, addForecastEvent, updateForecastEvent, deleteForecastEvent } = useVaultData();
  const events = data.forecastEvents ?? [];
  const formId = useId();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    amount: '',
    frequency: 'monthly' as ForecastFrequency,
    startDate: getToday(),
    endDate: '',
  });

  const handleAdd = () => {
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0 || !form.startDate || (form.endDate && form.endDate < form.startDate)) {
      setError('请填写名称、正数金额和有效日期；结束日期不能早于开始日期'); return;
    }
    setError('');
    addForecastEvent({
      name: form.name.trim(),
      type: form.type,
      amount,
      frequency: form.frequency,
      startDate: form.startDate,
      endDate: form.endDate || null,
      enabled: true,
    });
    setForm({ name: '', type: 'expense', amount: '', frequency: 'monthly', startDate: getToday(), endDate: '' });
    setShowForm(false);
  };

  return (
    <div className="vault-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold vault-heading">资产预测事件</h2>
          <p className="text-xs mt-0.5 vault-muted">未来收入/支出计划 · 金额使用 {settings.baseCurrency} · 不计入真实余额</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white vault-btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />添加
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 rounded-lg space-y-3" style={{ backgroundColor: 'var(--vault-input-bg)', border: '1px solid var(--vault-border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-name`} className="text-xs block mb-1 vault-muted">名称</label>
              <input id={`${formId}-name`} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-xs border outline-none" style={inputStyle} placeholder="如：年终奖" />
            </div>
            <div>
              <label htmlFor={`${formId}-amount`} className="text-xs block mb-1 vault-muted">金额</label>
              <input type="number" id={`${formId}-amount`} value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono" style={inputStyle} placeholder="5000" />
            </div>
            <div>
              <label htmlFor={`${formId}-type`} className="text-xs block mb-1 vault-muted">类型</label>
              <select id={`${formId}-type`} value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))} className="w-full rounded-lg px-3 py-2 text-xs border outline-none" style={inputStyle}>
                <option value="income">收入</option>
                <option value="expense">支出</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${formId}-frequency`} className="text-xs block mb-1 vault-muted">频率</label>
              <select id={`${formId}-frequency`} value={form.frequency} onChange={e => setForm(prev => ({ ...prev, frequency: e.target.value as ForecastFrequency }))} className="w-full rounded-lg px-3 py-2 text-xs border outline-none" style={inputStyle}>
                {Object.entries(FORECAST_FREQUENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${formId}-startDate`} className="text-xs block mb-1 vault-muted">开始日期</label>
              <input type="date" id={`${formId}-startDate`} value={form.startDate} onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} onInput={e => { const value = e.currentTarget.value; setForm(prev => ({ ...prev, startDate: value })); }} className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono" style={inputStyle} />
            </div>
            <div>
              <label htmlFor={`${formId}-endDate`} className="text-xs block mb-1 vault-muted">结束日期（可选）</label>
              <input type="date" id={`${formId}-endDate`} value={form.endDate} onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} onInput={e => { const value = e.currentTarget.value; setForm(prev => ({ ...prev, endDate: value })); }} className="w-full rounded-lg px-3 py-2 text-xs border outline-none font-mono" style={inputStyle} />
            </div>
          </div>
          {error && <p role="alert" className="text-xs" style={{ color: 'var(--vault-red)' }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2 rounded-lg text-xs font-medium text-white vault-btn-primary">保存</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs vault-muted" style={{ backgroundColor: 'var(--vault-border)' }}>取消</button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-xs vault-muted text-center py-4">暂无预测事件，添加后可在「资产趋势」查看虚线预测</p>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--vault-input-bg)', border: '1px solid var(--vault-border)' }}>
              <div>
                <p className="text-xs vault-heading">{ev.name}</p>
                <p className="text-[10px] vault-muted">
                  {FORECAST_FREQUENCY_LABELS[ev.frequency]} · {ev.startDate}
                  {ev.endDate ? ` → ${ev.endDate}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold" style={{ color: ev.type === 'income' ? 'var(--vault-accent)' : 'var(--vault-red)' }}>
                  {ev.type === 'income' ? '+' : '-'}{formatCurrency(ev.amount, settings.baseCurrency)}
                </span>
                <button aria-label={`${ev.enabled ? '暂停' : '启用'}${ev.name}`} onClick={() => updateForecastEvent(ev.id, { enabled: !ev.enabled })} className="p-1">
                  {ev.enabled
                    ? <ToggleRight className="w-4 h-4" style={{ color: 'var(--vault-accent)' }} />
                    : <ToggleLeft className="w-4 h-4" style={{ color: 'var(--vault-text-secondary)' }} />}
                </button>
                <button aria-label={`删除${ev.name}`} onClick={() => { if (confirm(`删除「${ev.name}」？`)) deleteForecastEvent(ev.id); }} className="p-1">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--vault-text-secondary)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
