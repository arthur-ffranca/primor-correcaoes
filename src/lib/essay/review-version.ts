import type { CriterionKey, EssayIssue } from "@/lib/essay/types";

export const MAX_REVIEW_VERSIONS = 3;

export type ReviewVersionSnapshot = {
  essaySubmissionId: string;
  versionNumber: number;
  source: "ai_initial" | "ai_adjusted" | "manual";
  teacherInstruction?: string;
  transcriptionSnapshot: string;
  issuesPayload: EssayIssue[];
  criterionScoresPayload: Record<CriterionKey, number>;
  totalRawScore: number;
  total1000Score: number;
  teacherNotes?: string;
};

type InitialReviewVersionInput = {
  essaySubmissionId: string;
  transcriptionSnapshot: string;
  issues: EssayIssue[];
  criterionScores: Record<CriterionKey, number>;
  totalRawScore: number;
  total1000Score: number;
};

export function buildInitialReviewVersion(input: InitialReviewVersionInput): ReviewVersionSnapshot {
  return {
    essaySubmissionId: input.essaySubmissionId,
    versionNumber: 1,
    source: "ai_initial",
    transcriptionSnapshot: input.transcriptionSnapshot,
    issuesPayload: input.issues,
    criterionScoresPayload: input.criterionScores,
    totalRawScore: input.totalRawScore,
    total1000Score: input.total1000Score,
  };
}

export function getLatestReviewVersion<T extends { versionNumber: number }>(versions: T[]) {
  return versions.reduce<T | null>((latest, version) => {
    if (!latest || version.versionNumber > latest.versionNumber) {
      return version;
    }

    return latest;
  }, null);
}
