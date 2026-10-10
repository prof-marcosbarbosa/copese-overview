export default function DataTable({ title, columns, rows }) {
  if (!rows.length) {
    return (
      <div className="panel panel-surface">
        <h3>{title}</h3>
        <p className="empty-state">Nenhum dado para exibir.</p>
      </div>
    );
  }

  return (
    <div className="panel panel-surface">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => (
                  <td key={`${title}-${column}-${index}`}>{row[column] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
