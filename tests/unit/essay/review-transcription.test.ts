import { describe, expect, it } from "vitest";
import { getReviewTranscription } from "@/lib/essay/review-transcription";

describe("getReviewTranscription", () => {
  it("uses raw text with paragraph breaks instead of an older flattened normalized text", () => {
    const transcription = getReviewTranscription({
      rawText:
        "Aos meus seguidores, tenho quase um milhao.\n\n" +
        "Quero compartilhar com voces minha historia.",
      normalizedText:
        "Aos meus seguidores, tenho quase um milhao. Quero compartilhar com voces minha historia.",
    });

    expect(transcription).toBe(
      "Aos meus seguidores, tenho quase um milhão.\n\n" +
        "Quero compartilhar com vocês minha história.",
    );
  });

  it("repairs common OCR accent loss for older flattened transcriptions", () => {
    const transcription = getReviewTranscription({
      rawText: "",
      normalizedText:
        "Lembro-me de comecar a gravar videos por diversao. " +
        "Eu nao via que faco esse tipo de trabalho e que sao indicios de trabalho infantil.",
    });

    expect(transcription).toContain("começar");
    expect(transcription).toContain("vídeos");
    expect(transcription).toContain("diversão");
    expect(transcription).toContain("não");
    expect(transcription).toContain("faço");
    expect(transcription).toContain("são indícios");
  });
});
