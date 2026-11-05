import type { EcoAlert } from '@/lib/explore-ecology-ext';
import type { TownWeatherSnapshot } from '@/lib/town-weather';
import type { BuildingType } from '@/types/life-town';
import {
  dispatchWeatherSceneNavigate,
  notifyLagAlertsIfNeeded,
  notifyWeatherScenesIfNeeded,
  showEcoNotification,
  WEATHER_SCENE_BUILDING,
} from '@/lib/eco-lag-notify';

const SW_READY_KEY = 'vaultflow_pwa_sw_ready';

export function isPwaEcoNotifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/** 注册 PWA 推送权限 — 与 Electron 通知行为对齐 */
export async function registerPwaEcoNotify(): Promise<boolean> {
  if (!isPwaEcoNotifySupported()) return false;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await reg.update().catch(() => undefined);
    localStorage.setItem(SW_READY_KEY, '1');
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

export function isPwaEcoNotifyReady(): boolean {
  return localStorage.getItem(SW_READY_KEY) === '1' && Notification.permission === 'granted';
}

/** Web 端天气 / 滞后提醒 — 复用 eco-lag-notify 逻辑 */
export async function notifyPwaEcoIfNeeded(
  alerts: EcoAlert[],
  weather: TownWeatherSnapshot | null | undefined,
): Promise<void> {
  if (!isPwaEcoNotifyReady()) return;
  await notifyLagAlertsIfNeeded(alerts);
  await notifyWeatherScenesIfNeeded(weather);
}

export async function showPwaSceneNotification(
  title: string,
  body: string,
  buildingType: BuildingType,
): Promise<void> {
  await showEcoNotification(title, body, () => dispatchWeatherSceneNavigate(buildingType), buildingType);
}

export { WEATHER_SCENE_BUILDING };
