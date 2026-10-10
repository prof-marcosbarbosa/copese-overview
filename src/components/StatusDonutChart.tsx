import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type StatusDonutChartProps = {
  data: Array<{ name: string; value: number }>;
  colors: string[];
};

type LegendEntry = {
  color?: string;
  value?: string | number;
  payload?: { value?: number };
};

function StatusLegend({
  payload = [],
  total,
}: {
  payload?: readonly LegendEntry[];
  total: number;
}) {
  return (
    <div className="chart-legend" role="list" aria-label="Legenda do status de pagamento">
      {payload.map((entry, index) => {
        const count = Number(entry.payload?.value ?? 0);
        const rate = total ? (count / total) * 100 : 0;
        const status = String(entry.value ?? 'Não informado');
        return (
          <div className="chart-legend-item" key={`${status}-${index}`} role="listitem">
            <span
              className="chart-legend-dot"
              style={{ backgroundColor: entry.color ?? '#267653' }}
              aria-hidden="true"
            />
            <span>{status}</span>
            <strong>
              {count.toLocaleString('pt-BR')} · {rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
            </strong>
          </div>
        );
      })}
    </div>
  );
}

export default function StatusDonutChart({ data, colors }: StatusDonutChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="chart-shell payment-chart">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            dataKey="value"
            data={data}
            innerRadius={62}
            outerRadius={96}
            paddingAngle={3}
            stroke="white"
            strokeWidth={3}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => [
              `${Number(value ?? 0).toLocaleString('pt-BR')} · ${total ? ((Number(value ?? 0) / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'}%`,
              String(item.payload.name),
            ]}
          />
          <Legend
            verticalAlign="bottom"
            content={<StatusLegend total={total} />}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
