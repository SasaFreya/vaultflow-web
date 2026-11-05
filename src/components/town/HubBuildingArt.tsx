import type { ReactElement } from 'react';
import type { HubBuildingDef } from '@/lib/town-hub-buildings';
import type { RPGThemeId } from '@/types/rpg';

type BuildingId = HubBuildingDef['id'];

interface SvgProps {
  level: number;
  theme: RPGThemeId;
  streakMonths?: number;
}

const clamp = (lv: number) => Math.min(4, Math.max(1, lv));

function themeClass(theme: RPGThemeId, id: BuildingId) {
  return `hub-building-svg hub-building-svg--${theme} hub-art--${id}`;
}

function GroundShadow({ cx = 60, rx = 42 }: { cx?: number; rx?: number }) {
  return <ellipse className="hub-building-shadow" cx={cx} cy="96" rx={rx} ry="7" />;
}

function WindowCircle({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) {
  return <circle className="hub-window" cx={cx} cy={cy} r={r} fill="#81D4FA" stroke="#4FC3F7" strokeWidth="1.5" />;
}

function ClockHands({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const now = new Date();
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const hourRad = ((h + m / 60) * 30 - 90) * (Math.PI / 180);
  const minRad = (m * 6 - 90) * (Math.PI / 180);
  const hx = cx + Math.cos(hourRad) * (r * 0.45);
  const hy = cy + Math.sin(hourRad) * (r * 0.45);
  const mx = cx + Math.cos(minRad) * (r * 0.65);
  const my = cy + Math.sin(minRad) * (r * 0.65);
  return (
    <g className="hub-art-clock-hands">
      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#5D4037" strokeWidth="2" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#C62828" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2" fill="#5D4037" />
    </g>
  );
}

/** 人生馆：烟囱 + 瓦片 + streak 建筑皮肤 */
function HouseSvg({ level, theme, streakMonths = 0 }: SvgProps) {
  const lv = clamp(level);
  const streak = streakMonths ?? 0;
  return (
    <svg viewBox="0 0 120 100" className={themeClass(theme, 'house')} aria-hidden>
      <GroundShadow rx={46} />
      {streak >= 3 && (
        <>
          <path d="M14 46 L106 46" stroke="#FFD54F" strokeWidth="2" opacity="0.85" />
          <circle cx="20" cy="42" r="2" fill="#FFD54F" />
          <circle cx="100" cy="42" r="2" fill="#FFD54F" />
        </>
      )}
      <path d="M54 54 Q60 88 66 54" fill="none" stroke="#BCAAA4" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {streak >= 1 && (
        <>
          <circle cx="22" cy="72" r="4" fill="#81C784" stroke="#388E3C" strokeWidth="0.8" />
          <rect x="19" y="74" width="6" height="6" rx="1" fill="#8D6E63" />
        </>
      )}
      {streak >= 2 && (
        <path d="M60 16 L64 8 L68 16" fill="#FF8A80" stroke="#C62828" strokeWidth="1" />
      )}
      <path className="hub-roof-side" d="M78 38 L88 42 L88 52 L78 48 Z" fill="#E8A598" />
      <rect className="hub-wall-side" x="88" y="48" width="10" height="30" fill="#E8D5C4" />
      <path className="hub-roof" d="M18 48 L60 18 L102 48 Z" fill="#FFB7C5" stroke="#C4956A" strokeWidth="2" strokeLinejoin="round" />
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1={24 + i * 18} y1={34 + i * 2.5} x2={30 + i * 18} y2={40 + i * 2.5} stroke="#E8A598" strokeWidth="1.5" opacity="0.6" />
      ))}
      <rect className="hub-wall" x="20" y="48" width="68" height="32" rx="3" fill="#FFF8E7" stroke="#C4956A" strokeWidth="2" />
      <rect x="78" y="28" width="8" height="14" rx="1" fill="#E8C9A8" stroke="#C4956A" strokeWidth="1" />
      <rect className="hub-art-smoke-stack" x="80" y="22" width="4" height="8" fill="#8D6E63" />
      <rect className="hub-door" x="52" y="62" width="16" height="18" rx="4" fill="#8D6E63" />
      <WindowCircle cx={36} cy={58} />
      <WindowCircle cx={72} cy={58} />
      <rect className="hub-window-lit hub-window-lit--a" x="34" y="56" width="4" height="4" rx="1" fill="#FFE082" opacity="0" />
      <rect className="hub-window-lit hub-window-lit--b" x="70" y="56" width="4" height="4" rx="1" fill="#FFE082" opacity="0" />
      {lv >= 3 && <rect x="24" y="52" width="14" height="10" rx="2" fill="#FFFBF7" stroke="#C4956A" strokeWidth="1" />}
      {lv >= 4 && <circle cx="92" cy="68" r="5" fill="#FF8A80" />}
    </svg>
  );
}

