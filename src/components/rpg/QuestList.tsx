import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Swords, Trash2, X } from 'lucide-react';
import type { Quest, QuestDifficulty } from '@/types/rpg';
import { canCompleteQuest, questTaskProgress } from '@/lib/rpg';
import { useLifeRPG } from '@/hooks/useLifeRPG';
import RPGProgressBar from './RPGProgressBar';

const DIFFICULTY_STYLE: Record<QuestDifficulty, { label: string; color: string }> = {
  normal: { label: '普通', color: '#94A3B8' },
  hard: { label: '困难', color: '#F59E0B' },
  epic: { label: '史诗', color: '#A855F7' },
};

function QuestCard({ quest }: { quest: Quest }) {
  const {
    completeQuest,
    updateQuest,
    deleteQuest,
    addQuestTask,
    toggleQuestTask,
    deleteQuestTask,
  } = useLifeRPG();
  const [expanded, setExpanded] = useState(quest.tasks.length > 0);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(quest.title);
  const [newTask, setNewTask] = useState('');
  const progress = questTaskProgress(quest);
  const completable = canCompleteQuest(quest);

  const saveEdit = () => {
    if (titleDraft.trim()) updateQuest(quest.id, { title: titleDraft.trim() });
    setEditing(false);
  };

  return (
    <li
      className="p-3 rounded-xl space-y-2"
      style={{ backgroundColor: 'var(--rpg-bg)' }}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => completable && completeQuest(quest.id)}
          disabled={!completable}
          title={completable ? '完成副本' : '请先完成所有子任务'}
          className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
          style={{
            border: `2px solid ${completable ? 'var(--rpg-accent)' : 'var(--rpg-border)'}`,
            backgroundColor: completable ? 'var(--rpg-accent)' : 'transparent',
            color: '#fff',
          }}
        >
          {completable && <Check className="w-3 h-3" />}
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
            <p className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>{quest.title}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${DIFFICULTY_STYLE[quest.difficulty].color}22`, color: DIFFICULTY_STYLE[quest.difficulty].color }}
            >
              {DIFFICULTY_STYLE[quest.difficulty].label}
            </span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--rpg-gold, #FFD700)' }}>
              +{quest.expReward} EXP · +{quest.goldReward} 🪙
            </span>
            {quest.tasks.length > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--rpg-text-secondary)' }}>
                {progress.done}/{progress.total} 子任务
              </span>
            )}
          </div>

          {quest.tasks.length > 0 && (
            <div className="mt-2">
              <RPGProgressBar label="" value={progress.done} max={progress.total || 1} color="var(--rpg-primary)" showValues={false} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button type="button" onClick={() => setExpanded(v => !v)} className="p-1 rounded opacity-60 hover:opacity-100" style={{ color: 'var(--rpg-text-secondary)' }}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button type="button" onClick={() => { setTitleDraft(quest.title); setEditing(true); }} className="p-1 rounded opacity-60 hover:opacity-100" style={{ color: 'var(--rpg-text-secondary)' }}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => deleteQuest(quest.id)} className="p-1 rounded opacity-60 hover:opacity-100" style={{ color: '#EF4444' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pl-7 space-y-1.5 border-t pt-2" style={{ borderColor: 'var(--rpg-border)' }}>
          {quest.tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 group">
              <button
                type="button"
                onClick={() => toggleQuestTask(quest.id, task.id)}
                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[10px]"
                style={{
                  backgroundColor: task.completed ? 'var(--rpg-primary)' : 'transparent',
                  border: '1.5px solid var(--rpg-border)',
                  color: '#fff',
                }}
              >
                {task.completed ? '✓' : ''}
              </button>
              <span
                className={`flex-1 text-xs ${task.completed ? 'line-through opacity-50' : ''}`}
                style={{ color: 'var(--rpg-text)' }}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => deleteQuestTask(quest.id, task.id)}
                className="opacity-0 group-hover:opacity-60 p-0.5"
                style={{ color: '#EF4444' }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <div className="flex gap-1 pt-1">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder="添加子任务…"
              className="flex-1 px-2 py-1 rounded text-xs outline-none"
              style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)', color: 'var(--rpg-text)' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTask.trim()) {
                  addQuestTask(quest.id, newTask);
                  setNewTask('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => { if (newTask.trim()) { addQuestTask(quest.id, newTask); setNewTask(''); } }}
              className="px-2 py-1 rounded text-xs"
              style={{ backgroundColor: 'var(--rpg-primary)', color: '#fff' }}
            >
              +
            </button>
          </div>

          <div className="flex gap-1 pt-1">
            {(['normal', 'hard', 'epic'] as QuestDifficulty[]).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => updateQuest(quest.id, { difficulty: d })}
                className="flex-1 py-1 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: quest.difficulty === d ? DIFFICULTY_STYLE[d].color : 'var(--rpg-border)',
                  color: quest.difficulty === d ? '#fff' : 'var(--rpg-text-secondary)',
                }}
              >
                {DIFFICULTY_STYLE[d].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

export default function QuestList() {
  const { data, addQuest } = useLifeRPG();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('normal');
  const [showForm, setShowForm] = useState(false);

  const active = data.quests.filter(q => !q.completed);
  const done = data.quests.filter(q => q.completed);

  return (
    <div
      id="rpg-section-quests"
      className="rounded-2xl p-5 space-y-4 rpg-panel"
      style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4" style={{ color: 'var(--rpg-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>副本任务</h3>
          <span className="text-xs" style={{ color: 'var(--rpg-text-secondary)' }}>{active.length} 进行中</span>
        </div>
        <button type="button" onClick={() => setShowForm(v => !v)} className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--rpg-primary)', color: '#fff' }}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--rpg-bg)' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="新副本名称…"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--rpg-bg)', border: '1px solid var(--rpg-border)', color: 'var(--rpg-text)' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && title.trim()) {
                addQuest(title, difficulty);
                setTitle('');
                setShowForm(false);
              }
            }}
          />
          <div className="flex gap-2">
            {(['normal', 'hard', 'epic'] as QuestDifficulty[]).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: difficulty === d ? DIFFICULTY_STYLE[d].color : 'var(--rpg-border)',
                  color: difficulty === d ? '#fff' : 'var(--rpg-text-secondary)',
                }}
              >
                {DIFFICULTY_STYLE[d].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {active.map(quest => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
        {active.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--rpg-text-secondary)' }}>
            所有副本已完成！添加新目标继续冒险
          </p>
        )}
      </ul>

      {done.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--rpg-border)' }}>
          <p className="text-[10px] mb-2 uppercase tracking-wider" style={{ color: 'var(--rpg-text-secondary)', opacity: 0.6 }}>
            已完成 {done.length}
          </p>
          <ul className="space-y-1">
            {done.slice(0, 5).map(q => (
              <li key={q.id} className="text-xs line-through opacity-50" style={{ color: 'var(--rpg-text-secondary)' }}>
                {q.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
