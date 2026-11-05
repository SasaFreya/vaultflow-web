import { useState, useEffect } from 'react';
import { MapPin, Pencil, Check, RotateCcw, Move, Lock, Plus } from 'lucide-react';
import type { LifeCityId, LifeCityRecord } from '@/types/life-town';
import { sortCitiesForDisplay, isCityAccessible, countMemoriesForCity } from '@/lib/life-city-unlock';
import type { LifeMemory } from '@/types/life-town';
import type { TownWeatherSnapshot } from '@/lib/town-weather';
import { formatTownWeatherChip } from '@/lib/town-weather';

interface HubTownControlsProps {
  cities: LifeCityRecord[];
  memories: LifeMemory[];
  activeCityId: LifeCityId;
  activeCityName: string;
  layoutEdit: boolean;
  weather?: TownWeatherSnapshot | null;
  onLayoutEditChange: (edit: boolean) => void;
  onCitySwitch: (id: LifeCityId) => void;
  onRename: (name: string) => void;
  onResetLayout: () => void;
  onAddCity: (name: string) => void;
  onLockedCityClick?: (cityName: string) => void;
}

export default function HubTownControls({
  cities,
  memories,
  activeCityId,
  activeCityName,
  layoutEdit,
  weather,
  onLayoutEditChange,
  onCitySwitch,
  onRename,
  onResetLayout,
  onAddCity,
  onLockedCityClick,
}: HubTownControlsProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(activeCityName);
  const [addingCity, setAddingCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');

  useEffect(() => {
    if (!editingName) setNameDraft(activeCityName);
  }, [activeCityName, editingName]);

  const sortedCities = sortCitiesForDisplay(cities);

  const commitName = () => {
    onRename(nameDraft);
    setEditingName(false);
  };

  const commitNewCity = () => {
    const trimmed = newCityName.trim();
    if (!trimmed) return;
    onAddCity(trimmed);
    setNewCityName('');
    setAddingCity(false);
  };

  return (
    <div className="hub-town-controls">
      {weather && (
        <div className="hub-town-controls-row hub-town-weather-chip" title="实时天气（Open-Meteo）">
          {formatTownWeatherChip(weather)}
        </div>
      )}
      <div className="hub-town-controls-row">
        <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
        {editingName ? (
          <div className="hub-town-name-edit">
            <input
              className="hub-town-name-input"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') {
                  setNameDraft(activeCityName);
                  setEditingName(false);
                }
              }}
              maxLength={24}
              autoFocus
            />
            <button type="button" className="hub-town-icon-btn" onClick={commitName} aria-label="保存名称">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="hub-town-name-display"
            onClick={() => setEditingName(true)}
            title="点击给小镇命名"
          >
            {activeCityName}
            <Pencil className="w-3 h-3 opacity-50" />
          </button>
        )}
      </div>

      <div className="hub-town-controls-row hub-town-city-tabs">
        {sortedCities.map(city => {
          const memoryCount = countMemoriesForCity(memories, city.id);
          const unlocked = isCityAccessible(city, memoryCount);
          const active = city.id === activeCityId;
          const label = active ? activeCityName : city.name;

          return (
            <button
              key={city.id}
              type="button"
              className={`hub-town-city-tab ${active ? 'hub-town-city-tab--active' : ''} ${!unlocked ? 'hub-town-city-tab--locked' : ''} ${city.isCustom ? 'hub-town-city-tab--custom' : ''}`}
              onClick={() => {
                if (!unlocked) {
                  onLockedCityClick?.(city.name);
                  return;
                }
                onCitySwitch(city.id);
              }}
              title={
                unlocked
                  ? `切换到${city.name}`
                  : `在${city.name}写下 1 条回忆后解锁`
              }
            >
              {!unlocked && <Lock className="w-2.5 h-2.5" />}
              {city.isCustom && <span className="hub-town-tab-dot" aria-hidden />}
              {label}
            </button>
          );
        })}

        {addingCity ? (
          <div className="hub-town-add-city">
            <input
              className="hub-town-name-input hub-town-name-input--compact"
              value={newCityName}
              onChange={e => setNewCityName(e.target.value)}
              placeholder="小镇名称"
              maxLength={24}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') commitNewCity();
                if (e.key === 'Escape') {
                  setAddingCity(false);
                  setNewCityName('');
                }
              }}
            />
            <button type="button" className="hub-town-icon-btn" onClick={commitNewCity} aria-label="创建小镇">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="hub-town-city-tab hub-town-city-tab--add"
            onClick={() => setAddingCity(true)}
            title="手动添加新小镇"
          >
            <Plus className="w-3 h-3" />
            新建
          </button>
        )}
      </div>

      <div className="hub-town-controls-row hub-town-controls-actions">
        <button
          type="button"
          className={`hub-town-action-btn ${layoutEdit ? 'hub-town-action-btn--active' : ''}`}
          onClick={() => onLayoutEditChange(!layoutEdit)}
        >
          <Move className="w-3.5 h-3.5" />
          {layoutEdit ? '完成布局' : '调整布局'}
        </button>
        {layoutEdit && (
          <button type="button" className="hub-town-action-btn hub-town-action-btn--ghost" onClick={onResetLayout}>
            <RotateCcw className="w-3.5 h-3.5" />
            恢复默认
          </button>
        )}
      </div>
    </div>
  );
}
