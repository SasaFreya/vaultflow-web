import type { CurrencyCode } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useChartTheme } from '@/hooks/useChartTheme';
import { usePieLabelRenderer } from '@/lib/pie-labels';
import { formatCurrency } from '@/lib/storage';

export interface PieDatum {
  name: string;
  value: number;
  color: string;
}

interface LabeledPieChartProps {
  data: PieDatum[];
  currency?: CurrencyCode;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  minLabelPercent?: number;
}

export function LabeledPieChart({
  data,
  currency = 'CNY',
  height = 220,
  innerRadius = 50,
  outerRadius = 85,
  showLabels = true,
  minLabelPercent = 0.04,
}: LabeledPieChartProps) {
  const chartTheme = useChartTheme();
  const renderLabel = usePieLabelRenderer(minLabelPercent);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center vault-muted text-xs" style={{ height }}>
        暂无数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
          cornerRadius={4}
          label={showLabels ? renderLabel : false}
          labelLine={showLabels ? { stroke: chartTheme.border } : false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0];
            return (
              <div className="rounded-lg border p-2 text-xs" style={{ backgroundColor: chartTheme.surface, borderColor: chartTheme.border }}>
                <p className="vault-muted">{p.name}</p>
                <p className="font-mono font-semibold vault-heading">{formatCurrency(Number(p.value), currency)}</p>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
