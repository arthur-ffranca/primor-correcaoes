import {
  getCriterionLabel,
  getExecutiveIssues as selectExecutiveIssues,
  getIssueCategoryLabel,
  getIssueDiscountLabel,
  getIssueSourceLabel,
  isEssayIssue,
} from "@/lib/essay/issues";
import type { EssayIssue } from "@/lib/essay/types";

type ApprovedEssayDownload = {
  studentName: string;
  classGroup: string;
  theme: string;
  finalReview: {
    approvedTranscription: string;
    approvedIssuesPayload: unknown;
    approvedCriterionScoresPayload: unknown;
    approvedTotalRawScore: number;
    approvedTotal1000Score: number;
  } | null;
};

export function getExecutiveIssues(issues: EssayIssue[], limit = 5) {
  return selectExecutiveIssues(issues, limit);
}

export function renderApprovedReportHtml(input: ApprovedEssayDownload) {
  const criteria = normalizeCriteria(input.finalReview?.approvedCriterionScoresPayload);
  const issues = normalizeIssues(input.finalReview?.approvedIssuesPayload);
  const executiveIssues = getExecutiveIssues(issues);
  const rawScore = input.finalReview?.approvedTotalRawScore ?? 0;
  const thousandScore = input.finalReview?.approvedTotal1000Score ?? 0;

  return `
    <html lang="pt-BR">
      <body>
        <h1>Relatório executivo de correção</h1>
        <p><strong>Aluno:</strong> ${escapeHtml(input.studentName)}</p>
        <p><strong>Turma:</strong> ${escapeHtml(input.classGroup)}</p>
        <p><strong>Tema:</strong> ${escapeHtml(input.theme)}</p>
        <p><strong>Nota: ${rawScore} / 8.5</strong> (${thousandScore} / 1000)</p>

        <h2>Resumo para decisão</h2>
        <p>${renderExecutiveSummary(executiveIssues)}</p>

        <h2>Maiores descontos</h2>
        ${renderExecutiveIssues(executiveIssues)}

        <h2>Notas por critério</h2>
        ${renderCriteria(criteria)}

        <h2>Transcrição aprovada</h2>
        <article>${escapeHtml(input.finalReview?.approvedTranscription ?? "")}</article>
      </body>
    </html>
  `;
}

function normalizeIssues(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isEssayIssue);
}

function normalizeCriteria(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number"),
  );
}

function renderExecutiveSummary(issues: EssayIssue[]) {
  if (issues.length === 0) {
    return "A redação não teve problemas relevantes registrados na revisão aprovada.";
  }

  const mainCriteria = Array.from(new Set(issues.flatMap((issue) => issue.impactedCriteria)))
    .slice(0, 3)
    .map((criterion) => getCriterionLabel(criterion))
    .join(", ");

  return `Os maiores descontos se concentram em ${escapeHtml(mainCriteria)}. A leitura deve priorizar os trechos abaixo, pois eles explicam a maior parte da perda de nota.`;
}

function renderExecutiveIssues(issues: EssayIssue[]) {
  if (issues.length === 0) {
    return "<p>Nenhum desconto relevante registrado.</p>";
  }

  return `
    <ol>
      ${issues
        .map(
          (issue) => `
            <li>
              <p><strong>Trecho:</strong> "${escapeHtml(issue.quote)}"</p>
              <p><strong>Categoria técnica:</strong> ${escapeHtml(getIssueCategoryLabel(issue))}</p>
              ${renderIssueSource(issue)}
              <p><strong>Por que tirou nota:</strong> ${escapeHtml(issue.explanation)}</p>
              <p><strong>Como melhorar:</strong> ${escapeHtml(issue.suggestion)}</p>
              ${issue.teacherComment ? `<p><strong>Comentário da professora:</strong> ${escapeHtml(issue.teacherComment)}</p>` : ""}
              <p><strong>Desconto estimado:</strong> ${getIssueDiscountLabel(issue)}</p>
              ${issue.impactSummary ? `<p><strong>Resumo do desconto:</strong> ${escapeHtml(issue.impactSummary)}</p>` : ""}
            </li>
          `,
        )
        .join("")}
    </ol>
  `;
}

function renderIssueSource(issue: EssayIssue) {
  if (issue.source !== "professora" && !issue.sourceLabel) {
    return "";
  }

  return `<p><strong>Origem:</strong> ${escapeHtml(getIssueSourceLabel(issue))}</p>`;
}

function renderCriteria(criteria: Record<string, number>) {
  const rows = Object.entries(criteria)
    .map(([criterion, score]) => {
      const label = getCriterionLabel(criterion);
      return `<tr><td>${escapeHtml(label)}</td><td>${score}</td></tr>`;
    })
    .join("");

  return `<table><tbody>${rows}</tbody></table>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
