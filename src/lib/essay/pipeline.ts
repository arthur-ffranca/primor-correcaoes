import { detectEssayIssues, scoreEssayFromIssues } from "@/lib/essay/analyze";
import { normalizeTranscription } from "@/lib/essay/transcribe";
import { convertRawScoreToThousand } from "@/lib/essay/score";
import type { EssayPipelineInput, EssayPipelineResult } from "@/lib/essay/types";

export async function runEssayPipeline(input: EssayPipelineInput): Promise<EssayPipelineResult> {
  if (input.imageQuality === "poor") {
    return {
      status: "needs_resubmission",
      rawText: input.rawText,
      normalizedText: "",
      uncertaintyNotes: ["A foto enviada nao esta legivel o suficiente para uma correcao confiavel."],
      issues: [],
      criterionScores: scoreEssayFromIssues(),
      totalRawScore: 0,
      total1000Score: 0,
      resubmissionReason: "A foto precisa ser reenviada com melhor qualidade.",
    };
  }

  const normalizedText = normalizeTranscription(input.rawText);
  const issues = detectEssayIssues(normalizedText);
  const criterionScores = scoreEssayFromIssues();
  const totalRawScore = Object.values(criterionScores).reduce((sum, value) => sum + value, 0);

  return {
    status: "ready_for_review",
    rawText: input.rawText,
    normalizedText,
    uncertaintyNotes: [],
    issues,
    criterionScores,
    totalRawScore,
    total1000Score: convertRawScoreToThousand(totalRawScore),
  };
}
