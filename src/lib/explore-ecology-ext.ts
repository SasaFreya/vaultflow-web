import dayjs from 'dayjs';
import type { BuildingType, LifeCityId, LifeMemory, LifeCityRecord } from '@/types/life-town';
import type { Transaction } from '@/types';
import { BUILDING_TYPES } from '@/lib/life-memories-data';
import { transactionToBuilding } from '@/lib/life-town-finance';
import { formatCurrency } from '@/lib/storage';
import {
  LIFE_DOMAIN_META,
  computeExploreEcosystem,
  type ExploreNodeEcosystem,
} from '@/lib/explore-ecosystem';

export interface EcoAlert {
  id: string;
  severity: 'info' | 'warn';
  emoji: string;
  title: string;
  body: string;
  buildingType: BuildingType;
  /** 一键 AI 回声 */
  action?: 'ai_echo';
}

export interface BillLagItem {
  buildingType: BuildingType;
  billDate: string;
  daysSince: number;
  label: string;
  amount: number;
}

/** 账单出现 ≥3 天仍无同域回忆 */
export function findBillMemoryLagAlerts(
  cityId: string,
  memories: LifeMemory[],
  transactions: Transaction[],
  lagDays = 3,
): BillLagItem[] {
  const today = dayjs();
  const cityMemories = memories.filter(m => m.cityId === cityId);
  const results: BillLagItem[] = [];

  for (const t of transactions) {
    if (today.diff(dayjs(t.date), 'day') > 30) continue;
    const bt = transactionToBuilding(t);
    if (!bt) continue;
    const daysSince = today.diff(dayjs(t.date), 'day');
    if (daysSince < lagDays) continue;

    const hasMemoryAfter = cityMemories.some(
      m =>
        m.buildingType === bt &&
        m.date >= t.date &&
        dayjs(m.date).diff(dayjs(t.date), 'day') <= lagDays + 7,
    );
    if (hasMemoryAfter) continue;

    const label = t.type === 'income' ? '收入' : (EXPENSE_LABELS[t.category] ?? t.category);
    results.push({
      buildingType: bt,
      billDate: t.date,
      daysSince,
      label,
      amount: t.amount,
    });
  }

  const byDomain = new Map<BuildingType, BillLagItem>();
  for (const item of results) {
    const prev = byDomain.get(item.buildingType);
    if (!prev || item.daysSince > prev.daysSince) byDomain.set(item.buildingType, item);
  }
  return [...byDomain.values()].sort((a, b) => b.daysSince - a.daysSince);
}

export interface DomainRadarPoint {
  domain: string;
  buildingType: BuildingType;
  current: number;
  previous: number;
  fullMark: number;
}

export interface DomainDetailBill {
  id: string;
  date: string;
  label: string;
  amount: number;
  formatted: string;
}

export interface DomainDetailMemory {
  id: string;
  date: string;
  content: string;
  moodEmoji: string | null;
  linkedAmount: number | null;
  geoLabel: string | null;
}

export interface DomainDetailData {
  buildingType: BuildingType;
  domainLabel: string;
  placeName: string;
  ecosystem: ExploreNodeEcosystem;
  memories: DomainDetailMemory[];
  bills: DomainDetailBill[];
}

const EXPENSE_LABELS: Record<string, string> = {
  餐饮美食: '餐饮',
  交通出行: '交通',
  购物消费: '购物',
  房租水电: '房租',
  娱乐休闲: '娱乐',
  医疗健康: '医疗',
  学习教育: '学习',
};

export const CITY_GEO_CENTER: Record<string, { lat: number; lng: number }> = {
  shenzhen: { lat: 22.5431, lng: 114.0579 },
  beijing: { lat: 39.9042, lng: 116.4074 },
  shanghai: { lat: 31.2304, lng: 121.4737 },
};

export function getCityGeoCenter(cityId: LifeCityId): { lat: number; lng: number } {
  return CITY_GEO_CENTER[cityId] ?? CITY_GEO_CENTER.shenzhen;
}

