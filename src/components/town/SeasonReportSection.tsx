import { Download, Share2, FileText } from 'lucide-react';
import type { SeasonQuarterReport } from '@/lib/explore-ecology-ext';
import type { DomainRadarPoint } from '@/lib/explore-ecology-ext';
import { exportSeasonReportAsPng } from '@/lib/explore-ecology-ext';
import { exportSeasonReportPdf } from '@/lib/season-pdf-export';

interface SeasonReportSectionProps {
  cityName: string;
  report: SeasonQuarterReport;
  radar: DomainRadarPoint[];
  adventurerName?: string;
  highlightSnippets?: string[];
}

export default function SeasonReportSection({
  cityName,
  report,
  radar,
  adventurerName,
  highlightSnippets,
}: SeasonReportSectionProps) {
  const handleExportPng = () => {
    void exportSeasonReportAsPng(report, cityName);
  };

  const handleExportPdf = () => {
    exportSeasonReportPdf(cityName, report, radar, { adventurerName, highlightSnippets });
  };

  const handleShare = async () => {
    const text = `${report.quarterLabel} ${cityName}人生生态\n${report.narrative}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${cityName}生态报告`, text });
        return;
      } catch {
        /* fallback */
      }
    }
    await navigator.clipboard.writeText(text);
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3 season-report-section"
      style={{ background: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold" style={{ color: 'var(--rpg-text)' }}>
          季节叙事 · {report.quarterLabel}
        </h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="season-report-btn" onClick={handleExportPng}>
            <Download className="w-3.5 h-3.5" /> 导出 PNG
          </button>
          <button type="button" className="season-report-btn" onClick={handleExportPdf}>
            <FileText className="w-3.5 h-3.5" /> 导出 PDF
          </button>
          <button type="button" className="season-report-btn" onClick={() => void handleShare()}>
            <Share2 className="w-3.5 h-3.5" /> 分享
          </button>
        </div>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--rpg-text)' }}>
        {report.narrative}
      </p>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="season-report-chip">平衡 {report.balanceScore}</span>
        <span className="season-report-chip">领先 {report.topDomain}</span>
        <span className="season-report-chip">回忆 {report.memoryCount}</span>
        <span className="season-report-chip">账单 {report.billCount}</span>
      </div>
      {report.highlights.length > 0 && (
        <ul className="text-xs space-y-1" style={{ color: 'var(--rpg-text-secondary)' }}>
          {report.highlights.map(h => (
            <li key={h}>· {h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
