import { Card, CardDescription, CardTitle } from './ui/card';

type DataTableProps<T extends Record<string, string | number>> = {
  id?: string;
  title: string;
  description?: string;
  columns: Array<keyof T>;
  rows: T[];
  className?: string;
};

export default function DataTable<T extends Record<string, string | number>>({
  id,
  title,
  description,
  columns,
  rows,
  className = '',
}: DataTableProps<T>) {
  if (!rows.length) {
    return (
      <Card id={id} className={`panel-surface ${className}`}>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription className="panel-caption">{description}</CardDescription>}
        <p className="empty-state">Nenhum dado para exibir.</p>
      </Card>
    );
  }

  return (
    <Card id={id} className={`panel-surface ${className}`}>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription className="panel-caption">{description}</CardDescription>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column)}>{String(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => (
                  <td key={`${title}-${String(column)}-${index}`}>{row[column] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
