import type { EssayIssue } from "@/lib/essay/types";
import {
  getExecutiveIssues,
  getIssueCategoryLabel,
  getIssueDiscountLabel,
  getIssueSourceLabel,
} from "@/lib/essay/issues";

export function IssuesTable({ issues }: { issues: EssayIssue[] }) {
  if (issues.length === 0) {
    return <p>Nenhum problema identificado na analise preliminar.</p>;
  }

  const executiveIssues = getExecutiveIssues(issues);

  return (
    <section className="impact-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Prioridade de correção</p>
          <h2>Maiores descontos</h2>
        </div>
        <span>Top {executiveIssues.length}</span>
      </div>
      <p className="section-note">Lista enxuta com os problemas que mais explicam a perda de nota.</p>
      <div className="table-scroll">
        <table className="impact-table">
          <thead>
            <tr>
              <th>Trecho</th>
              <th>Categoria técnica</th>
              <th>Desconto</th>
              <th>Por que tirou nota</th>
              <th>Sugestão</th>
            </tr>
          </thead>
          <tbody>
            {executiveIssues.map((issue, index) => (
              <tr key={`${issue.type}-${index}`}>
                <td>
                  <span className="quote-chip">{issue.quote}</span>
                </td>
                <td>
                  <span>{getIssueCategoryLabel(issue)}</span>
                  {issue.source === "professora" || issue.sourceLabel ? (
                    <span className="source-badge">{getIssueSourceLabel(issue)}</span>
                  ) : null}
                </td>
                <td>
                  <strong className="impact-score">{getIssueDiscountLabel(issue)}</strong>
                </td>
                <td>{issue.explanation}</td>
                <td>{issue.suggestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
