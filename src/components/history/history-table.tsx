type HistoryRow = {
  id: string;
  studentName: string;
  classGroup: string;
  theme: string;
  status: string;
};

const statusLabel: Record<string, string> = {
  ready_for_review: "Em revisão",
  approved: "Aprovada",
  needs_resubmission: "Reenviar foto",
};

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <section className="empty-card">
        <p className="eyebrow">Histórico vazio</p>
        <h2>Nenhuma redação cadastrada até o momento.</h2>
        <p>Quando a primeira foto for enviada, ela aparecerá aqui para revisão.</p>
      </section>
    );
  }

  return (
    <section className="table-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Fila de trabalho</p>
          <h2>Redações recentes</h2>
        </div>
        <span>{rows.length} item(ns)</span>
      </div>
      <div className="table-scroll">
        <table className="correction-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Turma</th>
              <th>Tema</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.studentName}</strong>
                </td>
                <td>{row.classGroup}</td>
                <td>{row.theme}</td>
                <td>
                  <span className={`status-pill status-${row.status}`}>
                    {statusLabel[row.status] ?? row.status}
                  </span>
                </td>
                <td>
                  <div className="action-row">
                    <a className="button-link" href={`/dashboard/essays/${row.id}`}>
                      Revisar
                    </a>
                    {row.status === "approved" ? (
                      <a className="button-link secondary" href={`/api/essays/${row.id}/download`}>
                        Baixar pacote
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
