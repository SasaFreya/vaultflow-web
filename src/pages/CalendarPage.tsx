import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  ChevronLeft, ChevronRight, Wallet, Pencil,
  CreditCard, CircleDollarSign, PiggyBank, Bell, type LucideIcon,
} from 'lucide-react';
import { useVaultData } from '@/hooks/useVaultData';
import { formatCurrency, getCalendarEventsForMonth } from '@/lib/storage';
import { projectNetWorthThroughEndOfMonth, resolveCalendarTemplateId } from '@/lib/calendar-projection';
import type { CalendarEvent } from '@/types';

const eventTypeConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  salary: { label: '收入', color: '#10B981', icon: CircleDollarSign },
  repayment: { label: '还款', color: '#EF4444', icon: CreditCard },
  expense: { label: '支出', color: '#8B5CF6', icon: Wallet },
  reminder: { label: '提醒', color: '#F59E0B', icon: Bell },
};

const CALENDAR_GRID = 'grid grid-cols-7 gap-1';
const inputClass = 'w-full rounded-lg px-3 py-2 text-xs border outline-none focus:ring-1 vault-heading';
const inputStyle = { backgroundColor: 'var(--vault-input-bg)', borderColor: 'var(--vault-border)' } as const;

const emptyForm: Partial<CalendarEvent> = {
  title: '',
  type: 'reminder',
  amount: 0,
  description: '',
  recurring: false,
};