/** 银行：罗马柱 + 山墙 + 台阶 */
function BankSvg({ level, theme }: SvgProps) {
  const lv = clamp(level);
  const extraCol = lv >= 3;
  return (
    <svg viewBox="0 0 120 100" className={themeClass(theme, 'bank')} aria-hidden>
      <GroundShadow cx={62} rx={52} />
      <rect className="hub-wall-side" x="98" y="44" width="8" height="36" fill="#E6D5A8" />
      <path className="hub-roof-side" d="M98 44 L106 40 L106 48 L98 52 Z" fill="#E6B800" />
      <rect x="14" y="72" width="92" height="6" rx="1" fill="#D7CCC8" />
      <rect x="22" y="68" width="76" height="5" rx="1" fill="#E0E0E0" />
      <rect className="hub-wall" x="14" y="44" width="84" height="28" fill="#FFF8E1" stroke="#D4AF37" strokeWidth="2" />
      <path className="hub-roof" d="M10 44 L60 22 L110 44 Z" fill="#FFC857" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" />
      {[28, 44, 60, 76].slice(0, extraCol ? 4 : 3).map(x => (
        <rect key={x} className="hub-stroke" x={x} y="36" width="8" height="36" rx="4" fill="#FFE082" stroke="#D4AF37" strokeWidth="1.5" />
      ))}
      <rect className="hub-door" x="48" y="58" width="16" height="14" rx="2" fill="#B8860B" />
      <circle className="hub-art-bank-coin" cx="18" cy="78" r="5" fill="#FFC857" stroke="#F5A623" strokeWidth="1" />
      {lv >= 2 && <circle className="hub-art-bank-coin" cx="28" cy="80" r="4" fill="#FFD54F" style={{ animationDelay: '0.5s' }} />}
      {lv >= 4 && (
        <>
          <ellipse cx="96" cy="78" rx="8" ry="3" fill="#FFC857" />
          <ellipse cx="88" cy="80" rx="6" ry="2.5" fill="#FFD54F" />
        </>
      )}
    </svg>
  );
}

/** 心愿树：树干 + 多团树冠 + 树根 */
function WishTreeSvg({ level, theme }: SvgProps) {
  const lv = clamp(level);
  const big = 14 + lv * 3;
  return (
    <svg viewBox="0 0 120 100" className={themeClass(theme, 'wishTree')} aria-hidden>
      <GroundShadow cx={58} rx={34} />
      <path d="M44 88 Q48 92 52 88 Q56 94 60 88 Q64 92 68 88 Q72 94 76 88" fill="none" stroke="#8D6E63" strokeWidth="2.5" strokeLinecap="round" />
      <rect className="hub-art-tree-trunk" x="54" y="58" width="12" height="28" rx="3" fill="#8D6E63" />
      <g className="hub-art-tree-canopy">
        <circle cx="60" cy={42 - lv} r={big} fill="#A8D5BA" stroke="#7ECDB8" strokeWidth="2" />
        <circle cx="42" cy={48 - lv} r={big - 4} fill="#B5EAD7" stroke="#7ECDB8" strokeWidth="1.5" />
        <circle cx="78" cy={46 - lv} r={big - 3} fill="#96D9C1" stroke="#7ECDB8" strokeWidth="1.5" />
      </g>
      {lv >= 2 && <circle cx="38" cy="62" r="5" fill="#FF8A80" />}
      {lv >= 3 && <circle cx="82" cy="58" r="4" fill="#FFC857" />}
      {lv >= 4 && <circle cx="60" cy={22 - lv} r="6" fill="#FFD54F" stroke="#F5A623" strokeWidth="1" />}
    </svg>
  );
}

