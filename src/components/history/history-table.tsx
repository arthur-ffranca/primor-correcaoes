type HistoryRow = {
  id: string;
  studentName: string;
  classGroup: string;
  theme: string;
  status: string;
};

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return <p>Nenhuma redacao cadastrada ate o momento.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Aluno</th>
          <th>Turma</th>
          <th>Tema</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.studentName}</td>
            <td>{row.classGroup}</td>
            <td>{row.theme}</td>
            <td>{row.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