export default function CalendarPage() {
  const { data, totals, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = useVaultData();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<Partial<CalendarEvent>>(emptyForm);

  const monthStart = currentDate.startOf('month');
  const monthEnd = currentDate.endOf('month');
  const startDay = monthStart.day();
  const daysInMonth = monthEnd.date();

  const monthEvents = useMemo(() => {
    const monthStr = currentDate.format('YYYY-MM');
    return getCalendarEventsForMonth(data.calendarEvents, monthStr);
  }, [data.calendarEvents, currentDate]);

  const getEventsForDay = (day: number) => {
    const dateStr = currentDate.format(`YYYY-MM-${String(day).padStart(2, '0')}`);
    return monthEvents.filter(e => e.date === dateStr);
  };

  const isToday = (day: number) =>
    currentDate.format('YYYY-MM') === dayjs().format('YYYY-MM') && day === dayjs().date();

  const upcomingTotal = monthEvents.reduce((sum, e) => {
    if (e.type === 'repayment' || e.type === 'expense') return sum + (e.amount || 0);
    return sum;
  }, 0);

  const upcomingIncome = monthEvents.reduce((sum, e) => {
    if (e.type === 'salary') return sum + (e.amount || 0);
    return sum;
  }, 0);

  const projectedNetWorth = projectNetWorthThroughEndOfMonth(totals.netWorth, data.calendarEvents);

  const handlePrevMonth = () => setCurrentDate(d => d.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(d => d.add(1, 'month'));
  const handleToday = () => setCurrentDate(dayjs());

  const closeForm = () => {
    setFormMode(null);
    setSelectedDate(null);
    setEditingTemplateId(null);
    setEventForm(emptyForm);
  };

  const openAddForm = (dateStr: string) => {
    setSelectedDate(dateStr);
    setFormMode('add');
    setEditingTemplateId(null);
    setEventForm(emptyForm);
  };

  const openEditForm = (event: CalendarEvent) => {
    const templateId = resolveCalendarTemplateId(event);
    if (!templateId) return;
    const template = data.calendarEvents.find(e => e.id === templateId) ?? event;
    setFormMode('edit');
    setEditingTemplateId(templateId);
    setSelectedDate(template.date);
    setEventForm({
      title: template.title,
      type: template.type,
      amount: template.amount ?? 0,
      description: template.description ?? '',
      recurring: template.recurring,
      date: template.date,
    });
  };

  const handleSaveEvent = () => {
    if (!eventForm.title?.trim()) return;
    const type = (eventForm.type as CalendarEvent['type']) || 'reminder';
    const payload = {
      title: eventForm.title.trim(),
      type,
      amount: eventForm.amount || 0,
      description: eventForm.description || '',
      recurring: eventForm.recurring || false,
      color: eventTypeConfig[type].color,
    };

    if (formMode === 'edit' && editingTemplateId) {
      updateCalendarEvent(editingTemplateId, {
        ...payload,
        date: eventForm.date || selectedDate || data.calendarEvents.find(e => e.id === editingTemplateId)?.date || '',
      });
    } else if (formMode === 'add' && selectedDate) {
      addCalendarEvent({ ...payload, date: selectedDate });
    } else {
      return;
    }
    closeForm();
  };

  const handleDeleteEditing = () => {
    if (!editingTemplateId) return;
    deleteCalendarEvent(editingTemplateId);
    closeForm();
  };

  const handleDayClick = (day: number) => {
    openAddForm(currentDate.format(`YYYY-MM-${String(day).padStart(2, '0')}`));
  };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const isEditingRecurring = formMode === 'edit' && Boolean(eventForm.recurring);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold vault-heading">现金流日历</h1>
          <p className="text-sm mt-1 vault-muted">未来事件仅用于提醒与预测，不计入实际账本净资产</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handlePrevMonth} className="p-2 rounded-lg hover:opacity-80 transition-colors">
            <ChevronLeft className="w-4 h-4 vault-muted" />
          </button>
          <span className="text-sm font-semibold vault-heading min-w-[100px] text-center">
            {currentDate.format('YYYY年 M月')}
          </span>
          <button type="button" onClick={handleNextMonth} className="p-2 rounded-lg hover:opacity-80 transition-colors">
            <ChevronRight className="w-4 h-4 vault-muted" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--vault-nav-active-bg)', color: 'var(--vault-primary)' }}
          >
            今天
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="text-xs vault-muted">预计收入</span>
          </div>
          <p className="text-lg font-bold font-mono vault-heading" style={{ color: 'var(--vault-accent)' }}>
            {formatCurrency(upcomingIncome)}
          </p>
        </div>
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" style={{ color: 'var(--vault-red)' }} />
            <span className="text-xs vault-muted">预计支出</span>
          </div>
          <p className="text-lg font-bold font-mono" style={{ color: 'var(--vault-red)' }}>
            {formatCurrency(upcomingTotal)}
          </p>
        </div>
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4" style={{ color: 'var(--vault-primary)' }} />
            <span className="text-xs vault-muted">本月预计结余</span>
          </div>
          <p className="text-lg font-bold font-mono" style={{ color: upcomingIncome - upcomingTotal >= 0 ? 'var(--vault-accent)' : 'var(--vault-red)' }}>
            {formatCurrency(upcomingIncome - upcomingTotal)}
          </p>
        </div>
        <div className="vault-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendIcon />
            <span className="text-xs vault-muted">预计净资产（至月底）</span>
          </div>
          <p className="text-lg font-bold font-mono vault-heading">{formatCurrency(projectedNetWorth)}</p>
          <p className="text-[10px] vault-muted mt-1">当前 {formatCurrency(totals.netWorth)} + 未来事件</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 vault-card">
          <div className={CALENDAR_GRID}>
            {weekDays.map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-xs font-medium vault-muted">
                {day}
              </div>
            ))}
          </div>

          <div className={`${CALENDAR_GRID} mt-1`}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square min-h-[2.5rem]" />;
              }

              const events = getEventsForDay(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className="aspect-square min-h-[2.5rem] rounded-lg p-1 flex flex-col items-center transition-all hover:opacity-90 relative"
                  style={{
                    backgroundColor: today ? 'var(--vault-nav-active-bg)' : 'transparent',
                    boxShadow: today ? 'inset 0 0 0 1px var(--vault-primary)' : 'none',
                  }}
                >
                  <span
                    className="text-xs font-medium leading-none"
                    style={{ color: today ? 'var(--vault-primary)' : 'var(--vault-text)' }}
                  >
                    {day}
                  </span>
                  {events.length > 0 && (
                    <div className="flex flex-col gap-0.5 w-full mt-1 px-0.5">
                      {events.slice(0, 3).map((e, i) => (
                        <div
                          key={i}
                          className="w-full h-1 rounded-full shrink-0"
                          style={{ backgroundColor: e.color || eventTypeConfig[e.type].color }}
                        />
                      ))}
                      {events.length > 3 && (
                        <span className="text-[8px] vault-muted text-center">+{events.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'var(--vault-border)' }}>
            {Object.entries(eventTypeConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                <span className="text-[10px] vault-muted">{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          {formMode && selectedDate && (
            <div className="vault-card">
              <h3 className="text-sm font-semibold vault-heading mb-1">
                {formMode === 'edit' ? '编辑事件' : '添加事件'} · {selectedDate}
              </h3>
              {isEditingRecurring && (
                <p className="text-[10px] vault-muted mb-3">此为每月重复事件，修改将影响所有未来月份</p>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-xs block mb-1 vault-muted">标题</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="事件名称"
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1 vault-muted">类型</label>
                  <select
                    value={eventForm.type}
                    onChange={e => setEventForm({ ...eventForm, type: e.target.value as CalendarEvent['type'] })}
                    className={inputClass}
                    style={inputStyle}
                  >
                    {Object.entries(eventTypeConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1 vault-muted">金额</label>
                  <input
                    type="number"
                    value={eventForm.amount || ''}
                    onChange={e => setEventForm({ ...eventForm, amount: parseFloat(e.target.value) || 0 })}
                    className={`${inputClass} font-mono`}
                    style={inputStyle}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1 vault-muted">备注</label>
                  <input
                    type="text"
                    value={eventForm.description || ''}
                    onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="可选"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={eventForm.recurring}
                    onChange={e => setEventForm({ ...eventForm, recurring: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="recurring" className="text-xs vault-muted">每月重复</label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEvent}
                    className="flex-1 py-2 rounded-lg text-xs font-medium text-white vault-btn-primary"
                  >
                    {formMode === 'edit' ? '保存修改' : '添加'}
                  </button>
                  {formMode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleDeleteEditing}
                      className="px-3 py-2 rounded-lg text-xs border"
                      style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-red)' }}
                    >
                      删除
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 rounded-lg text-xs font-medium vault-muted border"
                    style={{ borderColor: 'var(--vault-border)' }}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="vault-card">
            <h3 className="text-sm font-semibold vault-heading mb-3">本月事件</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {monthEvents.length === 0 && (
                <p className="text-xs text-center py-4 vault-muted">本月暂无事件</p>
              )}
              {monthEvents
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(event => {
                  const config = eventTypeConfig[event.type];
                  const Icon = config.icon;
                  const isVirtual = event.id.startsWith('virtual-');
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEditForm(event)}
                      className="w-full flex items-center justify-between py-2 border-b last:border-0 text-left hover:opacity-90 transition-opacity"
                      style={{ borderColor: 'var(--vault-border)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${event.color || config.color}20` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: event.color || config.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs vault-heading truncate">{event.title}</p>
                          <p className="text-[10px] font-mono vault-muted">{event.date.slice(8)}日</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {event.amount ? (
                          <span
                            className="text-xs font-mono font-semibold"
                            style={{ color: event.type === 'salary' ? 'var(--vault-accent)' : 'var(--vault-red)' }}
                          >
                            {formatCurrency(event.amount)}
                          </span>
                        ) : null}
                        {isVirtual ? (
                          <span
                            className="text-[9px] px-1 rounded"
                            style={{ backgroundColor: 'var(--vault-nav-active-bg)', color: 'var(--vault-primary)' }}
                          >
                            重复
                          </span>
                        ) : (
                          <Pencil className="w-3 h-3 vault-muted" />
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="vault-card">
            <h3 className="text-sm font-semibold vault-heading mb-3">财务健康度</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="vault-muted">还款压力</span>
                  <span className="font-mono" style={{ color: upcomingTotal > upcomingIncome * 0.5 ? 'var(--vault-red)' : 'var(--vault-accent)' }}>
                    {upcomingIncome > 0 ? ((upcomingTotal / upcomingIncome) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--vault-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((upcomingTotal / Math.max(upcomingIncome, 1)) * 100, 100)}%`,
                      backgroundColor: upcomingTotal > upcomingIncome * 0.5 ? 'var(--vault-red)' : 'var(--vault-accent)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="var(--vault-primary)" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
