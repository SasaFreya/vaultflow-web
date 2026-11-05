const SETTINGS_KEY = 'vaultflow_eco_notify_settings';

export interface EcoNotifySettings {
  lagReminder: boolean;
  seasonShare: boolean;
  streakRewardNotify: boolean;
  weatherReminder: boolean;
}

export const DEFAULT_ECO_NOTIFY_SETTINGS: EcoNotifySettings = {
  lagReminder: false,
  seasonShare: false,
  streakRewardNotify: true,
  weatherReminder: false,
};

export function loadEcoNotifySettings(): EcoNotifySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_ECO_NOTIFY_SETTINGS };
    return { ...DEFAULT_ECO_NOTIFY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_ECO_NOTIFY_SETTINGS };
  }
}

export function saveEcoNotifySettings(settings: EcoNotifySettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function isLagReminderEnabled(): boolean {
  return loadEcoNotifySettings().lagReminder;
}

export function isSeasonShareEnabled(): boolean {
  return loadEcoNotifySettings().seasonShare;
}

export function isStreakRewardNotifyEnabled(): boolean {
  return loadEcoNotifySettings().streakRewardNotify;
}

export function isWeatherReminderEnabled(): boolean {
  return loadEcoNotifySettings().weatherReminder;
}
