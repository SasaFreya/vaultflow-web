export type TownWeatherKind = 'clear' | 'rain' | 'cloudy' | 'snow';

export interface TownWeatherSnapshot {
  kind: TownWeatherKind;
  tempC?: number;
  fetchedAt: string;
  cityLabel: string;
}

const CACHE_KEY = 'vaultflow_town_weather';

const CITY_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  shenzhen: { lat: 22.5431, lng: 114.0579, label: '深圳' },
  beijing: { lat: 39.9042, lng: 116.4074, label: '北京' },
  shanghai: { lat: 31.2304, lng: 121.4737, label: '上海' },
};

function loadCache(): Record<string, TownWeatherSnapshot> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TownWeatherSnapshot>) : {};
  } catch {
    return {};
  }
}

function saveCache(data: Record<string, TownWeatherSnapshot>): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function mapWeatherCode(code: number): TownWeatherKind {
  if (code === 0) return 'clear';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rain';
  return 'cloudy';
}

export async function fetchTownWeather(cityId: string): Promise<TownWeatherSnapshot | null> {
  const coord = CITY_COORDS[cityId] ?? CITY_COORDS.shenzhen;
  const cache = loadCache();
  const prev = cache[cityId];
  if (prev && Date.now() - new Date(prev.fetchedAt).getTime() < 30 * 60_000) {
    return prev;
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lng}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) return prev ?? null;
    const json = await res.json() as { current_weather?: { temperature: number; weathercode: number } };
    const cw = json.current_weather;
    if (!cw) return prev ?? null;
    const snap: TownWeatherSnapshot = {
      kind: mapWeatherCode(cw.weathercode),
      tempC: cw.temperature,
      fetchedAt: new Date().toISOString(),
      cityLabel: coord.label,
    };
    cache[cityId] = snap;
    saveCache(cache);
    return snap;
  } catch {
    return prev ?? null;
  }
}

export function getCachedTownWeather(cityId: string): TownWeatherSnapshot | null {
  return loadCache()[cityId] ?? null;
}

const WEATHER_EMOJI: Record<TownWeatherKind, string> = {
  clear: '☀️',
  rain: '🌧️',
  cloudy: '☁️',
  snow: '❄️',
};

export function formatTownWeatherChip(snapshot: TownWeatherSnapshot): string {
  const emoji = WEATHER_EMOJI[snapshot.kind];
  const temp = snapshot.tempC != null ? `${Math.round(snapshot.tempC)}°C` : '--°C';
  return `${emoji} ${temp} ${snapshot.cityLabel}`;
}
