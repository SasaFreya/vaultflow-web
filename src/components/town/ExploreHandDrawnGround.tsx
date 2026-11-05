import type { LifeCityId } from '@/types/life-town';
import type { TownTimeOfDay } from '@/lib/town-time-of-day';
import { getMapSeason, type MapSeason } from '@/lib/map-season';

interface ExploreHandDrawnGroundProps {
  cityId: LifeCityId | string;
  timeOfDay?: TownTimeOfDay;
}

function ShenzhenGround() {
  return (
    <>
      <rect x="0" y="55" width="100" height="45" fill="#B3E5FC" opacity="0.45" />
      <path
        d="M -2 78 Q 25 72 50 76 T 102 74 L 102 100 L -2 100 Z"
        fill="#4FC3F7"
        opacity="0.5"
        stroke="#0288D1"
        strokeWidth="0.35"
      />
      <path d="M 8 62 L 28 58 L 32 70 L 12 74 Z" fill="#ECEFF1" opacity="0.55" stroke="#90A4AE" strokeWidth="0.3" />
      <path d="M 55 40 L 75 36 L 80 50 L 60 54 Z" fill="#FFF3E0" opacity="0.5" stroke="#FFB74D" strokeWidth="0.3" />
      <ellipse cx="20" cy="30" rx="12" ry="8" fill="#A5D6A7" opacity="0.45" />
      <path d="M 70 20 Q 85 15 95 22" fill="none" stroke="#81D4FA" strokeWidth="1.2" opacity="0.6" />
    </>
  );
}

function BeijingGround() {
  return (
    <>
      <path d="M 5 25 L 18 18 L 32 25 L 32 40 L 5 40 Z" fill="#FFCCBC" opacity="0.45" stroke="#E64A19" strokeWidth="0.3" />
      <path d="M 68 22 L 82 16 L 95 24 L 95 38 L 68 38 Z" fill="#FFAB91" opacity="0.4" stroke="#D84315" strokeWidth="0.3" />
      <rect x="38" y="30" width="24" height="18" rx="1" fill="#EFEBE9" opacity="0.5" stroke="#8D6E63" strokeWidth="0.3" />
      <path d="M 38 30 L 50 22 L 62 30" fill="#D7CCC8" stroke="#8D6E63" strokeWidth="0.3" />
      <path
        d="M -2 70 Q 20 66 40 72 T 80 68 T 102 72 L 102 88 Q 60 84 30 86 T -2 82 Z"
        fill="#90CAF9"
        opacity="0.35"
      />
      <path d="M 10 50 L 90 50" stroke="#BCAAA4" strokeWidth="2.5" opacity="0.35" strokeLinecap="round" />
      <path d="M 50 10 L 50 90" stroke="#BCAAA4" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
    </>
  );
}

function ShanghaiGround() {
  return (
    <>
      <path
        d="M -2 65 Q 30 60 55 64 T 102 62 L 102 95 L -2 95 Z"
        fill="#64B5F6"
        opacity="0.5"
        stroke="#1976D2"
        strokeWidth="0.35"
      />
      <rect x="72" y="12" width="4" height="22" rx="0.5" fill="#B0BEC5" opacity="0.55" />
      <rect x="78" y="18" width="3" height="16" rx="0.5" fill="#CFD8DC" opacity="0.5" />
      <rect x="83" y="8" width="5" height="26" rx="0.5" fill="#90A4AE" opacity="0.55" />
      <path d="M 15 45 L 35 40 L 40 55 L 20 60 Z" fill="#FFF8E1" opacity="0.5" stroke="#FFD54F" strokeWidth="0.3" />
      <ellipse cx="25" cy="25" rx="10" ry="7" fill="#C5E1A5" opacity="0.45" />
      <path d="M 8 75 Q 40 70 70 74 T 95 72" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.35" />
    </>
  );
}

function DefaultGround() {
  return (
    <>
      <path
        d="M -2 72 Q 18 68 32 74 T 58 70 T 88 76 L 102 78 L 102 88 Q 70 84 48 86 T 8 82 Z"
        fill="#81D4FA"
        opacity="0.55"
        stroke="#4FC3F7"
        strokeWidth="0.4"
      />
      <ellipse cx="78" cy="28" rx="14" ry="10" fill="#A5D6A7" opacity="0.5" stroke="#66BB6A" strokeWidth="0.35" />
      <ellipse cx="18" cy="22" rx="11" ry="8" fill="#C5E1A5" opacity="0.45" stroke="#9CCC65" strokeWidth="0.3" />
      <path d="M 42 38 L 62 36 L 68 48 L 48 52 Z" fill="#ECEFF1" opacity="0.55" stroke="#B0BEC5" strokeWidth="0.35" />
      <path d="M 50 8 L 50 92" fill="none" stroke="#D7CCC8" strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
      <path d="M 8 55 L 92 55" fill="none" stroke="#D7CCC8" strokeWidth="2.8" strokeLinecap="round" opacity="0.35" />
    </>
  );
}

