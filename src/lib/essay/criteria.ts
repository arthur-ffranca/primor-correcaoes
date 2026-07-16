import type { CriterionKey } from "@/lib/essay/types";

export const UNICAMP_CRITERIA_MAX_SCORES: Record<CriterionKey, number> = {
  genre: 2,
  purpose: 2,
  interlocution: 1,
  image: 1,
  sourceText: 1,
  cohesionAndCoherence: 1,
  grammar: 0.5,
  aesthetics: 0,
};

export function getPerfectCriterionScores(): Record<CriterionKey, number> {
  return { ...UNICAMP_CRITERIA_MAX_SCORES };
}
