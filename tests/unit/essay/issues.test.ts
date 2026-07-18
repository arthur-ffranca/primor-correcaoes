import { describe, expect, it } from "vitest";
import {
  applyIssueDiscount,
  buildTeacherIssue,
  getIssueSourceLabel,
} from "@/lib/essay/issues";
import type { CriterionKey } from "@/lib/essay/types";

const perfectScores: Record<CriterionKey, number> = {
  genre: 2,
  purpose: 2,
  interlocution: 1,
  image: 1,
  sourceText: 1,
  cohesionAndCoherence: 1,
  grammar: 0.5,
  aesthetics: 0,
};

describe("essay issues", () => {
  it("builds a teacher issue marked as professor-made", () => {
    const issue = buildTeacherIssue({
      quote: "as rede social",
      category: "Concordância",
      scoreImpact: 0.2,
      explanation: "Erro de concordância nominal.",
      teacherComment: "Rever plural na expressão.",
    });

    expect(issue).toEqual(
      expect.objectContaining({
        quote: "as rede social",
        type: "Concordância",
        explanation: "Erro de concordância nominal.",
        suggestion: "Rever plural na expressão.",
        impactedCriteria: ["grammar"],
        grammarAspect: "agreement",
        scoreImpact: 0.2,
        source: "professora",
        sourceLabel: "Feito pela professora",
        teacherComment: "Rever plural na expressão.",
      }),
    );
    expect(getIssueSourceLabel(issue)).toBe("Feito pela professora");
  });

  it("uses a general quote when the teacher note is not tied to a specific excerpt", () => {
    const issue = buildTeacherIssue({
      quote: "",
      category: "Propósito",
      scoreImpact: 0.4,
      explanation: "O objetivo comunicativo ficou instável.",
      teacherComment: "Explicar melhor a intenção do post.",
    });

    expect(issue.quote).toBe("Apontamento geral");
    expect(issue.impactedCriteria).toEqual(["purpose"]);
  });

  it("applies the teacher discount to the mapped criterion", () => {
    const issue = buildTeacherIssue({
      quote: "comentarem mau",
      category: "Ortografia",
      scoreImpact: 0.2,
      explanation: "Uso incorreto de mau.",
      teacherComment: "Trocar por mal.",
    });

    expect(applyIssueDiscount(perfectScores, issue)).toEqual({
      ...perfectScores,
      grammar: 0.3,
    });
  });
});
