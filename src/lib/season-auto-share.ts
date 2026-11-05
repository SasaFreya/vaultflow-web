import dayjs from 'dayjs';
import type { SeasonQuarterReport } from '@/lib/explore-ecology-ext';
import { isSeasonShareEnabled } from '@/lib/eco-notify-settings';

const LAST_AUTO_SHARE_KEY = 'vaultflow_season_auto_share';

export function isSeasonEndingSoon(): boolean {
  const now = dayjs();
  const month = now.month();
  const isQuarterEndMonth = month === 2 || month === 5 || month === 8 || month === 11;
  if (!isQuarterEndMonth) return false;
  const daysLeft = now.endOf('month').diff(now, 'day');
  return daysLeft <= 7;
}

export function getCurrentQuarterLabel(): string {
  const q = Math.floor(dayjs().month() / 3) + 1;
  return `${dayjs().year()} Q${q}`;
}

export function shouldPromptSeasonShare(quarterLabel: string): boolean {
  if (!isSeasonShareEnabled()) return false;
  if (!isSeasonEndingSoon()) return false;
  try {
    const last = localStorage.getItem(LAST_AUTO_SHARE_KEY);
    return last !== quarterLabel;
  } catch {
    return true;
  }
}

export function markSeasonSharePrompted(quarterLabel: string): void {
  localStorage.setItem(LAST_AUTO_SHARE_KEY, quarterLabel);
}

export async function shareSeasonNarrative(
  cityName: string,
  report: SeasonQuarterReport,
  narrativeOverride?: string,
): Promise<'shared' | 'copied' | 'skipped'> {
  const narrative = narrativeOverride?.trim() || report.narrative;
  const text = `${report.quarterLabel} · ${cityName}人生生态\n平衡 ${report.balanceScore} 分\n\n${narrative}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: `${cityName}生态季评`, text });
      return 'shared';
    } catch {
      /* fallback */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'skipped';
  }
}
