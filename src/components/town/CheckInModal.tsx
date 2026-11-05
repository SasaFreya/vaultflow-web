import { useState } from 'react';
import type { TownLocation } from '@/types/town';
import {
  CHECKIN_DURATIONS,
  computeCheckInRewards,
  type CheckInDuration,
} from '@/lib/town-checkin';

interface CheckInModalProps {
  location: TownLocation;
  actionLabel: string;
  hotspotStory?: string;
  onConfirm: (durationMin: CheckInDuration, note: string) => void;
  onClose: () => void;
}

export default function CheckInModal({
  location,
  actionLabel,
  hotspotStory,
  onConfirm,
  onClose,
}: CheckInModalProps) {
  const [duration, setDuration] = useState<CheckInDuration>(30);
  const [note, setNote] = useState('');
  const preview = computeCheckInRewards(location.category, duration);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(93, 64, 55, 0.35)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5"
        style={{
          background: 'var(--bg-card, #fff)',
          border: '2px solid var(--border-light, #F8E1E4)',
          boxShadow: 'var(--shadow-hover, 0 8px 30px rgba(255, 183, 197, 0.25))',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="checkin-title"
      >
        <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--primary-pink, #FFB7C5)' }}>
          {location.icon} {location.name}
        </p>
        <h2 id="checkin-title" className="text-lg font-bold mb-1" style={{ color: 'var(--aobi-text, #5D4037)' }}>
          {actionLabel}
        </h2>
        {hotspotStory && (
          <p
            className="text-xs italic mb-3 px-3 py-2 rounded-xl"
            style={{
              color: 'var(--aobi-text-secondary, #8D6E63)',
              background: 'color-mix(in srgb, var(--aobi-mint, #B5EAD7) 18%, white)',
              border: '1px solid var(--aobi-mint-deep, #7ECDB8)',
            }}
          >
            「{hotspotStory}」
          </p>
        )}
        <p className="text-xs mb-4" style={{ color: 'var(--aobi-text-secondary, #8D6E63)' }}>
          一次点击 + 可选时长 · 录入 &lt; 10 秒
        </p>

        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary, #5D4037)' }}>
          时长
        </p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CHECKIN_DURATIONS.map(min => (
            <button
              key={min}
              type="button"
              onClick={() => setDuration(min)}
              className="py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
              style={{
                background: duration === min ? 'var(--aobi-action, #FFC857)' : 'var(--aobi-cream, #FFF9F5)',
                color: duration === min ? '#fff' : 'var(--aobi-text-secondary, #8D6E63)',
                border: `2px solid ${duration === min ? 'var(--aobi-action-deep, #F5A623)' : 'var(--aobi-border, #F8E1E4)'}`,
              }}
            >
              {min}分
            </button>
          ))}
        </div>

        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-primary, #5D4037)' }}>
          备注（可选）
        </label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="书名、训练内容…"
          className="w-full mb-4 px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            border: '2px solid var(--border-light, #F8E1E4)',
            background: 'var(--bg-base, #FFF9F5)',
            color: 'var(--text-primary, #5D4037)',
          }}
        />

        <div
          className="rounded-2xl p-3 mb-4 text-xs space-y-1"
          style={{ background: 'var(--bg-pink-soft, #FFF0F3)', color: 'var(--text-secondary, #8D6E63)' }}
        >
          <p className="font-semibold" style={{ color: 'var(--text-primary, #5D4037)' }}>
            预计奖励
          </p>
          {preview.lines.map(line => (
            <p key={line}>{line}</p>
          ))}
          <p className="text-[10px] opacity-80">舒适加成将在确认后叠加</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: 'var(--bg-base, #FFF9F5)',
              color: 'var(--text-secondary, #8D6E63)',
              border: '2px solid var(--border-light, #F8E1E4)',
            }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(duration, note.trim())}
            className="btn-aobi-action flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
          >
            确认打卡 ✨
          </button>
        </div>
      </div>
    </div>
  );
}
