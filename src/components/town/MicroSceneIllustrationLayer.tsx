import type { BuildingType } from '@/types/life-town';
import type { TownTimeOfDay } from '@/lib/town-time-of-day';

interface MicroSceneIllustrationLayerProps {
  buildingType: BuildingType;
  timeOfDay: TownTimeOfDay;
  wallpaperUrl?: string | null;
}

function GymSvg() {
  return (
    <svg viewBox="0 0 200 120" className="micro-scene-illustration-svg" aria-hidden>
      <rect x="0" y="80" width="200" height="40" fill="#FFE0B2" />
      <rect x="20" y="30" width="160" height="50" rx="4" fill="#FFCC80" stroke="#F57C00" strokeWidth="1" />
      <rect x="40" y="55" width="50" height="8" rx="2" fill="#FFB74D" />
      <ellipse cx="130" cy="58" rx="22" ry="12" fill="#FFF3E0" stroke="#F57C00" strokeWidth="1" />
      <rect x="30" y="20" width="140" height="12" fill="#81D4FA" opacity="0.5" />
    </svg>
  );
}

function LibrarySvg() {
  return (
    <svg viewBox="0 0 200 120" className="micro-scene-illustration-svg" aria-hidden>
      <rect x="0" y="85" width="200" height="35" fill="#C8E6C9" />
      <rect x="25" y="25" width="30" height="60" fill="#A5D6A7" stroke="#388E3C" />
      <rect x="60" y="20" width="30" height="65" fill="#81C784" stroke="#388E3C" />
      <rect x="95" y="28" width="30" height="57" fill="#A5D6A7" stroke="#388E3C" />
      <rect x="130" y="22" width="30" height="63" fill="#66BB6A" stroke="#388E3C" />
      <circle cx="100" cy="18" r="8" fill="#FFF59D" opacity="0.6" />
    </svg>
  );
}

function HomeSvg() {
  return (
    <svg viewBox="0 0 200 120" className="micro-scene-illustration-svg" aria-hidden>
      <rect x="0" y="88" width="200" height="32" fill="#D7CCC8" />
      <path d="M40 70 L100 35 L160 70 L160 95 L40 95 Z" fill="#FFF8E7" stroke="#8D6E63" />
      <rect x="85" y="75" width="30" height="20" fill="#8D6E63" />
      <rect x="55" y="55" width="20" height="15" fill="#81D4FA" opacity="0.5" />
    </svg>
  );
}

function CompanySvg() {
  return (
    <svg viewBox="0 0 200 120" className="micro-scene-illustration-svg" aria-hidden>
      <rect x="0" y="90" width="200" height="30" fill="#BBDEFB" />
      <rect x="50" y="25" width="25" height="65" fill="#90CAF9" stroke="#1565C0" />
      <rect x="80" y="15" width="35" height="75" fill="#64B5F6" stroke="#1565C0" />
      <rect x="120" y="30" width="28" height="60" fill="#BBDEFB" stroke="#1565C0" />
    </svg>
  );
}

function CafeSvg() {
  return (
    <svg viewBox="0 0 200 120" className="micro-scene-illustration-svg" aria-hidden>
      <rect x="0" y="88" width="200" height="32" fill="#FFCCBC" />
      <rect x="30" y="40" width="140" height="48" rx="6" fill="#FFAB91" stroke="#8D6E63" />
      <circle cx="100" cy="55" r="12" fill="#6D4C41" />
      <path d="M112 50 Q125 45 125 55 Q125 65 112 60" fill="none" stroke="#6D4C41" strokeWidth="2" />
    </svg>
  );
}

const ILLU: Record<BuildingType, () => React.ReactElement> = {
  gym: GymSvg,
  library: LibrarySvg,
  home: HomeSvg,
  company: CompanySvg,
  cafe: CafeSvg,
};

export default function MicroSceneIllustrationLayer({
  buildingType,
  timeOfDay,
  wallpaperUrl,
}: MicroSceneIllustrationLayerProps) {
  const Illustration = ILLU[buildingType];
  return (
    <div
      className={`micro-scene-illustration micro-scene-illustration--${buildingType} micro-scene-illustration--${timeOfDay}`}
      aria-hidden
    >
      {wallpaperUrl ? (
        <img src={wallpaperUrl} alt="" className="micro-scene-illustration-aigc" />
      ) : (
        <Illustration />
      )}
    </div>
  );
}
