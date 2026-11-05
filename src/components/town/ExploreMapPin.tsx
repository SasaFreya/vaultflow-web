import type { LocationCategory } from '@/types/town';
import type { BuildingType } from '@/types/life-town';
import type { ExploreNodeEcosystem } from '@/lib/explore-ecosystem';
import { LIFE_DOMAIN_META } from '@/lib/explore-ecosystem';
import type { RPGThemeId } from '@/types/rpg';

const CATEGORY_CLASS: Record<LocationCategory, string> = {
  vocation: 'explore-pin--vocation',
  body: 'explore-pin--body',
  mind: 'explore-pin--mind',
  spirit: 'explore-pin--spirit',
};

const TREND_LABEL = { growing: '🌱生长', stable: '➡️稳定', dormant: '💤休眠' } as const;

interface ExploreMapPinProps {
  name: string;
  category: LocationCategory | 'home';
  buildingType: BuildingType;
  ecosystem?: ExploreNodeEcosystem;
  theme?: RPGThemeId;
  isHome?: boolean;
  layoutEdit?: boolean;
  weatherDormant?: boolean;
  highlighted?: boolean;
  onRename?: (name: string) => void;
}

function PinSvg({
  category,
  isHome,
  buildingType,
  upgradeLevel = 1,
}: {
  category: LocationCategory | 'home';
  isHome?: boolean;
  buildingType: BuildingType;
  upgradeLevel?: number;
}) {
  const microClass = isHome ? 'explore-pin-micro--home' : `explore-pin-micro--${buildingType}`;
  const upgraded = upgradeLevel >= 2;
  const elite = upgradeLevel >= 3;
  const landmark = upgradeLevel >= 4;
  const epic = upgradeLevel >= 5;
  const snowCap = <path className="explore-pin-roof-snow" d="M8 18 L24 8 L40 18 Z" fill="rgba(255,255,255,0.85)" opacity="0" />;

  if (isHome || buildingType === 'home') {
    return (
      <svg viewBox="0 0 48 44" className={`explore-pin-svg explore-pin-svg--iso ${microClass}`} aria-hidden>
        <ellipse cx="24" cy="40" rx="16" ry="3.5" fill="rgba(0,0,0,0.14)" />
        <path d="M14 30 L24 22 L34 30 L34 36 L14 36 Z" fill="#D7CCC8" stroke="#8D6E63" strokeWidth="1.2" />
        <path d="M14 30 L24 22 L24 36 L14 36 Z" fill="#FFF8E7" stroke="#8D6E63" strokeWidth="1.2" />
        <path d="M24 22 L34 30 L24 36 Z" fill="#FFE0B2" stroke="#8D6E63" strokeWidth="1.2" />
        <path className="explore-pin-roof" d="M10 22 L24 10 L38 22 L24 28 Z" fill="#FFB7C5" stroke="#C4956A" strokeWidth="1.3" />
        {snowCap}
        <rect x="20" y="30" width="8" height="6" rx="1" fill="#8D6E63" />
        <g className="explore-pin-steam">
          <circle cx="22" cy="18" r="1.2" fill="rgba(255,255,255,0.7)" />
          <circle cx="26" cy="16" r="1" fill="rgba(255,255,255,0.5)" />
        </g>
      </svg>
    );
  }

  if (buildingType === 'company' || category === 'vocation') {
    return (
      <svg viewBox="0 0 48 44" className={`explore-pin-svg explore-pin-svg--iso ${microClass}`} aria-hidden>
        <ellipse cx="24" cy="40" rx="15" ry="3.5" fill="rgba(0,0,0,0.14)" />
        {landmark ? (
          <>
            <rect x="16" y="8" width="6" height="30" rx="0.5" fill="#90CAF9" stroke="#1565C0" strokeWidth="0.8" />
            <rect x="24" y="4" width="8" height="34" rx="0.5" fill="#64B5F6" stroke="#1565C0" strokeWidth="0.8" />
            <rect x="34" y="10" width="5" height="28" rx="0.5" fill="#BBDEFB" stroke="#1565C0" strokeWidth="0.8" />
            <rect x="18" y="14" width="2" height="3" fill="#FFE082" className="explore-pin-window-glow" />
            <rect x="26" y="12" width="2" height="3" fill="#FFE082" className="explore-pin-window-glow" />
            <rect x="26" y="20" width="2" height="3" fill="#FFE082" className="explore-pin-window-glow explore-pin-window-glow--delay" />
            <rect x="35" y="16" width="2" height="3" fill="#FFE082" className="explore-pin-window-glow" />
            <path className="explore-pin-landmark-antenna" d="M28 4 L28 0 M26 2 L30 2" stroke="#E040FB" strokeWidth="0.8" />
          </>
        ) : (
          <>
            <path d="M12 32 L24 24 L36 32 L36 38 L12 38 Z" fill="#BBDEFB" stroke="#1976D2" strokeWidth="1.2" />
            <path d="M12 32 L24 24 L24 38 L12 38 Z" fill="#E3F2FD" stroke="#1976D2" strokeWidth="1.2" />
            <path d="M24 24 L36 32 L24 38 Z" fill="#90CAF9" stroke="#1976D2" strokeWidth="1.2" />
            <path className="explore-pin-roof" d="M8 24 L24 12 L40 24 L24 30 Z" fill="#64B5F6" stroke="#1565C0" strokeWidth="1.3" />
            {snowCap}
            <rect x="18" y="28" width="3" height="6" rx="0.5" fill="#FFE082" className="explore-pin-window-glow" />
            <rect x="27" y="28" width="3" height="6" rx="0.5" fill="#FFE082" className="explore-pin-window-glow explore-pin-window-glow--delay" />
          </>
        )}
        {upgraded && !landmark && (
          <g className="explore-pin-neon">
            <rect x="11" y="26" width="26" height="1.5" rx="0.5" fill="#E040FB" opacity="0.85" />
            <rect x="13" y="24" width="22" height="1" rx="0.5" fill="#40C4FF" opacity="0.7" />
          </g>
        )}
        {elite && !landmark && (
          <g className="explore-pin-led-scroll">
            <rect x="10" y="13" width="28" height="3" rx="1" fill="#1A237E" opacity="0.85" />
            <rect x="10" y="13" width="8" height="3" rx="1" fill="#00E5FF" className="explore-pin-led-bar" />
          </g>
        )}
      </svg>
    );
  }

  if (buildingType === 'gym' || category === 'body') {
    return (
      <svg viewBox="0 0 48 44" className={`explore-pin-svg explore-pin-svg--iso ${microClass}`} aria-hidden>
        <ellipse cx="24" cy="40" rx="14" ry="3.5" fill="rgba(0,0,0,0.14)" />
        <path d="M14 30 L24 22 L34 30 L34 36 L14 36 Z" fill="#FFCC80" stroke="#F57C00" strokeWidth="1.2" />
        <path d="M14 30 L24 22 L24 36 L14 36 Z" fill="#FFE0B2" stroke="#F57C00" strokeWidth="1.2" />
        <path d="M24 22 L34 30 L24 36 Z" fill="#FFB74D" stroke="#F57C00" strokeWidth="1.2" />
        <path className="explore-pin-roof" d="M12 22 L24 14 L36 22 L24 28 Z" fill="#FFAB40" stroke="#E65100" strokeWidth="1.2" />
        {snowCap}
        <circle cx="24" cy="18" r="5" fill="#FFCC80" stroke="#F57C00" strokeWidth="1.2" />
        {elite && !landmark && !epic && (
          <g className="explore-pin-dumbbell explore-pin-dumbbell--animate">
            <rect x="14" y="30" width="3" height="7" rx="1" fill="#6D4C41" />
            <rect x="31" y="30" width="3" height="7" rx="1" fill="#6D4C41" />
            <rect x="17" y="32" width="14" height="3" rx="1" fill="#5D4037" />
          </g>
        )}
        {epic && (
          <g className="explore-pin-dumbbell-tower">
            <rect x="20" y="6" width="8" height="28" rx="1" fill="#FFB74D" stroke="#E65100" strokeWidth="0.8" />
            <rect x="16" y="10" width="4" height="6" rx="1" fill="#6D4C41" />
            <rect x="28" y="10" width="4" height="6" rx="1" fill="#6D4C41" />
            <rect x="18" y="12" width="12" height="2" rx="0.5" fill="#5D4037" />
          </g>
        )}
      </svg>
    );
  }

  if (buildingType === 'library' || category === 'mind') {
    return (
      <svg viewBox="0 0 48 44" className={`explore-pin-svg explore-pin-svg--iso ${microClass}`} aria-hidden>
        <ellipse cx="24" cy="40" rx="14" ry="3.5" fill="rgba(0,0,0,0.14)" />
        {landmark ? (
          <>
            <rect x="18" y="18" width="12" height="20" fill="#C8E6C9" stroke="#2E7D32" strokeWidth="1" />
            <path d="M14 18 L24 6 L34 18" fill="#81C784" stroke="#2E7D32" strokeWidth="1.2" />
            <rect x="22" y="8" width="4" height="12" fill="#A5D6A7" stroke="#388E3C" strokeWidth="0.8" className="explore-pin-clock-tower" />
            <circle cx="24" cy="12" r="2.5" fill="#FFF8E1" stroke="#F57F17" strokeWidth="0.6" />
            <line x1="24" y1="12" x2="24" y2="10.5" stroke="#5D4037" strokeWidth="0.5" />
            <line x1="24" y1="12" x2="25.2" y2="12.8" stroke="#5D4037" strokeWidth="0.4" />
          </>
        ) : (
          <>
            <path d="M12 30 L24 22 L36 30 L36 38 L12 38 Z" fill="#A5D6A7" stroke="#388E3C" strokeWidth="1.2" />
            <path d="M12 30 L24 22 L24 38 L12 38 Z" fill="#E8F5E9" stroke="#388E3C" strokeWidth="1.2" />
            <path d="M24 22 L36 30 L24 38 Z" fill="#C8E6C9" stroke="#388E3C" strokeWidth="1.2" />
            <path className="explore-pin-roof" d="M10 22 L24 10 L38 22 L24 28 Z" fill="#81C784" stroke="#2E7D32" strokeWidth="1.3" />
            {snowCap}
            <rect x="16" y="28" width="5" height="7" rx="0.5" fill="#66BB6A" className="explore-pin-book-flip" />
            <rect x="27" y="28" width="5" height="7" rx="0.5" fill="#66BB6A" />
          </>
        )}
        {upgraded && !landmark && (
          <g className="explore-pin-lanterns">
            <circle cx="14" cy="20" r="1.8" fill="#FF7043" className="explore-pin-lantern-glow" />
            <circle cx="34" cy="20" r="1.8" fill="#FF7043" className="explore-pin-lantern-glow explore-pin-lantern-glow--delay" />
          </g>
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 44" className={`explore-pin-svg explore-pin-svg--iso ${microClass}`} aria-hidden>
      <ellipse cx="24" cy="40" rx="14" ry="3.5" fill="rgba(0,0,0,0.14)" />
      <path d="M12 30 L24 22 L36 30 L36 38 L12 38 Z" fill="#FFCC80" stroke="#8D6E63" strokeWidth="1.2" />
      <path d="M12 30 L24 22 L24 38 L12 38 Z" fill="#FFF3E0" stroke="#8D6E63" strokeWidth="1.2" />
      <path d="M24 22 L36 30 L24 38 Z" fill="#FFE0B2" stroke="#8D6E63" strokeWidth="1.2" />
      <path className="explore-pin-roof" d="M10 24 Q24 14 38 24 L24 30 Z" fill="#FFAB91" stroke="#8D6E63" strokeWidth="1.2" />
      {snowCap}
      <circle cx="24" cy="32" r="3.5" fill="#6D4C41" />
      <g className="explore-pin-steam explore-pin-steam--cafe">
        <circle cx="22" cy="16" r="1.3" fill="rgba(255,255,255,0.65)" />
        <circle cx="26" cy="14" r="1.1" fill="rgba(255,255,255,0.45)" />
      </g>
      {epic && (
        <g className="explore-pin-cafe-neon">
          <rect x="10" y="8" width="28" height="5" rx="2" fill="#1A237E" opacity="0.9" />
          <text x="24" y="12" textAnchor="middle" fontSize="3.5" fill="#E040FB" className="explore-pin-neon-text">CAFE</text>
        </g>
      )}
    </svg>
  );
}

function vitalityClass(v: ExploreNodeEcosystem['vitality'] | undefined): string {
  if (!v || v === 'dormant') return 'explore-pin--dormant';
  return `explore-pin--${v}`;
}

export default function ExploreMapPin({
  name,
  category,
  buildingType,
  ecosystem,
  theme = 'obi',
  isHome,
  layoutEdit,
  weatherDormant,
  highlighted,
  onRename,
}: ExploreMapPinProps) {
  const cat = isHome ? 'home' : category;
  const categoryClass =
    isHome || category === 'home' ? 'explore-pin--home' : CATEGORY_CLASS[category];
  const domain = LIFE_DOMAIN_META[buildingType];
  const dormant = weatherDormant || !ecosystem || ecosystem.vitality === 'dormant';
  const upgradeLevel = ecosystem?.effectiveLevel ?? 1;
  const anchorCount = ecosystem?.memoryAnchorCount ?? 0;
  const upgradedAnim = upgradeLevel >= 3 ? 'explore-pin--upgraded' : upgradeLevel >= 2 ? 'explore-pin--enhanced' : '';

  return (
    <div
      className={`explore-pin explore-pin--theme-${theme} ${categoryClass} ${vitalityClass(ecosystem?.vitality)} explore-pin--trend-${ecosystem?.trend ?? 'dormant'} ${upgradedAnim} ${highlighted ? 'explore-pin--highlighted' : ''}`}
    >
      {ecosystem && ecosystem.effectiveLevel > 1 && (
        <span className="explore-pin-level">Lv.{ecosystem.effectiveLevel}</span>
      )}
      {anchorCount > 0 && (
        <span className="explore-pin-anchors" title={`${anchorCount} 条回忆锚点`}>
          {Array.from({ length: Math.min(anchorCount, 5) }).map((_, i) => (
            <span key={i} className="explore-pin-anchor-dot" style={{ ['--anchor-i' as string]: i }} />
          ))}
          {anchorCount > 5 && <span className="explore-pin-anchor-more">+{anchorCount - 5}</span>}
        </span>
      )}
      <div className="explore-pin-art">
        <PinSvg
          category={cat}
          isHome={isHome}
          buildingType={buildingType}
          upgradeLevel={upgradeLevel}
        />
        {ecosystem?.vitality === 'vivid' && <span className="explore-pin-pulse" aria-hidden />}
      </div>
      <span className="explore-pin-domain">{domain.label}</span>
      {layoutEdit && onRename ? (
        <input
          className="explore-pin-rename-input"
          defaultValue={name}
          maxLength={16}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onRename((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
          onBlur={e => onRename(e.target.value)}
          aria-label="地点名称"
        />
      ) : (
        <span className="explore-pin-name">{name}</span>
      )}
      {ecosystem && (
        <span className="explore-pin-trend">{TREND_LABEL[ecosystem.trend]}</span>
      )}
      {weatherDormant && (
        <span className="explore-pin-weather-hint">❄️ 雪天休眠</span>
      )}
      {dormant ? (
        <span className="explore-pin-sub explore-pin-sub--muted">尚无投射 · 点我补充</span>
      ) : (
        <>
          <span className="explore-pin-signals">
            💭 {ecosystem!.memoryCount}
            {ecosystem!.financeActivity > 0 && <> · 📊 {ecosystem!.financeActivity}</>}
            {ecosystem!.linkedBillCount > 0 && <> · 🔗 {ecosystem!.linkedBillCount}</>}
          </span>
          {ecosystem!.recentBills.length > 0 && (
            <span className="explore-pin-bills">
              {ecosystem!.recentBills.map(b => b.formatted).join(' · ')}
            </span>
          )}
          {ecosystem!.latestEcho && (
            <span className="explore-pin-echo">
              {ecosystem!.moodEmoji && <span>{ecosystem!.moodEmoji} </span>}
              「{ecosystem!.latestEcho}」
            </span>
          )}
        </>
      )}
    </div>
  );
}
