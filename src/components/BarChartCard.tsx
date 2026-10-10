import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardDescription, CardTitle } from './ui/card';

type BarChartCardProps = {
  id: string;
  title: string;
  description?: string;
  data: Array<{ name: string; quantidade: number; percent: number }>;
  color: string;
  className?: string;
};

export default function BarChartCard({
  id,
  title,
  description = 'Inscrições e participação no total',
  data,
  color,
  className = '',
}: BarChartCardProps) {
  return (
    <Card id={id} className={`panel-surface chart-card ${className}`}>
      <CardTitle>{title}</CardTitle>
      <CardDescription className="panel-caption">{description}</CardDescription>
      <div className="chart-shell small-chart">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={112}
              tickLine={false}
              axisLine={false}
              tickFormatter={(name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name)}
            />
            <Tooltip
              cursor={{ fill: '#f3f7f3' }}
              formatter={(value, _name, item) => [
                `${Number(value).toLocaleString('pt-BR')} · ${Number(item.payload.percent).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
                'Inscrições',
              ]}
            />
            <Bar dataKey="quantidade" radius={[0, 6, 6, 0]} fill={color} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
