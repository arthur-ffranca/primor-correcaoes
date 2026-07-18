import { describe, expect, it } from "vitest";
import { runEssayPipeline } from "@/lib/essay/pipeline";

describe("runEssayPipeline", () => {
  it("marks a readable essay as ready for review", async () => {
    const result = await runEssayPipeline({
      rawText: "Escrevo este post para dialogar com voces sobre minha experiencia.",
      imageQuality: "good",
    });

    expect(result.status).toBe("ready_for_review");
    expect(result.totalRawScore).toBe(8.5);
    expect(result.total1000Score).toBe(1000);
  });

  it("requests resubmission when the image is too poor", async () => {
    const result = await runEssayPipeline({
      rawText: "",
      imageQuality: "poor",
    });

    expect(result.status).toBe("needs_resubmission");
    expect(result.resubmissionReason).toContain("foto");
  });

  it("uses image transcription and analysis when photos are provided", async () => {
    const result = await runEssayPipeline(
      {
        rawText: "",
        imageQuality: "good",
        images: [
          {
            buffer: Buffer.from("fake-image"),
            mimeType: "image/jpeg",
            filename: "redacao.jpg",
          },
        ],
      },
      {
        transcribeImages: async () => ({
          status: "readable",
          rawText: "Aos meus seguidores, escrevo este post para contar minha historia.",
          uncertaintyNotes: ["Linha 2 parcialmente inclinada."],
        }),
        analyzeText: async () => ({
          issues: [
            {
              quote: "contar minha historia",
              type: "Acentuacao",
              explanation: "A palavra historia deve receber acento nesse contexto.",
              suggestion: "contar minha história",
              impactedCriteria: ["grammar"],
              grammarAspect: "accentuation",
              severity: "medium",
              scoreImpact: 0.1,
            },
          ],
          criterionScores: {
            genre: 2,
            purpose: 2,
            interlocution: 1,
            image: 1,
            sourceText: 1,
            cohesionAndCoherence: 1,
            grammar: 0.4,
            aesthetics: 0,
          },
          uncertaintyNotes: [],
        }),
      },
    );

    expect(result.status).toBe("ready_for_review");
    expect(result.normalizedText).toContain("Aos meus seguidores");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.grammarAspect).toBe("accentuation");
    expect(result.totalRawScore).toBe(8.4);
    expect(result.total1000Score).toBe(988);
    expect(result.uncertaintyNotes).toContain("Linha 2 parcialmente inclinada.");
  });

  it("requests resubmission when AI cannot read the photos confidently", async () => {
    const result = await runEssayPipeline(
      {
        rawText: "",
        imageQuality: "good",
        images: [
          {
            buffer: Buffer.from("blurred-image"),
            mimeType: "image/jpeg",
            filename: "redacao-borrada.jpg",
          },
        ],
      },
      {
        transcribeImages: async () => ({
          status: "needs_resubmission",
          rawText: "",
          uncertaintyNotes: ["Foto escura e com muitas linhas ilegiveis."],
        }),
      },
    );

    expect(result.status).toBe("needs_resubmission");
    expect(result.total1000Score).toBe(0);
    expect(result.resubmissionReason).toContain("reenviada");
    expect(result.uncertaintyNotes).toContain("Foto escura e com muitas linhas ilegiveis.");
  });
});
