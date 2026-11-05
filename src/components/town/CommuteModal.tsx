import type { CommuteOption, CommuteType, TownLocation } from '@/types/town';
import { COMMUTE_META } from '@/lib/town-utils';

interface CommuteModalProps {
  location: TownLocation;
  hasVehicle: boolean;
  vehicleEmoji?: string;
  preferred: CommuteType;
  onSelect: (type: CommuteType) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function OptionRow({
  opt,
  selected,
  disabled,
  note,
  onSelect,
}: {
  opt: CommuteOption;
  selected: boolean;
  disabled?: boolean;
  note?: string;
  onSelect: () => void;
}) {
  const meta = COMMUTE_META[opt.type];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="w-full text-left p-3 rounded-xl transition-all disabled:opacity-40"
      style={{
        backgroundColor: selected ? 'rgba(74,144,226,0.12)' : 'var(--rpg-bg)',
        border: `2px solid ${selected ? 'var(--rpg-primary)' : 'var(--rpg-border)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>
          {meta.emoji} {meta.label}
          {opt.line && <span className="text-xs ml-2 opacity-70">{opt.line}</span>}
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--rpg-text-secondary)' }}>
          {opt.duration}分钟 · ¥{opt.cost + (opt.parkingFee ?? 0)}
        </span>
      </div>
      {opt.stations !== undefined && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--rpg-text-secondary)' }}>
          🚇 {opt.stations} 站 · 距家 {note}
        </p>
      )}
      {disabled && (
        <p className="text-[10px] mt-1" style={{ color: '#EF4444' }}>需要拥有对应交通工具</p>
      )}
    </button>
  );
}

export default function CommuteModal({
  location,
  hasVehicle,
  vehicleEmoji,
  preferred,
  onSelect,
  onConfirm,
  onClose,
}: CommuteModalProps) {
  const selected = location.commute.options.find(o => o.type === preferred) ?? location.commute.options[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--rpg-surface)', border: '1px solid var(--rpg-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--rpg-text-secondary)' }}>🏠 家 → {location.icon} {location.name}</p>
          <p className="text-lg font-bold mt-1" style={{ color: 'var(--rpg-text)' }}>
            {location.realWorld.distanceKm} km
          </p>
          {hasVehicle && vehicleEmoji && (
            <p className="text-xs mt-1" style={{ color: 'var(--rpg-accent)' }}>
              {vehicleEmoji} 已停在院子，可开车前往
            </p>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {location.commute.options.map(opt => (
            <OptionRow
              key={opt.type}
              opt={opt}
              selected={preferred === opt.type}
              disabled={(opt.type === 'car' || opt.type === 'bike') && !hasVehicle}
              note={`${location.realWorld.distanceKm}km`}
              onSelect={() => onSelect(opt.type)}
            />
          ))}
        </div>

        {selected && (
          <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'var(--rpg-bg)' }}>
            <p style={{ color: 'var(--rpg-text)' }}>
              预计 {selected.duration} 分钟 · 花费 ¥{selected.cost + (selected.parkingFee ?? 0)}
            </p>
            {selected.type === 'subway' && (
              <p className="mt-1" style={{ color: 'var(--rpg-text-secondary)' }}>
                地铁线路将显示在地图上，与家保持 {location.realWorld.distanceKm}km 对应距离
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onConfirm}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-white"
          style={{ backgroundColor: 'var(--rpg-primary)' }}
        >
          出发前往 {location.name}
        </button>
      </div>
    </div>
  );
}