/** 将 geo 转为地图上的百分比偏移（相对域针脚） */
export function geoToMapOffset(
  geo: { lat: number; lng: number },
  cityCenter: { lat: number; lng: number },
): { dx: number; dy: number } {
  const dx = ((geo.lng - cityCenter.lng) * 800) % 8;
  const dy = ((cityCenter.lat - geo.lat) * 800) % 6;
  return {
    dx: Math.max(-5, Math.min(5, dx)),
    dy: Math.max(-4, Math.min(4, dy)),
  };
}

export function buildDomainDetail(
  buildingType: BuildingType,
  placeName: string,
  cityId: string,
  memories: LifeMemory[],
  transactions: Transaction[],
  _city: LifeCityRecord,
  ecosystem: Record<BuildingType, ExploreNodeEcosystem>,
): DomainDetailData {
  const domainMemories = memories
    .filter(m => m.cityId === cityId && m.buildingType === buildingType)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const bills = transactions
    .filter(t => transactionToBuilding(t) === buildingType)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map(t => ({
      id: t.id,
      date: t.date,
      label: t.type === 'income' ? '收入' : (EXPENSE_LABELS[t.category] ?? t.category),
      amount: t.amount,
      formatted: formatCurrency(t.amount),
    }));

  return {
    buildingType,
    domainLabel: LIFE_DOMAIN_META[buildingType].label,
    placeName,
    ecosystem: ecosystem[buildingType],
    memories: domainMemories.map(m => {
      const linked = m.linkedTransactionId
        ? transactions.find(t => t.id === m.linkedTransactionId)
        : undefined;
      return {
        id: m.id,
        date: m.date,
        content: m.content,
        moodEmoji: m.mood === 'happy' ? '😊' : m.mood === 'calm' ? '😌' : m.mood === 'excited' ? '🤩' : m.mood === 'tired' ? '😴' : m.mood ? '😐' : null,
        linkedAmount: linked?.amount ?? null,
        geoLabel: m.geo?.label ?? (m.geo ? `${m.geo.lat.toFixed(2)},${m.geo.lng.toFixed(2)}` : null),
      };
    }),
    bills,
  };
}

export function generateEcoAlerts(
  cityId: string,
  _city: LifeCityRecord,
  memories: LifeMemory[],
  transactions: Transaction[],
): EcoAlert[] {
  const cityMemories = memories.filter(m => m.cityId === cityId);
  const today = dayjs();
  const alerts: EcoAlert[] = [];

  const lagItems = findBillMemoryLagAlerts(cityId, memories, transactions);
  for (const lag of lagItems.slice(0, 2)) {
    alerts.push({
      id: `lag-${lag.buildingType}-${lag.billDate}`,
      severity: 'warn',
      emoji: '⏳',
      title: `${LIFE_DOMAIN_META[lag.buildingType].label}账单已 ${lag.daysSince} 天`,
      body: `${lag.label} ${formatCurrency(lag.amount)} · 尚无回忆回声 · 点我 AI 补写`,
      buildingType: lag.buildingType,
      action: 'ai_echo',
    });
  }

  const activityByDomain = BUILDING_TYPES.map(bt => {
    const lastMemory = cityMemories
      .filter(m => m.buildingType === bt)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const daysSinceMemory = lastMemory ? today.diff(dayjs(lastMemory.date), 'day') : 999;
    const recentBills = transactions.filter(
      t => transactionToBuilding(t) === bt && today.diff(dayjs(t.date), 'day') <= 30,
    ).length;
    const eco = computeExploreEcosystem(cityId, _city, memories, transactions);
    return { bt, daysSinceMemory, recentBills, vitality: eco[bt].vitality, trend: eco[bt].trend };
  });

  const mostActive = [...activityByDomain].sort((a, b) => b.recentBills - a.recentBills)[0];
  const dormant = activityByDomain.filter(d => d.daysSinceMemory >= 30 && d.recentBills === 0);

  if (mostActive && mostActive.recentBills >= 3) {
    alerts.push({
      id: `active-${mostActive.bt}`,
      severity: 'info',
      emoji: '📊',
      title: `${LIFE_DOMAIN_META[mostActive.bt].label}账单活跃`,
      body: `近 30 天 ${mostActive.recentBills} 笔账单信号 · 写条回忆让现实有回声`,
      buildingType: mostActive.bt,
    });
  }

  for (const d of dormant) {
    if (d.bt === 'home') continue;
    alerts.push({
      id: `dormant-${d.bt}`,
      severity: 'warn',
      emoji: '💤',
      title: `${LIFE_DOMAIN_META[d.bt].label}已休眠 ${d.daysSinceMemory >= 999 ? '30+' : d.daysSinceMemory} 天`,
      body: '账单或生活在继续，自述回忆可以让这个域重新亮起来',
      buildingType: d.bt,
    });
  }

  const companyActive = activityByDomain.find(d => d.bt === 'company')?.recentBills ?? 0;
  const gymDormant = dormant.some(d => d.bt === 'gym');
  if (companyActive >= 2 && gymDormant) {
    alerts.push({
      id: 'imbalance-work-body',
      severity: 'warn',
      emoji: '⚖️',
      title: '职域活跃 · 身域休眠',
      body: '工作账单很多，但身体域很久没记录 · 去身域补一条回忆吧',
      buildingType: 'gym',
    });
  }

  return alerts.slice(0, 5);
}