/** 日历塔：高瘦 + 尖顶 + 钟面 */
function ClockTowerSvg({ level, theme }: SvgProps) {
  const lv = clamp(level);
  const top = 14 - lv;
  const clockY = 52;
  return (
    <svg viewBox="0 0 120 100" className={themeClass(theme, 'clockTower')} aria-hidden>
      <GroundShadow cx={60} rx={22} />
      <rect className="hub-wall-side" x="68" y="36" width="6" height="48" fill="#FFAB91" />
      <rect className="hub-wall" x="46" y="36" width="22" height="52" rx="2" fill="#FFCCBC" stroke="#C62828" strokeWidth="2" />
      <path className="hub-roof" d={`M42 36 L57 ${top} L72 36`} fill="#EF9A9A" stroke="#C62828" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="57" cy={clockY} r={10 + lv * 0.5} fill="#FFF8E1" stroke="#D4AF37" strokeWidth="2.5" />
      <ClockHands cx={57} cy={clockY} r={10 + lv * 0.5} />
      {lv >= 3 && (
        <>
          <rect x="52" y="18" width="10" height="8" fill="#FFC857" stroke="#F5A623" strokeWidth="1" />
          <line x1="57" y1="10" x2="57" y2="18" stroke="#8D6E63" strokeWidth="2" />
          <path d="M57 8 L60 14 L54 14 Z" fill="#FF8A80" />
        </>
      )}
      {lv >= 4 && (
        <>
          <circle cx="38" cy="44" r="3" fill="#81D4FA" className="hub-window" />
          <circle cx="76" cy="42" r="3" fill="#81D4FA" className="hub-window" />
        </>
      )}
    </svg>
  );
}

/** 杂货铺：遮阳篷 + 商品展示 */
function ShopSvg({ level, theme }: SvgProps) {
  const lv = clamp(level);
  return (
    <svg viewBox="0 0 120 100" className={themeClass(theme, 'shop')} aria-hidden>
      <GroundShadow cx={58} rx={38} />
      <rect className="hub-wall-side" x="82" y="48" width="8" height="28" fill="#FFCCBC" />
      <rect className="hub-wall" x="28" y="48" width="54" height="28" rx="2" fill="#FFFBF7" stroke="#BF360C" strokeWidth="2" />
      <path className="hub-art-shop-awning" d="M24 48 Q38 32 52 48 Q66 34 80 48 Q94 36 86 48" fill="#FF8A65" stroke="#BF360C" strokeWidth="2" />
      <rect className="hub-door" x="50" y="62" width="14" height="14" rx="2" fill="#8D6E63" />
      <WindowCircle cx={40} cy={56} r={5} />
      <WindowCircle cx={72} cy={56} r={5} />
      {[0, 1, 2].slice(0, lv).map(i => (
        <rect key={i} x={32 + i * 14} y="78" width="8" height="8" rx="1" fill={['#B5EAD7', '#FFB7C5', '#FFC857'][i]} stroke="#8D6E63" strokeWidth="1" />
      ))}
      {lv >= 3 && <circle cx="60" cy="40" r="4" fill="#FFC857" />}
    </svg>
  );
}

/** 广场：圆形竞技场 + 台阶 + 喷泉 + 旗杆 */
function PlazaSvg({ level, theme }: SvgProps) {
  const lv = clamp(level);
  const tiers = 2 + lv;
  return (
    <svg viewBox="0 0 120 100" className={themeClass(theme, 'plaza')} aria-hidden>
      <GroundShadow cx={60} rx={54} />
      {[0, 1, 2, 3].slice(0, tiers).map(t => (
        <ellipse
          key={t}
          cx="60"
          cy={72 - t * 4}
          rx={48 - t * 8}
          ry={10 - t * 1.5}
          fill={t === 0 ? '#ECEFF1' : '#CFD8DC'}
          stroke="#90A4AE"
          strokeWidth="1.5"
        />
      ))}
      <ellipse cx="60" cy="58" rx="22" ry="8" fill="#B0BEC5" stroke="#78909C" strokeWidth="1.5" />
      <g className="hub-art-plaza-fountain">
        <circle cx="60" cy="54" r="4" fill="#4FC3F7" />
        <circle className="hub-art-fountain-drop" cx="56" cy="48" r="2.5" fill="#81D4FA" />
        <circle className="hub-art-fountain-drop" cx="64" cy="46" r="2" fill="#81D4FA" style={{ animationDelay: '0.4s' }} />
        <circle className="hub-art-fountain-drop" cx="60" cy="44" r="2.2" fill="#B3E5FC" style={{ animationDelay: '0.8s' }} />
      </g>
      <line x1="60" y1="18" x2="60" y2="42" stroke="#8D6E63" strokeWidth="2" />
      <path d="M60 16 L64 24 L56 24 Z" fill="#FF8A80" />
      {lv >= 4 && (
        <>
          <circle cx="34" cy="62" r="4" fill="#FFB7C5" />
          <circle cx="86" cy="60" r="4" fill="#B5EAD7" />
        </>
      )}
    </svg>
  );
}

