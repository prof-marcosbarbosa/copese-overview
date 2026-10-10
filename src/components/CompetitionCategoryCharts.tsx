import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS } from '../lib/dashboard';
import { Card, CardDescription, CardTitle } from './ui/card';

type CompetitionCategory = {
  curso: string;
  categoria: string;
  inscricoes: number;
};

type CategoryValue = {
  name: string;
  value: number;
};

function CategoryPie({
  title,
  data,
  colors,
}: {
  title?: string;
  data: CategoryValue[];
  colors: string[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="competition-pie">
      {title && <h3>{title}</h3>}
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={78}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((item, index) => (
              <Cell key={`${item.name}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => [
              `${Number(value ?? 0).toLocaleString('pt-BR')} · ${total ? ((Number(value ?? 0) / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'}%`,
              String(item.payload.name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="competition-pie-legend" role="list" aria-label={title ? `Categorias de ${title}` : 'Categorias gerais'}>
        {data.map((item, index) => (
          <div className="chart-legend-item" key={`${item.name}-${index}`} role="listitem">
            <span
              className="chart-legend-dot"
              style={{ backgroundColor: colors[index % colors.length] }}
              aria-hidden="true"
            />
            <span>{item.name}</span>
            <strong>
              {item.value.toLocaleString('pt-BR')} · {total ? ((item.value / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'}%
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompetitionCategoryCharts({ categories }: { categories: CompetitionCategory[] }) {
  const { overall, courses, categoryColors } = useMemo(() => {
    const overallCounts = new Map<string, number>();
    const courseCounts = new Map<string, Map<string, number>>();

    categories.forEach(({ curso, categoria, inscricoes }) => {
      overallCounts.set(categoria, (overallCounts.get(categoria) ?? 0) + inscricoes);
      const counts = courseCounts.get(curso) ?? new Map<string, number>();
      counts.set(categoria, (counts.get(categoria) ?? 0) + inscricoes);
      courseCounts.set(curso, counts);
    });

    const overallData = [...overallCounts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((first, second) => second.value - first.value || first.name.localeCompare(second.name, 'pt-BR'));
    const colors = new Map(overallData.map(({ name }, index) => [name, CHART_COLORS[index % CHART_COLORS.length]]));
    const courseData = [...courseCounts.entries()]
      .map(([curso, counts]) => ({
        curso,
        data: [...counts.entries()]
          .map(([name, value]) => ({ name, value }))
          .sort((first, second) => second.value - first.value || first.name.localeCompare(second.name, 'pt-BR')),
      }))
      .sort((first, second) => first.curso.localeCompare(second.curso, 'pt-BR'));

    return { overall: overallData, courses: courseData, categoryColors: colors };
  }, [categories]);

  const overallColors = overall.map((item) => categoryColors.get(item.name) ?? CHART_COLORS[0]);

  if (!overall.length) {
    return null;
  }

  return (
    <Card className="panel-surface wide-panel competition-category-panel">
      <CardTitle>Distribuição das categorias de concorrência</CardTitle>
      <CardDescription className="panel-caption">
        Primeiro, o total geral sem identificar cursos; abaixo, a composição em cada curso.
        Percentuais calculados somente sobre registros com categoria informada.
      </CardDescription>
      <div className="competition-overall">
        <h3>Geral — todos os cursos</h3>
        <CategoryPie data={overall} colors={overallColors} />
      </div>
      <div className="competition-course-grid">
        {courses.map(({ curso, data }) => (
          <div className="competition-course-pie" key={curso}>
            <CategoryPie
              title={curso}
              data={data}
              colors={data.map((item) => categoryColors.get(item.name) ?? CHART_COLORS[0])}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