export function computeDomainRadarData(
  cityId: string,
  _city: LifeCityRecord,
  memories: LifeMemory[],
  transactions: Transaction[],
): DomainRadarPoint[] {
  const now = dayjs();
  const curFrom = now.startOf('month').format('YYYY-MM-DD');
  const curTo = now.format('YYYY-MM-DD');
  const prevFrom = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
  const prevTo = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

  const score = (from: string, to: string, bt: BuildingType) => {
    const mem = memories.filter(
      m => m.cityId === cityId && m.buildingType === bt && m.date >= from && m.date <= to,
    ).length;
    const bills = transactions.filter(
      t => t.date >= from && t.date <= to && transactionToBuilding(t) === bt,
    ).length;
    return mem * 3 + bills;
  };

  const scores = BUILDING_TYPES.map(bt => ({
    bt,
    current: score(curFrom, curTo, bt),
    previous: score(prevFrom, prevTo, bt),
  }));
  const max = Math.max(10, ...scores.flatMap(s => [s.current, s.previous]));

  return scores.map(s => ({
    domain: LIFE_DOMAIN_META[s.bt].label,
    buildingType: s.bt,
    current: s.current,
    previous: s.previous,
    fullMark: max,
  }));
}

export function computeDomainBalanceScore(
  ecosystem: Record<BuildingType, ExploreNodeEcosystem>,
): number {
  const scores = BUILDING_TYPES.map(bt => {
    const n = ecosystem[bt];
    return n.memoryCount * 2 + n.financeActivity;
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length;
  const balance = Math.max(0, 100 - Math.sqrt(variance) * 8);
  return Math.round(Math.min(100, balance));
}

export function hubShopEcosystemHint(ecosystem: Record<BuildingType, ExploreNodeEcosystem>): string {
  const cafe = ecosystem.cafe.financeActivity;
  const home = ecosystem.home.financeActivity;
  return `社域+根域消费 ${cafe + home} 笔 · 镜像杂货消费`;
}

export function hubHouseEcosystemHint(
  memoryCount: number,
  ecosystem: Record<BuildingType, ExploreNodeEcosystem>,
  goalsPct?: number,
  streakMonths?: number,
): string {
  const active = BUILDING_TYPES.filter(bt => ecosystem[bt].vitality !== 'dormant').length;
  const goalPart = goalsPct != null ? ` · 月目标 ${goalsPct}%` : '';
  const streakPart = streakMonths && streakMonths > 0 ? ` · 🔥${streakMonths}月` : '';
  return `回忆 ${memoryCount} 条 · ${active}/5 域活跃${goalPart}${streakPart}`;
}

export function hubPlazaEcosystemHint(
  ecosystem: Record<BuildingType, ExploreNodeEcosystem>,
  goalsPct?: number,
): string {
  const score = computeDomainBalanceScore(ecosystem);
  const sorted = [...BUILDING_TYPES].sort(
    (a, b) =>
      ecosystem[b].memoryCount +
      ecosystem[b].financeActivity -
      (ecosystem[a].memoryCount + ecosystem[a].financeActivity),
  );
  const goalPart = goalsPct != null ? ` · 月目标 ${goalsPct}%` : '';
  return `生态平衡 ${score} 分 · ${LIFE_DOMAIN_META[sorted[0]].label}领先${goalPart}`;
}

export function hubClockTowerEcosystemHint(
  ecosystem: Record<BuildingType, ExploreNodeEcosystem>,
): string {
  const growing = BUILDING_TYPES.filter(bt => ecosystem[bt].trend === 'growing').length;
  return `${growing} 域本月生长 · 对照日历节奏`;
}

export interface SeasonQuarterReport {
  quarterLabel: string;
  narrative: string;
  memoryCount: number;
  billCount: number;
  topDomain: string;
  balanceScore: number;
  highlights: string[];
}

export function buildSeasonQuarterReport(
  cityId: string,
  cityName: string,
  city: LifeCityRecord,
  memories: LifeMemory[],
  transactions: Transaction[],
): SeasonQuarterReport {
  const now = dayjs();
  const qStartMonth = Math.floor(now.month() / 3) * 3;
  const qStart = now.month(qStartMonth).startOf('month');
  const quarterLabel = `${now.year()} Q${Math.floor(now.month() / 3) + 1}`;
  const from = qStart.format('YYYY-MM-DD');
  const to = now.format('YYYY-MM-DD');

  const qMemories = memories.filter(m => m.cityId === cityId && m.date >= from && m.date <= to);
  const qBills = transactions.filter(t => t.date >= from && t.date <= to);
  const eco = computeExploreEcosystem(cityId, city, memories, transactions, 'month');
  const balanceScore = computeDomainBalanceScore(eco);
  const top = [...BUILDING_TYPES].sort(
    (a, b) => eco[b].memoryCount + eco[b].financeActivity - (eco[a].memoryCount + eco[a].financeActivity),
  )[0];

  const narrative = [
    `${quarterLabel}，${cityName}的人生生态像一面镜子。`,
    `你写下 ${qMemories.length} 条自述回忆，账单里映出 ${qBills.length} 笔生活信号。`,
    `${LIFE_DOMAIN_META[top].label}最为活跃，五域平衡指数 ${balanceScore}。`,
    qMemories.length === 0
      ? '下一季，从任意一个生活域补第一条回忆开始。'
      : '账单窥见现实，自述补充温度——这就是你的季节叙事。',
  ].join('');

  const highlights = BUILDING_TYPES.filter(bt => eco[bt].vitality === 'vivid' || eco[bt].trend === 'growing')
    .slice(0, 3)
    .map(bt => `${LIFE_DOMAIN_META[bt].label}：${eco[bt].memoryCount} 回忆 · ${eco[bt].financeActivity} 账单`);

  return {
    quarterLabel,
    narrative,
    memoryCount: qMemories.length,
    billCount: qBills.length,
    topDomain: LIFE_DOMAIN_META[top].label,
    balanceScore,
    highlights,
  };
}

export async function exportSeasonReportAsPng(report: SeasonQuarterReport, cityName: string): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const grd = ctx.createLinearGradient(0, 0, 0, 1100);
  grd.addColorStop(0, '#FFF8E7');
  grd.addColorStop(1, '#E8F5E9');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 800, 1100);

  ctx.fillStyle = '#4E342E';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText(`${cityName} · 人生生态报告`, 48, 72);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = '#8D6E63';
  ctx.fillText(report.quarterLabel, 48, 108);

  ctx.fillStyle = '#5D4037';
  ctx.font = '18px system-ui, sans-serif';
  wrapText(ctx, report.narrative, 48, 160, 704, 28);

  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`平衡指数 ${report.balanceScore} · 领先域 ${report.topDomain}`, 48, 340);
  ctx.fillText(`回忆 ${report.memoryCount} · 账单 ${report.billCount}`, 48, 372);

  let y = 420;
  ctx.font = '16px system-ui, sans-serif';
  for (const h of report.highlights) {
    ctx.fillText(`· ${h}`, 56, y);
    y += 28;
  }

  ctx.fillStyle = 'rgba(93,64,55,0.5)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('VaultFlow 人生小系统 · 账单窥见现实', 48, 1040);

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cityName}-${report.quarterLabel}-生态报告.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = text.split('');
  let line = '';
  let cy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}
