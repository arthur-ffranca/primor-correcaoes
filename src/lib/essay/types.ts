export type CriterionKey =
  | "genre"
  | "purpose"
  | "interlocution"
  | "image"
  | "sourceText"
  | "cohesionAndCoherence"
  | "grammar"
  | "aesthetics";

export type EssayIssue = {
  quote: string;
  type: string;
  explanation: string;
  suggestion: string;
  impactedCriteria: CriterionKey[];
};

export type EssayPipelineInput = {
  rawText: string;
  imageQuality: "good" | "poor";
};

export type EssayPipelineResult = {
  status: "ready_for_review" | "needs_resubmission";
  rawText: string;
  normalizedText: string;
  uncertaintyNotes: string[];
  issues: EssayIssue[];
  criterionScores: Record<CriterionKey, number>;
  totalRawScore: number;
  total1000Score: number;
  resubmissionReason?: string;
};
