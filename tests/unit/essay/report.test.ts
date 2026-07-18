import { describe, expect, it } from "vitest";
import { getExecutiveIssues, renderApprovedReportHtml } from "@/lib/essay/report";
import type { EssayIssue, GrammarAspect } from "@/lib/essay/types";

function issue(
  quote: string,
  scoreImpact: number,
  explanation = "Problema identificado.",
  grammarAspect?: GrammarAspect,
): EssayIssue {
  return {
    quote,
    type: grammarAspect ? "acentuacao" : "coesao",
    explanation,
    suggestion: "Reescrever o trecho com mais precisao.",
    impactedCriteria: grammarAspect ? ["grammar"] : ["cohesionAndCoherence"],
    grammarAspect,
    severity: scoreImpact >= 0.5 ? "high" : "low",
    scoreImpact,
    impactSummary: `Desconto estimado de ${scoreImpact.toFixed(1)} ponto.`,
  };
}

function internalIssue(type: string, impactedCriteria: EssayIssue["impactedCriteria"], scoreImpact: number): EssayIssue {
  return {
    quote: "comentarem mau de mim",
    type,
    explanation: "Uso incorreto que compromete a norma-padrao.",
    suggestion: "comentarem mal de mim",
    impactedCriteria,
    grammarAspect: impactedCriteria.includes("grammar") ? "orthography" : undefined,
    severity: "high",
    scoreImpact,
    impactSummary: `Desconto estimado de ${scoreImpact.toFixed(1)} ponto.`,
  };
}

function teacherIssue(): EssayIssue {
  return {
    quote: "Apontamento geral",
    type: "Propósito",
    explanation: "O objetivo comunicativo precisa ficar mais direto.",
    suggestion: "Indicar com clareza a intenção do post.",
    impactedCriteria: ["purpose"],
    scoreImpact: 0.4,
    source: "professora",
    sourceLabel: "Feito pela professora",
    teacherComment: "Indicar com clareza a intenção do post.",
  };
}

describe("executive correction report", () => {
  it("prioritizes the highest score-impact issues and limits the list", () => {
    const issues = [
      issue("detalhe pequeno", 0.1),
      issue("problema medio", 0.3),
      issue("erro mais gritante", 0.7),
      issue("segundo maior erro", 0.5),
      issue("terceiro maior erro", 0.4),
      issue("quarto maior erro", 0.35),
      issue("quinto maior erro", 0.25),
    ];

    expect(getExecutiveIssues(issues).map((item) => item.quote)).toEqual([
      "erro mais gritante",
      "segundo maior erro",
      "terceiro maior erro",
      "quarto maior erro",
      "problema medio",
    ]);
  });

  it("renders a concise report focused on biggest discounts", () => {
    const html = renderApprovedReportHtml({
      studentName: "Ana Souza",
      classGroup: "3A",
      theme: "Influenciadores digitais",
      finalReview: {
        approvedTranscription: "Texto aprovado",
        approvedIssuesPayload: [
          issue("detalhe pequeno", 0.1),
          issue("erro mais gritante", 0.7, "A ideia fica vaga e reduz a forca do proposito.", "accentuation"),
        ],
        approvedCriterionScoresPayload: {
          genre: 2,
          purpose: 1.5,
          interlocution: 1,
          image: 1,
          sourceText: 1,
          cohesionAndCoherence: 0.7,
          grammar: 0.3,
          aesthetics: 0.4,
        },
        approvedTotalRawScore: 7.9,
        approvedTotal1000Score: 929,
      },
    });

    expect(html).toContain("Maiores descontos");
    expect(html).toContain("Nota: 7.9 / 8.5");
    expect(html).toContain("erro mais gritante");
    expect(html).toContain("A ideia fica vaga");
    expect(html).toContain("Categoria técnica");
    expect(html).toContain("Acentuação");
    expect(html.indexOf("erro mais gritante")).toBeLessThan(html.indexOf("detalhe pequeno"));
  });

  it("does not expose internal English issue types in the downloadable report", () => {
    const html = renderApprovedReportHtml({
      studentName: "Ana Souza",
      classGroup: "3A",
      theme: "Influenciadores digitais",
      finalReview: {
        approvedTranscription: "Texto aprovado",
        approvedIssuesPayload: [
          internalIssue("grammar", ["grammar"], 0.5),
          internalIssue("cohesionAndCoherence", ["cohesionAndCoherence"], 0.4),
        ],
        approvedCriterionScoresPayload: {
          grammar: 0.3,
          cohesionAndCoherence: 0.7,
        },
        approvedTotalRawScore: 7.1,
        approvedTotal1000Score: 835,
      },
    });

    expect(html).toContain("Categoria técnica");
    expect(html).toContain("Ortografia");
    expect(html).toContain("Coesão e coerência");
    expect(html).toContain("Desconto estimado:</strong> -0,5 ponto");
    expect(html).not.toContain("grammar");
    expect(html).not.toContain("cohesionAndCoherence");
  });

  it("marks teacher-added issues in the downloadable report", () => {
    const html = renderApprovedReportHtml({
      studentName: "Ana Souza",
      classGroup: "3A",
      theme: "Influenciadores digitais",
      finalReview: {
        approvedTranscription: "Texto aprovado",
        approvedIssuesPayload: [teacherIssue()],
        approvedCriterionScoresPayload: {
          purpose: 1.6,
        },
        approvedTotalRawScore: 8.1,
        approvedTotal1000Score: 953,
      },
    });

    expect(html).toContain("Feito pela professora");
    expect(html).toContain("Comentário da professora");
    expect(html).toContain("Indicar com clareza a intenção do post.");
  });
});
