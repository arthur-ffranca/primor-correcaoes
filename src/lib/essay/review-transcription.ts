import { normalizeTranscription } from "@/lib/essay/transcribe";

type StoredTranscription = {
  rawText?: string | null;
  normalizedText?: string | null;
} | null;

function hasParagraphBreaks(text: string) {
  return /\n\s*\n/.test(text);
}

export function getReviewTranscription(transcription: StoredTranscription) {
  const rawText = transcription?.rawText ?? "";
  const normalizedText = transcription?.normalizedText ?? "";
  const sourceText =
    hasParagraphBreaks(rawText) && !hasParagraphBreaks(normalizedText)
      ? rawText
      : normalizedText || rawText;

  return normalizeTranscription(sourceText);
}
