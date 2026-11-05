import { useState } from 'react';
import { Check, Flame, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { getStreakMultiplier, todayStr } from '@/lib/rpg';
import type { Habit } from '@/types/rpg';
import { useLifeRPG } from '@/hooks/useLifeRPG';

const HABIT_ICONS = ['✨', '🔥', '💧', '📖', '🏃', '🧘', '💤', '🎯'];

function HabitCard({ habit }: { habit: Habit }) {
  const { completeHabit, updateHabit, deleteHabit } = useLifeRPG();
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(habit.title);
  const today = todayStr();
  const doneToday = habit.lastCompletedDate === today;
  const multiplier = getStreakMultiplier(habit.streak);

  const saveEdit = () => {
    if (titleDraft.trim()) updateHabit(habit.id, { title: titleDraft.trim() });
    setEditing(false);
  };

  return (
    <li
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{
        backgroundColor: 'var(--rpg-bg)',
        border: doneToday ? '1px solid var(--rpg-accent)' : '1px solid transparent',
        boxShadow: habit.streak >= 7 ? '0 0 12px rgba(245,158,11,0.2)' : undefined,
      }}
    >
      <button
        type="button"
        disabled={doneToday}
        onClick={() => completeHabit(habit.id)}
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-60"
        style={{
          backgroundColor: doneToday ? 'var(--rpg-accent)' : 'var(--rpg-border)',
          color: doneToday ? '#fff' : 'var(--rpg-text-secondary)',
        }}
      >
        {doneToday ? '✓' : (habit.icon ?? '✨')}
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-1">
            <input
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              className="flex-1 px-2 py-1 rounded text-sm outline-none"
              style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-primary)', color: 'var(--rpg-text)' }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button type="button" onClick={saveEdit} style={{ color: 'var(--rpg-accent)' }}><Check className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setEditing(false)} style={{ color: 'var(--rpg-text-secondary)' }}><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium" style={{ color: doneToday ? 'var(--rpg-text-secondary)' : 'var(--rpg-text)' }}>
              {habit.title}
            </p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--rpg-gold, #FFD700)' }}>
              +{Math.round(habit.expReward * multiplier)} EXP
              {multiplier > 1 && ` (${multiplier}x)`}
            </p>
          </>
        )}

        {editing && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {HABIT_ICONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => updateHabit(habit.id, { icon })}
                className="w-7 h-7 rounded text-sm"
                style={{
                  backgroundColor: habit.icon === icon ? 'var(--rpg-primary)' : 'var(--rpg-surface)',
                  border: '1px solid var(--rpg-border)',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {habit.streak > 0 && !editing && (
        <div className="flex items-center gap-0.5 text-xs font-bold" style={{ color: '#F59E0B' }}>
          <Flame className="w-3.5 h-3.5" />
          {habit.streak}
        </div>
      )}

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button type="button" onClick={() => { setTitleDraft(habit.title); setEditing(v => !v); }} className="p-1 rounded opacity-60 hover:opacity-100" style={{ color: 'var(--rpg-text-secondary)' }}>
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => deleteHabit(habit.id)} className="p-1 rounded opacity-60 hover:opacity-100" style={{ color: '#EF4444' }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

export default function HabitList() {
  const { data, addHabit } = useLifeRPG();
  const [title, setTitle] = useState('');
  const [showForm, setShowForm] = useState(false);

  return (
    <div
      id="rpg-section-habits"
      className="rounded-2xl p-5 space-y-4 rpg-panel"
      style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--rpg-accent)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>每日习惯</h3>
        </div>
        <button type="button" onClick={() => setShowForm(v => !v)} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--rpg-accent)', color: '#fff' }}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {showForm && (
        <div className="flex gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="新习惯…"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--rpg-bg)', border: '1px solid var(--rpg-border)', color: 'var(--rpg-text)' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && title.trim()) {
                addHabit(title);
                setTitle('');
                setShowForm(false);
              }
            }}
          />
        </div>
      )}

      <ul className="space-y-2">
        {data.habits.map(habit => (
          <HabitCard key={habit.id} habit={habit} />
        ))}
      </ul>
    </div>
  );
}
