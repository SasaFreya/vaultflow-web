/** 等轴草地/石板瓦片 — 建筑脚下接地 */
export default function HubTileGround() {
  const tiles: Array<{ x: number; y: number; tone: 'grass' | 'stone' }> = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 9; col++) {
      const stone = (row + col) % 5 === 0;
      tiles.push({
        x: 8 + col * 10.5,
        y: 62 + row * 5.5,
        tone: stone ? 'stone' : 'grass',
      });
    }
  }

  return (
    <svg className="hub-tile-ground" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {tiles.map((t, i) => {
        const w = 9;
        const h = 4.5;
        const fill = t.tone === 'stone' ? '#BCAAA4' : '#A5D6A7';
        const side = t.tone === 'stone' ? '#8D6E63' : '#81C784';
        return (
          <g key={i} transform={`translate(${t.x}, ${t.y})`}>
            <path d={`M0 0 L${w} ${h * 0.4} L${w} ${h} L0 ${h * 0.6} Z`} fill={side} opacity="0.85" />
            <path d={`M0 0 L${w} ${h * 0.4} L${w} ${h * 0.55} L0 ${h * 0.15} Z`} fill={fill} stroke="rgba(93,64,55,0.15)" strokeWidth="0.2" />
          </g>
        );
      })}
    </svg>
  );
}
