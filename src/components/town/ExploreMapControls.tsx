import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Lock, Map, Move, RotateCcw } from 'lucide-react';
import { getTownTimeOfDay, TOWN_TIME_GREETING } from '@/lib/town-time-of-day';
import type { LifeCityId, LifeCityRecord, LifeMemory } from '@/types/life-town';
import { countMemoriesForCity, isCityAccessible, sortCitiesForDisplay } from '@/lib/life-city-unlock';

interface ExploreMapControlsProps {
  cityName: string;
  cities: LifeCityRecord[];
  memories: LifeMemory[];
  activeCityId: LifeCityId;
  layoutEdit: boolean;
  comfortLabel: string;
  comfortBonus: number;
  hasSubwayPass: boolean;
  isCityAccessible: (cityId: LifeCityId) => boolean;
  onCitySwitch: (id: LifeCityId) => void;
  onLayoutEditChange: (edit: boolean) => void;
  onResetLayout: () => void;
  onRecenterHome: () => void;
  hasGeoLayer?: boolean;
  showMapLayer?: boolean;
  onMapLayerToggle?: () => void;
}

export default function ExploreMapControls({
  cityName,
  cities,
  memories,
  activeCityId,
  layoutEdit,
  comfortLabel,
  comfortBonus,
  hasSubwayPass,
  isCityAccessible: canAccessCity,
  onCitySwitch,
  onLayoutEditChange,
  onResetLayout,
  onRecenterHome,
  hasGeoLayer,
  showMapLayer,
  onMapLayerToggle,
}: ExploreMapControlsProps) {
  const timeOfDay = getTownTimeOfDay();
  const sortedCities = sortCitiesForDisplay(cities);

  return (
    <div className="explore-map-controls">
      <div className="explore-map-controls-row">
        <Link to="/town" className="explore-map-back">
          <ArrowLeft className="w-3.5 h-3.5" />
          回人生小镇
        </Link>
        <span className="explore-map-city">{cityName} · 人生生态</span>
      </div>

      <div className="explore-map-controls-row hub-town-city-tabs">
        {sortedCities.map(city => {
          const memoryCount = countMemoriesForCity(memories, city.id);
          const unlocked = isCityAccessible(city, memoryCount) && canAccessCity(city.id);
          const active = city.id === activeCityId;
          const label = active ? cityName : city.name;

          return (
            <button
              key={city.id}
              type="button"
              className={`hub-town-city-tab ${active ? 'hub-town-city-tab--active' : ''} ${!unlocked ? 'hub-town-city-tab--locked' : ''} ${city.isCustom ? 'hub-town-city-tab--custom' : ''}`}
              onClick={() => unlocked && onCitySwitch(city.id)}
              disabled={!unlocked}
              title={unlocked ? `切换到${city.name}外出地图` : `在${city.name}写下 1 条回忆后解锁`}
            >
              {!unlocked && <Lock className="w-2.5 h-2.5" />}
              {label}
            </button>
          );
        })}
      </div>

      <div className="explore-map-controls-row">
        <span className="town-map-chip">
          🛋️ 舒适度 {comfortLabel} · EXP +{Math.round(comfortBonus * 100)}%
        </span>
        {hasSubwayPass && (
          <span className="town-map-chip town-map-chip--mint">🚇 地铁月票</span>
        )}
        {hasGeoLayer && onMapLayerToggle && (
          <button
            type="button"
            className={`hub-town-action-btn ${showMapLayer ? 'hub-town-action-btn--active' : ''}`}
            onClick={onMapLayerToggle}
          >
            <Map className="w-3.5 h-3.5" />
            {showMapLayer ? '隐藏地图' : '真实地图'}
          </button>
        )}
        <span className="explore-map-time-hint">
          {layoutEdit ? '📐 拖拽地点调整布局' : TOWN_TIME_GREETING[timeOfDay].split('·')[0]}
        </span>
      </div>

      <div className="explore-map-controls-row">
        <button
          type="button"
          className={`hub-town-action-btn ${layoutEdit ? 'hub-town-action-btn--active' : ''}`}
          onClick={() => onLayoutEditChange(!layoutEdit)}
        >
          <Move className="w-3.5 h-3.5" />
          {layoutEdit ? '完成布局' : '调整布局'}
        </button>
        {layoutEdit && (
          <>
            <button type="button" className="hub-town-action-btn hub-town-action-btn--ghost" onClick={onRecenterHome}>
              <Home className="w-3.5 h-3.5" />
              找回小窝
            </button>
            <button type="button" className="hub-town-action-btn hub-town-action-btn--ghost" onClick={onResetLayout}>
              <RotateCcw className="w-3.5 h-3.5" />
              恢复默认
            </button>
          </>
        )}
      </div>
    </div>
  );
}
