import { useState } from 'react';
import { Share2, X } from 'lucide-react';
import type { SeasonQuarterReport } from '@/lib/explore-ecology-ext';
import { shareSeasonNarrative } from '@/lib/season-auto-share';

interface SeasonSharePreviewCardProps {
  cityName: string;
  report: SeasonQuarterReport;
  onClose: () => void;
  onDone: (result: 'shared' | 'copied' | 'skipped') => void;
}

export default function SeasonSharePreviewCard({
  cityName,
  report,
  onClose,
  onDone,
}: SeasonSharePreviewCardProps) {
  const [busy, setBusy] = useState(false);
  const [narrative, setNarrative] = useState(report.narrative);
  const header = `${report.quarterLabel} · ${cityName}人生生态\n平衡 ${report.balanceScore} 分`;

  const handleShare = async () => {
    setBusy(true);
    const result = await shareSeasonNarrative(cityName, report, narrative);
    setBusy(false);
    onDone(result);
    onClose();
  };

  return (
    <div className="season-share-preview-backdrop" role="dialog" aria-modal="true">
      <div className="season-share-preview-card">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>
            季末分享预览
          </h3>
          <button type="button" className="p-1 rounded" onClick={onClose} aria-label="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] mb-2 whitespace-pre-wrap" style={{ color: 'var(--rpg-text-secondary)' }}>
          {header}
        </p>
        <label className="text-[10px] block mb-1" style={{ color: 'var(--rpg-text-secondary)' }}>
          叙事（可编辑后再分享）
        </label>
        <textarea
          value={narrative}
          onChange={e => setNarrative(e.target.value)}
          rows={6}
          className="w-full rounded-lg p-3 text-xs leading-relaxed resize-y"
          style={{ background: 'var(--rpg-bg)', border: '1px solid var(--rpg-border)', color: 'var(--rpg-text)' }}
        />
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            className="season-report-btn"
            disabled={busy || !narrative.trim()}
            onClick={() => void handleShare()}
          >
            <Share2 className="w-3.5 h-3.5" /> 分享 / 复制
          </button>
          <button type="button" className="season-report-btn" onClick={onClose}>
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}
