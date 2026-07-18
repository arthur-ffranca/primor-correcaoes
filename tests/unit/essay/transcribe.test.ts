import { describe, expect, it } from "vitest";
import { normalizeTranscription } from "@/lib/essay/transcribe";

describe("normalizeTranscription", () => {
  it("preserves paragraph breaks while normalizing spaces inside each line", () => {
    const rawText =
      "Aos meus queridos seguidores,   tenho um milhao de seguidores.\n\n" +
      "  Eu quero compartilhar com voces minha historia.  \n\n\n" +
      "Tchauzinho!";

    expect(normalizeTranscription(rawText)).toBe(
      "Aos meus queridos seguidores, tenho um milhão de seguidores.\n\n" +
        "Eu quero compartilhar com vocês minha história.\n\n" +
        "Tchauzinho!",
    );
  });
});
