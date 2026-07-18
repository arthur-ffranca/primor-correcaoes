export type CriterionKey =
  | "genre"
  | "purpose"
  | "interlocution"
  | "image"
  | "sourceText"
  | "cohesionAndCoherence"
  | "grammar"
  | "aesthetics";

export type GrammarAspect = "accentuation" | "agreement" | "orthography";

export type EssayIssue = {
  quote: string;
  type: string;
  explanation: string;
  suggestion: string;
  impactedCriteria: CriterionKey[];
  grammarAspect?: GrammarAspect;
  severity?: "critical" | "high" | "medium" | "low";
  scoreImpact?: number;
  impactSummary?: string;
  source?: "ia" | "professora";
  sourceLabel?: string;
  teacherComment?: string;
};

export type EssayImageInput = {
  buffer: Buffer | Uint8Array;
  mimeType: string;
  filename?: string;
};

export type EssayPipelineInput = {
  rawText: string;
  imageQuality: "good" | "poor";
  images?: EssayImageInput[];
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
