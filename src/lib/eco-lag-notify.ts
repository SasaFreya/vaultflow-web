import type { EcoAlert } from '@/lib/explore-ecology-ext';
import { isLagReminderEnabled, isWeatherReminderEnabled } from '@/lib/eco-notify-settings';
import type { TownWeatherSnapshot } from '@/lib/town-weather';
import type { BuildingType } from '@/types/life-town';

const PERM_KEY = 'vaultflow_lag_notify_permission';
const SENT_KEY = 'vaultflow_lag_notify_sent';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadSentToday(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date: string; ids: string[] };
    if (parsed.date !== todayKey()) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

function saveSentToday(ids: Set<string>): void {
  localStorage.setItem(SENT_KEY, JSON.stringify({ date: todayKey(), ids: [...ids] }));
}

export function getLagNotifyPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (window.electronAPI?.isElectron) {
    return localStorage.getItem(PERM_KEY) === '1' ? 'granted' : 'default';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** 仅在设置页主动调用，不在地图进入时弹窗 */
export async function requestLagNotifyPermission(): Promise<boolean> {
  if (window.electronAPI?.isElectron) {
    localStorage.setItem(PERM_KEY, '1');
    return true;
  }
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm === 'granted') localStorage.setItem(PERM_KEY, '1');
  return perm === 'granted';
}

export async function showEcoNotification(
  title: string,
  body: string,
  onClick?: () => void,
  buildingType?: string,
): Promise<void> {
  if (window.electronAPI?.showNotification) {
    await window.electronAPI.showNotification({ title, body, buildingType });
    return;
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, { body, tag: 'vaultflow-eco' });
    if (onClick) n.onclick = () => {
      onClick();
      window.focus();
      n.close();
    };
  }
}

/** 滞后提醒：需设置开启 + 已有通知权限，不自动请求权限 */
export async function notifyLagAlertsIfNeeded(alerts: EcoAlert[]): Promise<void> {
  if (!isLagReminderEnabled()) return;

  const lagAlerts = alerts.filter(a => a.action === 'ai_echo');
  if (lagAlerts.length === 0) return;

  const perm = getLagNotifyPermission();
  if (perm !== 'granted') return;

  const sent = loadSentToday();
  for (const alert of lagAlerts.slice(0, 2)) {
    if (sent.has(alert.id)) continue;
    await showEcoNotification(`⏳ ${alert.title}`, alert.body);
    sent.add(alert.id);
  }
  saveSentToday(sent);
}

const WEATHER_SENT_KEY = 'vaultflow_weather_notify_sent';

export const WEATHER_SCENE_BUILDING: Record<string, BuildingType> = {
  rain: 'library',
  clear: 'gym',
  snow: 'home',
};

export function dispatchWeatherSceneNavigate(buildingType: BuildingType): void {
  window.dispatchEvent(
    new CustomEvent('vaultflow-weather-scene', { detail: { buildingType } }),
  );
}

/** 雨天推送「适合去图书馆」— 需设置开启 + 已有通知权限 */
export async function notifyWeatherLibraryIfNeeded(
  weather: TownWeatherSnapshot | null | undefined,
): Promise<void> {
  await notifyWeatherScenesIfNeeded(weather);
}

/** 场景化天气推送：雨天图书馆、晴天健身、雪天小窝 */
export async function notifyWeatherScenesIfNeeded(
  weather: TownWeatherSnapshot | null | undefined,
): Promise<void> {
  if (!weather) return;
  if (!isWeatherReminderEnabled()) return;

  const perm = getLagNotifyPermission();
  if (perm !== 'granted') return;

  const today = todayKey();
  const kind = weather.kind;
  const sentKey = `${WEATHER_SENT_KEY}_${kind}`;

  try {
    const raw = localStorage.getItem(sentKey);
    const parsed = raw ? (JSON.parse(raw) as { date: string }) : null;
    if (parsed?.date === today) return;
  } catch {
    /* continue */
  }

  const temp = Math.round(weather.tempC ?? 18);
  const city = weather.cityLabel;

  const building = WEATHER_SCENE_BUILDING[kind];
  const navigate = () => {
    if (building) dispatchWeatherSceneNavigate(building);
  };

  if (kind === 'rain') {
    await showEcoNotification(
      '🌧️ 雨天适合窝在图书馆',
      `${city} ${temp}°C · 写条阅读回忆有天气 EXP 加成`,
      navigate,
      'library',
    );
  } else if (kind === 'clear') {
    await showEcoNotification(
      '☀️ 晴天适合去健身房',
      `${city} ${temp}°C · 打卡健身有天气 EXP 加成`,
      navigate,
      'gym',
    );
  } else if (kind === 'snow') {
    await showEcoNotification(
      '❄️ 雪天适合宅在小窝',
      `${city} ${temp}°C · 在家写条温暖回忆吧`,
      navigate,
      'home',
    );
  } else {
    return;
  }

  localStorage.setItem(sentKey, JSON.stringify({ date: today }));
}
