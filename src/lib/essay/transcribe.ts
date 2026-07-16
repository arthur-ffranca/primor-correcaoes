export function normalizeTranscription(rawText: string) {
  return rawText.replace(/\s+/g, " ").trim();
}
