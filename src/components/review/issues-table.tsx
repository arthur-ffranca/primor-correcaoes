import type { EssayIssue } from "@/lib/essay/types";

export function IssuesTable({ issues }: { issues: EssayIssue[] }) {
  if (issues.length === 0) {
    return <p>Nenhum problema identificado na analise preliminar.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Trecho</th>
          <th>Tipo</th>
          <th>Explicacao</th>
          <th>Sugestao</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue, index) => (
          <tr key={`${issue.type}-${index}`}>
            <td>{issue.quote}</td>
            <td>{issue.type}</td>
            <td>{issue.explanation}</td>
            <td>{issue.suggestion}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