/** 梦想馆：玻璃样板间 + 星芒 */
function DreamHallSvg({ level, theme }: SvgProps) {
  const lv = clamp(level);
  return (
    <svg viewBox="0 0 120 100" className={themeClass(theme, 'dreamHall')} aria-hidden>
      <GroundShadow rx={40} />
      <rect x="28" y="42" width="64" height="38" rx="6" fill="#F3E5F5" stroke="#CE93D8" strokeWidth="2" />
      <path d="M24 42 L60 22 L96 42 Z" fill="#E1BEE7" stroke="#BA68C8" strokeWidth="2" strokeLinejoin="round" />
      <rect x="36" y="50" width="22" height="18" rx="3" fill="#B3E5FC" stroke="#81D4FA" strokeWidth="1.5" opacity="0.85" />
      <rect x="62" y="50" width="22" height="18" rx="3" fill="#FFECB3" stroke="#FFD54F" strokeWidth="1.5" opacity="0.85" />
      <rect x="52" y="68" width="16" height="12" rx="3" fill="#8D6E63" />
      <path
        className="hub-art-portal-glow"
        d="M54 30 L60 18 L66 30"
        fill="none"
        stroke="#FFD54F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="60" cy="16" r="3" fill="#FFF59D" stroke="#FFC857" strokeWidth="1" />
      {lv >= 2 && (
        <>
          <circle cx="40" cy="36" r="2.5" fill="#FF8A80" />
          <circle cx="80" cy="34" r="2" fill="#B5EAD7" />
        </>
      )}
      {lv >= 3 && (
        <>
          <rect x="44" y="56" width="6" height="4" rx="1" fill="#C68642" />
          <rect x="70" y="58" width="8" height="3" rx="1" fill="#90CAF9" />
        </>
      )}
      {lv >= 4 && (
        <path d="M32 48 Q60 40 88 48" fill="none" stroke="#FFF" strokeWidth="2" opacity="0.6" />
      )}
    </svg>
  );
}

/** 外出：发光传送门 */
function ExploreSvg({ level, theme }: SvgProps) {
  const lv = clamp(level);
  return (
    <svg viewBox="0 0 120 100" className={themeClass(theme, 'explore')} aria-hidden>
      <GroundShadow cx={60} rx={40} />
      <ellipse cx="60" cy="78" rx="36" ry="8" fill="rgba(129,212,250,0.25)" />
      <path
        className="hub-art-portal-glow"
        d="M36 78 Q36 38 60 32 Q84 38 84 78 Q60 88 36 78 Z"
        fill="url(#portalGrad)"
        stroke="#4FC3F7"
        strokeWidth="2.5"
      />
      <defs>
        <linearGradient id="portalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B3E5FC" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0288D1" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path d="M48 78 Q48 48 60 44 Q72 48 72 78" fill="none" stroke="#E1F5FE" strokeWidth="2" opacity="0.8" />
      <circle cx="60" cy="56" r="6" fill="#FFF" opacity="0.9" />
      <path d="M44 62 Q60 52 76 62" fill="none" stroke="#FFC857" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
      {lv >= 3 && (
        <>
          <circle cx="48" cy="50" r="3" fill="#FF8A80" />
          <circle cx="72" cy="52" r="3" fill="#B5EAD7" />
        </>
      )}
    </svg>
  );
}

const ART: Record<BuildingId, (props: SvgProps) => ReactElement> = {
  house: HouseSvg,
  bank: BankSvg,
  wishTree: WishTreeSvg,
  clockTower: ClockTowerSvg,
  shop: ShopSvg,
  plaza: PlazaSvg,
  dreamHall: DreamHallSvg,
  explore: ExploreSvg,
};

interface HubBuildingArtProps {
  buildingId: BuildingId;
  level: number;
  theme: RPGThemeId;
  streakMonths?: number;
}

export default function HubBuildingArt({ buildingId, level, theme, streakMonths }: HubBuildingArtProps) {
  const Component = ART[buildingId] ?? HouseSvg;
  return <Component level={level} theme={theme} streakMonths={buildingId === 'house' ? streakMonths : undefined} />;
}
