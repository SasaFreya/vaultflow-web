import { useChartTheme } from '@/hooks/useChartTheme';

const RADIAN = Math.PI / 180;

export function usePieLabelRenderer(minPercent = 0.04) {
  const chartTheme = useChartTheme();

  return (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    name?: string;
    percent?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name = '', percent = 0 } = props;
    if (percent < minPercent) return null;
    const radius = outerRadius + 16;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill={chartTheme.textSecondary}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
}
