import { detectEssayIssues, scoreEssayFromIssues } from "@/lib/essay/analyze";
import {
  analyzeEssayWithMaritaca,
  transcribeEssayImagesWithMaritaca,
  type MaritacaAnalysisResult,
  type MaritacaTranscriptionResult,
} from "@/lib/essay/maritaca";
import { normalizeTranscription } from "@/lib/essay/transcribe";
import { convertRawScoreToThousand } from "@/lib/essay/score";
import type { EssayImageInput, EssayPipelineInput, EssayPipelineResult } from "@/lib/essay/types";

export type EssayAiClient = {
  transcribeImages?: (images: EssayImageInput[]) => Promise<MaritacaTranscriptionResult>;
  analyzeText?: (normalizedText: string) => Promise<MaritacaAnalysisResult>;
};

function buildResubmissionResult(input: {
  rawText?: string;
  uncertaintyNotes: string[];
  reason: string;
}): EssayPipelineResult {
  return {
    status: "needs_resubmission",
    rawText: input.rawText ?? "",
    normalizedText: "",
    uncertaintyNotes: input.uncertaintyNotes,
    issues: [],
    criterionScores: scoreEssayFromIssues(),
    totalRawScore: 0,
    total1000Score: 0,
    resubmissionReason: input.reason,
  };
}

export async function runEssayPipeline(
  input: EssayPipelineInput,
  aiClient: EssayAiClient = {},
): Promise<EssayPipelineResult> {
  if (input.imageQuality === "poor") {
    return buildResubmissionResult({
      rawText: input.rawText,
      uncertaintyNotes: ["A foto enviada nao esta legivel o suficiente para uma correcao confiavel."],
      reason: "A foto precisa ser reenviada com melhor qualidade.",
    });
  }

  let rawText = input.rawText;
  let uncertaintyNotes: string[] = [];

  if (input.images?.length) {
    const transcribeImages = aiClient.transcribeImages ?? transcribeEssayImagesWithMaritaca;
    const transcription = await transcribeImages(input.images);

    rawText = transcription.rawText;
    uncertaintyNotes = transcription.uncertaintyNotes;

    if (transcription.status === "needs_resubmission") {
      return buildResubmissionResult({
        rawText,
        uncertaintyNotes,
        reason: "A foto precisa ser reenviada, porque a leitura automatica nao ficou confiavel.",
      });
    }
  }

  const normalizedText = normalizeTranscription(rawText);

  if (!normalizedText) {
    return buildResubmissionResult({
      rawText,
      uncertaintyNotes: ["Nao foi possivel extrair texto suficiente para corrigir a redacao."],
      reason: "A foto precisa ser reenviada ou a transcricao precisa ser informada manualmente.",
    });
  }

  let issues = detectEssayIssues(normalizedText);
  let criterionScores = scoreEssayFromIssues();

  if (input.images?.length || aiClient.analyzeText) {
    const analyzeText = aiClient.analyzeText ?? analyzeEssayWithMaritaca;
    const analysis = await analyzeText(normalizedText);

    issues = analysis.issues;
    criterionScores = analysis.criterionScores;
    uncertaintyNotes = [...uncertaintyNotes, ...analysis.uncertaintyNotes];
  }

  const totalRawScore = Number(Object.values(criterionScores).reduce((sum, value) => sum + value, 0).toFixed(2));

  return {
    status: "ready_for_review",
    rawText,
    normalizedText,
    uncertaintyNotes,
    issues,
    criterionScores,
    totalRawScore,
    total1000Score: convertRawScoreToThousand(totalRawScore),
  };
}
