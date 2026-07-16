import { getPerfectCriterionScores } from "@/lib/essay/criteria";
import type { EssayIssue } from "@/lib/essay/types";

export function detectEssayIssues(normalizedText: string): EssayIssue[] {
  if (!normalizedText) {
    return [];
  }

  return [];
}

export function scoreEssayFromIssues() {
  return getPerfectCriterionScores();
}
