type ApprovedEssayDownload = {
  studentName: string;
  classGroup: string;
  theme: string;
  finalReview: {
    approvedTranscription: string;
    approvedIssuesPayload: unknown[];
    approvedCriterionScoresPayload: Record<string, number>;
    approvedTotalRawScore: number;
    approvedTotal1000Score: number;
  } | null;
};

export function renderApprovedReportHtml(input: ApprovedEssayDownload) {
  const criteria = input.finalReview?.approvedCriterionScoresPayload ?? {};
  const issues = input.finalReview?.approvedIssuesPayload ?? [];

  return `
    <html lang="pt-BR">
      <body>
        <h1>Relatorio de Correcao</h1>
        <p>Aluno: ${input.studentName}</p>
        <p>Turma: ${input.classGroup}</p>
        <p>Tema: ${input.theme}</p>
        <p>Nota Unicamp: ${input.finalReview?.approvedTotalRawScore ?? 0}</p>
        <p>Nota 0-1000: ${input.finalReview?.approvedTotal1000Score ?? 0}</p>
        <h2>Transcricao aprovada</h2>
        <article>${input.finalReview?.approvedTranscription ?? ""}</article>
        <h2>Critrios</h2>
        <pre>${JSON.stringify(criteria, null, 2)}</pre>
        <h2>Apontamentos</h2>
        <pre>${JSON.stringify(issues, null, 2)}</pre>
      </body>
    </html>
  `;
}
