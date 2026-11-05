import { jsPDF } from 'jspdf';
import type { SeasonQuarterReport } from '@/lib/explore-ecology-ext';
import type { DomainRadarPoint } from '@/lib/explore-ecology-ext';

export interface SeasonPdfBranding {
  adventurerName?: string;
  highlightSnippets?: string[];
}

function drawRadarOnPdf(
  doc: jsPDF,
  radar: DomainRadarPoint[],
  x: number,
  y: number,
  radius: number,
) {
  if (radar.length === 0) return;
  const max = Math.max(...radar.map(d => d.fullMark), 1);
  const n = radar.length;
  const angleStep = (Math.PI * 2) / n;

  const toPoint = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / max) * radius;
    return { px: x + Math.cos(angle) * r, py: y + Math.sin(angle) * r };
  };

  doc.setDrawColor(200, 200, 200);
  for (let ring = 1; ring <= 3; ring++) {
    const rr = (radius * ring) / 3;
    doc.circle(x, y, rr, 'S');
  }

  doc.setDrawColor(245, 166, 35);
  const prevPts = radar.map((d, i) => toPoint(d.previous, i));
  doc.moveTo(prevPts[0].px, prevPts[0].py);
  prevPts.slice(1).forEach(p => doc.lineTo(p.px, p.py));
  doc.lineTo(prevPts[0].px, prevPts[0].py);
  doc.stroke();

  doc.setDrawColor(76, 175, 80);
  const curPts = radar.map((d, i) => toPoint(d.current, i));
  doc.moveTo(curPts[0].px, curPts[0].py);
  curPts.slice(1).forEach(p => doc.lineTo(p.px, p.py));
  doc.lineTo(curPts[0].px, curPts[0].py);
  doc.stroke();

  doc.setFontSize(8);
  doc.setTextColor(93, 64, 55);
  radar.forEach((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const lx = x + Math.cos(angle) * (radius + 12);
    const ly = y + Math.sin(angle) * (radius + 12);
    doc.text(d.domain, lx - 6, ly);
  });
}

export function exportSeasonReportPdf(
  cityName: string,
  report: SeasonQuarterReport,
  radar: DomainRadarPoint[],
  branding?: SeasonPdfBranding,
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = margin;

  doc.setFillColor(255, 249, 245);
  doc.rect(0, 0, 595, 140, 'F');
  doc.setDrawColor(255, 183, 197);
  doc.setLineWidth(2);
  doc.line(margin, 130, 547, 130);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(78, 52, 46);
  doc.text(`${cityName}`, margin, y + 28);
  doc.setFontSize(14);
  doc.setTextColor(141, 110, 99);
  doc.text('人生生态季节报告', margin, y + 48);
  doc.setFontSize(11);
  doc.text(`${report.quarterLabel} · 平衡 ${report.balanceScore}`, margin, y + 68);
  if (branding?.adventurerName) {
    doc.text(`冒险者 ${branding.adventurerName}`, margin, y + 86);
  }
  y = 150;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(78, 52, 46);
  const lines = doc.splitTextToSize(report.narrative, 500);
  doc.text(lines, margin, y);
  y += lines.length * 14 + 16;

  if (branding?.highlightSnippets?.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('精选回声', margin, y);
    y += 14;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    branding.highlightSnippets.slice(0, 2).forEach(snippet => {
      const sl = doc.splitTextToSize(`「${snippet}」`, 480);
      doc.text(sl, margin + 8, y);
      y += sl.length * 11 + 6;
    });
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('五域平衡雷达（本月 vs 上月）', margin, y);
  y += 12;
  drawRadarOnPdf(doc, radar, margin + 120, y + 90, 72);
  y += 200;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`回忆 ${report.memoryCount} 条 · 账单 ${report.billCount} 笔 · 领先 ${report.topDomain}`, margin, y);
  y += 16;

  report.highlights.forEach(h => {
    doc.text(`· ${h}`, margin + 8, y);
    y += 12;
  });

  doc.setFontSize(9);
  doc.setTextColor(141, 110, 99);
  doc.text('VaultFlow 人生小系统 · 账单窥见现实 · 自述补充回忆', margin, 820);

  doc.save(`${cityName}-${report.quarterLabel}-生态报告.pdf`);
}