function SeasonOverlay({ season }: { season: MapSeason }) {
  if (season === 'spring') {
    return (
      <>
        <circle cx="12" cy="18" r="2.5" fill="#F8BBD9" opacity="0.7" />
        <circle cx="88" cy="22" r="2" fill="#F48FB1" opacity="0.65" />
        <circle cx="75" cy="14" r="1.8" fill="#F8BBD9" opacity="0.6" />
        <path d="M 20 16 Q 22 12 24 16" stroke="#E91E63" strokeWidth="0.4" fill="none" opacity="0.5" />
      </>
    );
  }
  if (season === 'summer') {
    return (
      <>
        <circle cx="90" cy="12" r="5" fill="#FFF59D" opacity="0.35" />
        <circle cx="8" cy="35" r="1.2" fill="#8D6E63" opacity="0.5" className="explore-season-cicada" />
        <circle cx="14" cy="38" r="1" fill="#6D4C41" opacity="0.45" className="explore-season-cicada explore-season-cicada--delay" />
      </>
    );
  }
  if (season === 'autumn') {
    return (
      <>
        <ellipse cx="30" cy="20" rx="2.2" ry="1.4" fill="#FF8A65" opacity="0.65" transform="rotate(25 30 20)" />
        <ellipse cx="70" cy="16" rx="2" ry="1.2" fill="#FF7043" opacity="0.6" transform="rotate(-15 70 16)" />
        <ellipse cx="55" cy="28" rx="1.8" ry="1.1" fill="#FFB74D" opacity="0.55" transform="rotate(40 55 28)" />
      </>
    );
  }
  return (
    <>
      <rect x="0" y="0" width="100" height="100" fill="rgba(255,255,255,0.12)" />
      <circle cx="25" cy="30" r="1.5" fill="#fff" opacity="0.75" />
      <circle cx="60" cy="18" r="1.2" fill="#fff" opacity="0.7" />
      <circle cx="82" cy="35" r="1.4" fill="#fff" opacity="0.65" />
    </>
  );
}

function SeasonTwilightOverlay({ season, timeOfDay }: { season: MapSeason; timeOfDay: TownTimeOfDay }) {
  if (timeOfDay === 'morning') {
    return (
      <rect x="0" y="0" width="100" height="100" fill="rgba(255, 236, 179, 0.14)" />
    );
  }
  if (timeOfDay === 'evening') {
    return (
      <>
        <rect x="0" y="0" width="100" height="45" fill="rgba(255, 183, 77, 0.12)" />
        <circle cx="85" cy="18" r="6" fill="#FFB74D" opacity="0.25" />
      </>
    );
  }
  if (timeOfDay === 'night') {
    return <SeasonNightOverlay season={season} timeOfDay={timeOfDay} />;
  }
  return null;
}

function SeasonNightOverlay({ season, timeOfDay }: { season: MapSeason; timeOfDay: TownTimeOfDay }) {
  if (timeOfDay !== 'night') return null;

  if (season === 'autumn') {
    return (
      <>
        <ellipse cx="18" cy="24" rx="2" ry="1.2" fill="#FF7043" opacity="0.55" className="explore-season-night-leaf" />
        <ellipse cx="72" cy="18" rx="1.8" ry="1.1" fill="#FFB74D" opacity="0.5" className="explore-season-night-leaf explore-season-night-leaf--delay" />
        <ellipse cx="45" cy="32" rx="1.6" ry="1" fill="#FF8A65" opacity="0.45" className="explore-season-night-leaf explore-season-night-leaf--delay2" />
        <rect x="0" y="0" width="100" height="100" fill="rgba(20,30,50,0.18)" />
      </>
    );
  }

  if (season === 'summer') {
    return (
      <>
        <circle cx="12" cy="28" r="0.8" fill="#FFF59D" opacity="0.85" className="explore-season-firefly" />
        <circle cx="55" cy="20" r="0.7" fill="#FFF176" opacity="0.8" className="explore-season-firefly explore-season-firefly--delay" />
        <circle cx="82" cy="35" r="0.75" fill="#FFF59D" opacity="0.75" className="explore-season-firefly explore-season-firefly--delay2" />
        <circle cx="35" cy="42" r="0.6" fill="#FFF176" opacity="0.7" className="explore-season-firefly explore-season-firefly--delay3" />
        <rect x="0" y="0" width="100" height="100" fill="rgba(15,25,45,0.15)" />
      </>
    );
  }

  if (season === 'winter') {
    return <rect x="0" y="0" width="100" height="100" fill="rgba(20,30,55,0.22)" />;
  }

  return <rect x="0" y="0" width="100" height="100" fill="rgba(25,35,50,0.12)" />;
}

/** 小镇手绘地表 — 按城市 + 四季 + 昼夜切换底图 */
export default function ExploreHandDrawnGround({ cityId, timeOfDay = 'day' }: ExploreHandDrawnGroundProps) {
  const variant =
    cityId === 'shenzhen' ? 'shenzhen' : cityId === 'beijing' ? 'beijing' : cityId === 'shanghai' ? 'shanghai' : 'default';
  const season = getMapSeason();

  return (
    <svg
      className={`explore-hand-drawn-ground explore-hand-drawn-ground--${variant} explore-hand-drawn-ground--${season} explore-hand-drawn-ground--${timeOfDay}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id={`explore-grass-${variant}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#C8E6C9" />
          <circle cx="1" cy="1" r="0.3" fill="#A5D6A7" opacity="0.6" />
          <circle cx="3" cy="3" r="0.25" fill="#81C784" opacity="0.4" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill={`url(#explore-grass-${variant})`} opacity="0.35" />
      {variant === 'shenzhen' && <ShenzhenGround />}
      {variant === 'beijing' && <BeijingGround />}
      {variant === 'shanghai' && <ShanghaiGround />}
      {variant === 'default' && <DefaultGround />}
      <SeasonOverlay season={season} />
      <SeasonTwilightOverlay season={season} timeOfDay={timeOfDay} />
    </svg>
  );
}
