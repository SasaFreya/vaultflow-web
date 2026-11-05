/** 温馨小屋 — 统一手绘色板（斜 45° 等轴） */
export const LOFT_PALETTE = {
  outline: '#5D4037',
  outlineLight: '#8D6E63',
  wood: '#C68642',
  woodDark: '#A66B2E',
  woodLight: '#E8B878',
  cream: '#FFF8F0',
  pink: '#FFB7C5',
  pinkDark: '#FF8FAB',
  green: '#81C784',
  greenDark: '#66BB6A',
  leaf: '#A5D6A7',
  mirror: '#B3E5FC',
  mirrorFrame: '#F48FB1',
  bookRed: '#EF9A9A',
  bookBlue: '#90CAF9',
  bookGreen: '#A5D6A7',
  shadow: 'rgba(93, 64, 55, 0.12)',
} as const;

export type LoftFurnitureKind = 'bookshelf' | 'mirror' | 'plant';

interface LoftFurnitureArtProps {
  kind: LoftFurnitureKind;
  size?: number;
  lifted?: boolean;
}

/** 斜 45° 手绘风家具 SVG（等轴透视） */
export default function LoftFurnitureArt({ kind, size = 72, lifted }: LoftFurnitureArtProps) {
  const p = LOFT_PALETTE;
  const filter = lifted ? 'drop-shadow(0 10px 18px rgba(255, 107, 157, 0.35))' : 'drop-shadow(0 6px 12px rgba(93, 64, 55, 0.15))';

  if (kind === 'bookshelf') {
    return (
      <svg width={size} height={size * 0.9} viewBox="0 0 80 72" style={{ filter }} aria-hidden>
        {/* 地面阴影 */}
        <ellipse cx="40" cy="68" rx="28" ry="5" fill={p.shadow} />
        {/* 右侧面 */}
        <path d="M48 28 L68 38 L68 62 L48 52 Z" fill={p.woodDark} stroke={p.outline} strokeWidth="1.2" />
        {/* 顶面 */}
        <path d="M12 28 L48 28 L68 38 L32 38 Z" fill={p.woodLight} stroke={p.outline} strokeWidth="1.2" />
        {/* 正面 */}
        <path d="M12 28 L12 52 L48 62 L48 28 Z" fill={p.wood} stroke={p.outline} strokeWidth="1.5" />
        {/* 隔板 */}
        <line x1="14" y1="38" x2="46" y2="46" stroke={p.outlineLight} strokeWidth="1" />
        <line x1="14" y1="46" x2="46" y2="54" stroke={p.outlineLight} strokeWidth="1" />
        {/* 书 — 斜侧面 */}
        <path d="M18 32 L24 34 L24 42 L18 40 Z" fill={p.bookRed} stroke={p.outline} strokeWidth="0.8" />
        <path d="M26 34 L32 36 L32 44 L26 42 Z" fill={p.bookBlue} stroke={p.outline} strokeWidth="0.8" />
        <path d="M34 36 L40 38 L40 46 L34 44 Z" fill={p.bookGreen} stroke={p.outline} strokeWidth="0.8" />
        <path d="M20 48 L28 50 L28 56 L20 54 Z" fill={p.bookBlue} stroke={p.outline} strokeWidth="0.8" />
        {/* 多肉 */}
        <circle cx="38" cy="50" r="4" fill={p.green} stroke={p.outline} strokeWidth="0.8" />
      </svg>
    );
  }

  if (kind === 'mirror') {
    return (
      <svg width={size} height={size * 0.85} viewBox="0 0 80 68" style={{ filter }} aria-hidden>
        <ellipse cx="40" cy="64" rx="22" ry="4" fill={p.shadow} />
        {/* 支架 */}
        <path d="M34 54 L46 54 L44 62 L36 62 Z" fill={p.wood} stroke={p.outline} strokeWidth="1" />
        {/* 镜框 — 俯视椭圆 */}
        <ellipse cx="40" cy="36" rx="26" ry="14" fill={p.mirrorFrame} stroke={p.outline} strokeWidth="1.5" />
        <ellipse cx="40" cy="36" rx="20" ry="10" fill={p.mirror} stroke={p.outlineLight} strokeWidth="1" />
        {/* 高光 */}
        <ellipse cx="34" cy="33" rx="6" ry="3" fill="rgba(255,255,255,0.45)" />
      </svg>
    );
  }

  // plant
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 80 72" style={{ filter }} aria-hidden>
      <ellipse cx="40" cy="68" rx="24" ry="5" fill={p.shadow} />
      {/* 盆 — 梯形 */}
      <path d="M24 48 L56 48 L52 62 L28 62 Z" fill={p.woodLight} stroke={p.outline} strokeWidth="1.5" />
      <path d="M26 48 L54 48 L52 52 L28 52 Z" fill={p.cream} stroke={p.outlineLight} strokeWidth="0.8" />
      {/* 土 */}
      <path d="M28 48 L52 48 L50 50 L30 50 Z" fill="#A1887F" />
      {/* 叶子 */}
      <ellipse cx="32" cy="38" rx="8" ry="12" fill={p.leaf} stroke={p.outline} strokeWidth="0.8" transform="rotate(-25 32 38)" />
      <ellipse cx="48" cy="36" rx="8" ry="12" fill={p.green} stroke={p.outline} strokeWidth="0.8" transform="rotate(20 48 36)" />
      <ellipse cx="40" cy="30" rx="7" ry="11" fill={p.greenDark} stroke={p.outline} strokeWidth="0.8" />
      {/* 小花 */}
      <circle cx="44" cy="28" r="3" fill={p.pink} stroke={p.outline} strokeWidth="0.6" />
    </svg>
  );
}

export const LOFT_FURNITURE_KIND: Record<'quests' | 'stats' | 'habits', LoftFurnitureKind> = {
  quests: 'bookshelf',
  stats: 'mirror',
  habits: 'plant',
};

export const LOFT_FURNITURE_LABEL: Record<'quests' | 'stats' | 'habits', string> = {
  quests: '副本书架',
  stats: '属性镜',
  habits: '习惯花园',
};
