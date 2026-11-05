/** Label only the first and last saved observations; keep the rest of the line uncluttered. */
export function TrendEndpoint({ cx, cy, label, color, end = false }: { cx?: number; cy?: number; label: string; color: string; end?: boolean }) {
  if (cx === undefined || cy === undefined) return <g />;
  return <g>
    <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="var(--vault-surface)" strokeWidth={2} />
    <text x={cx + (end ? -7 : 7)} y={cy - 12} textAnchor={end ? 'end' : 'start'} fill={color} fontSize={11} fontWeight={600}>{label}</text>
  </g>;
}


export function TrendDateTick({ x = 0, y = 0, label, end, color }: { x?: number; y?: number; label: string; end: boolean; color: string }) {
  return <text x={x} y={y + 14} textAnchor={end ? 'end' : 'start'} fill={color} fontSize={10}>{label}</text>;
}
