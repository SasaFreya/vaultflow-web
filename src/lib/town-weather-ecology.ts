import type { BuildingType } from '@/types/life-town';
import type { TownWeatherKind, TownWeatherSnapshot } from '@/lib/town-weather';

export interface WeatherEcologyEffect {
  expBonusPct: number;
  hint?: string;
  dormantOverride?: boolean;
}

/** 天气对生活域的生态影响 */
export function getWeatherEcologyEffect(
  weather: TownWeatherSnapshot | null | undefined,
  buildingType: BuildingType,
): WeatherEcologyEffect {
  if (!weather) return { expBonusPct: 0 };

  if (weather.kind === 'rain' && buildingType === 'library') {
    return {
      expBonusPct: 15,
      hint: '🌧️ 雨天适合窝在图书馆 · 回忆 EXP +15%',
    };
  }

  if (weather.kind === 'rain' && buildingType === 'home') {
    return { expBonusPct: 5, hint: '🌧️ 雨声白噪音 · 小窝回忆 +5% EXP' };
  }

  if (weather.kind === 'snow' && buildingType === 'gym') {
    return {
      expBonusPct: 0,
      hint: '❄️ 雪天路滑 · 健身房进入休眠，改天再练吧',
      dormantOverride: true,
    };
  }

  if (weather.kind === 'snow' && buildingType === 'cafe') {
    return { expBonusPct: 8, hint: '❄️ 雪天热饮 · 咖啡馆回忆 +8% EXP' };
  }

  if (weather.kind === 'clear' && buildingType === 'gym') {
    return { expBonusPct: 5, hint: '☀️ 晴天出门健身 · +5% EXP' };
  }

  return { expBonusPct: 0 };
}

export function applyWeatherExpBonus(baseExp: number, bonusPct: number): number {
  if (bonusPct <= 0) return baseExp;
  return Math.round(baseExp * (1 + bonusPct / 100));
}

export function weatherKindLabel(kind: TownWeatherKind): string {
  const map: Record<TownWeatherKind, string> = {
    clear: '晴',
    rain: '雨',
    cloudy: '阴',
    snow: '雪',
  };
  return map[kind];
}
