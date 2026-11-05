import { buildRouteTimelineBuckets } from '@/lib/explore-route-trails';
import { buildWeekHeatmapDiff, buildZoneHeatmap } from '@/lib/explore-route-heatmap';

const DOMAIN_LABEL: Record<string, string> = {
  home: '小窝',
  company: '公司',
  library: '图书馆',
  gym: '健身房',
  cafe: '咖啡馆',
};

function labelFor(id: string): string {
  return DOMAIN_LABEL[id] ?? id;
}

export interface RouteShareCard {
  title: string;
  heatSection: string;
  weekSection: string;
  timelineSection: string;
  narrative: string;
}

export function buildRouteShareCard(cityId: string, cityName: string): RouteShareCard {
  const heats = buildZoneHeatmap(cityId);
  const weekDiff = buildWeekHeatmapDiff(cityId);
  const buckets = buildRouteTimelineBuckets(cityId);

  const heatLines = heats
    .sort((a, b) => b.count - a.count)
    .map(h => `  ${labelFor(h.locationId)} ×${h.count}`)
    .join('\n');

  const newSpots = weekDiff.filter(d => d.isNewFrequent).map(d => labelFor(d.locationId));
  const weekLines = weekDiff
    .filter(d => d.thisWeek > 0)
    .map(d => {
      const tag = d.isNewFrequent ? ' 🆕' : d.delta > 0 ? ` (+${d.delta})` : '';
      return `  本周 ${labelFor(d.locationId)} ×${d.thisWeek}${tag}`;
    })
    .join('\n');

  const timelineLines = buckets
    .map(b => `  ${b.label}: ${b.locationIds.map(labelFor).join(' → ') || '—'}`)
    .join('\n');

  const title = `${cityName} · 路线季末卡片`;
  const heatSection = heatLines || '  （暂无热力数据）';
  const weekSection = weekLines || '  （本周暂无访问）';
  const timelineSection = timelineLines || '  （暂无时间轴）';

  const narrative = [
    title,
    '',
    '🔥 热力常去',
    heatSection,
    '',
    '📅 周对比',
    weekSection,
    newSpots.length > 0 ? `\n  新常去: ${newSpots.join('、')}` : '',
    '',
    '🛤️ 路线记忆',
    timelineSection,
    '',
    '— VaultFlow 人生小系统',
  ]
    .filter(Boolean)
    .join('\n');

  return { title, heatSection, weekSection, timelineSection, narrative };
}

export async function copyRouteShareCard(cityId: string, cityName: string): Promise<'copied' | 'failed'> {
  const card = buildRouteShareCard(cityId, cityName);
  try {
    await navigator.clipboard.writeText(card.narrative);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function exportRouteSharePng(
  cityId: string,
  cityName: string,
): Promise<'saved' | 'failed'> {
  const card = buildRouteShareCard(cityId, cityName);
  const el = document.createElement('div');
  el.className = 'explore-route-share-export-card';
  el.innerHTML = `
    <h3>${card.title}</h3>
    <section><h4>🔥 热力常去</h4><pre>${card.heatSection}</pre></section>
    <section><h4>📅 周对比</h4><pre>${card.weekSection}</pre></section>
    <section><h4>🛤️ 路线记忆</h4><pre>${card.timelineSection}</pre></section>
    <footer>VaultFlow 人生小系统</footer>
  `;
  el.style.cssText =
    'position:fixed;left:-9999px;top:0;width:400px;padding:20px;background:#FFF8E7;font-family:system-ui;font-size:12px;color:#4e342e;border-radius:16px;';
  document.body.appendChild(el);
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(el, { backgroundColor: '#FFF8E7', scale: 2 });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cityName}-路线季末卡片.png`;
    a.click();
    return 'saved';
  } catch {
    return 'failed';
  } finally {
    el.remove();
  }
}
