import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DomainRadarPoint } from '@/lib/explore-ecology-ext';

interface DomainBalanceRadarProps {
  data: DomainRadarPoint[];
}

export default function DomainBalanceRadar({ data }: DomainBalanceRadarProps) {
  if (data.every(d => d.current === 0 && d.previous === 0)) {
    return (
      <p className="text-xs text-center py-6" style={{ color: 'var(--rpg-text-secondary)' }}>
        暂无足够数据绘制雷达图，先记录回忆或导入账单吧。
      </p>
    );
  }

  const chartData = data.map(d => ({
    domain: d.domain,
    本月: d.current,
    上月: d.previous,
  }));

  return (
    <div className="domain-balance-radar" style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="var(--rpg-border)" />
          <PolarAngleAxis dataKey="domain" tick={{ fill: 'var(--rpg-text-secondary)', fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, Math.max(...data.map(d => d.fullMark), 1)]} tick={false} axisLine={false} />
          <Radar name="本月" dataKey="本月" stroke="var(--rpg-primary)" fill="var(--rpg-primary)" fillOpacity={0.35} />
          <Radar name="上月" dataKey="上月" stroke="var(--rpg-gold, #F5A623)" fill="var(--rpg-gold, #F5A623)" fillOpacity={0.2} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
