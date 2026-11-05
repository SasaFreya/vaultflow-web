export function formatTrendAxis(value: number): string {
  return Math.abs(value) >= 10000
    ? `${Number((value / 10000).toFixed(1))}万`
    : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}
