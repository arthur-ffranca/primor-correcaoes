import { describe, expect, it, vi } from "vitest";
import {
  analyzeEssayRevisionWithMaritaca,
  analyzeEssayWithMaritaca,
  buildMaritacaImageContent,
  parseMaritacaJsonContent,
  transcribeEssayImagesWithMaritaca,
} from "@/lib/essay/maritaca";

describe("Maritaca essay helpers", () => {
  it("builds a private base64 image payload without requiring a public URL", () => {
    const content = buildMaritacaImageContent({
      buffer: Buffer.from("image-bytes"),
      mimeType: "image/jpeg",
      filename: "pagina-1.jpg",
    });

    expect(content.type).toBe("image_url");
    expect(content.image_url.url).toBe(`data:image/jpeg;base64,${Buffer.from("image-bytes").toString("base64")}`);
  });

  it("parses JSON even when the model wraps it in markdown fences", () => {
    const parsed = parseMaritacaJsonContent<{ status: string }>('```json\n{"status":"readable"}\n```');

    expect(parsed.status).toBe("readable");
  });

  it("normalizes a Maritaca unreadable response into resubmission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                status: "needs_resubmission",
                rawText: "",
                uncertaintyNotes: ["Imagem cortada na margem direita."],
              }),
            },
          },
        ],
      }),
    });

    const result = await transcribeEssayImagesWithMaritaca(
      [
        {
          buffer: Buffer.from("image-bytes"),
          mimeType: "image/png",
          filename: "pagina-1.png",
        },
      ],
      {
        apiKey: "test-key",
        fetcher: fetchMock,
      },
    );

    expect(result.status).toBe("needs_resubmission");
    expect(result.uncertaintyNotes).toContain("Imagem cortada na margem direita.");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://chat.maritaca.ai/api/chat/completions",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const requestBody = JSON.stringify(fetchMock.mock.calls[0]?.[1]);
    expect(requestBody).toContain("portugues brasileiro");
    expect(requestBody).toContain("milh\u00e3o");
    expect(requestBody).toContain("voc\u00eas");
    expect(requestBody).toContain("hist\u00f3ria");
    expect(requestBody).toContain("paragrafos");
    expect(requestBody).toContain("linha em branco");
    expect(requestBody).toContain("Nao compacte");
  });

  it("preserves grammar aspect classification in analysis responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                issues: [
                  {
                    quote: "minha historia",
                    type: "Acentuacao",
                    explanation: "A palavra precisa de acento nesse contexto.",
                    suggestion: "minha história",
                    impactedCriteria: ["grammar"],
                    grammarAspect: "accentuation",
                    severity: "medium",
                    scoreImpact: 0.1,
                    impactSummary: "Desconto por acentuacao.",
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
          },
        ],
      }),
    });

    const result = await analyzeEssayWithMaritaca("Texto com minha historia.", {
      apiKey: "test-key",
      fetcher: fetchMock,
    });

    expect(result.issues[0]?.grammarAspect).toBe("accentuation");
    const requestBody = JSON.stringify(fetchMock.mock.calls[0]?.[1]);
    expect(requestBody).toContain("grammarAspect");
    expect(requestBody).toContain("REGRA ZERO");
    expect(requestBody).toContain("Nunca escreva valores internos em ingles");
    expect(requestBody).toContain("Categoria tecnica");
  });

  it("sends teacher instruction and previous review to revision analysis", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                issues: [],
                criterionScores: {
                  genre: 2,
                  purpose: 2,
                  interlocution: 1,
                  image: 1,
                  sourceText: 1,
                  cohesionAndCoherence: 1,
                  grammar: 0.5,
                  aesthetics: 0,
                },
                uncertaintyNotes: [],
              }),
            },
          },
        ],
      }),
    });

    await analyzeEssayRevisionWithMaritaca(
      {
        normalizedText: "Texto da redação.",
        teacherInstruction: "Reavaliar concordância e desconto.",
        previousReview: {
          versionNumber: 1,
          issues: [],
          criterionScores: {
            genre: 2,
            purpose: 2,
            interlocution: 1,
            image: 1,
            sourceText: 1,
            cohesionAndCoherence: 1,
            grammar: 0.5,
            aesthetics: 0,
          },
          totalRawScore: 8.5,
          total1000Score: 1000,
        },
      },
      {
        apiKey: "test-key",
        fetcher: fetchMock,
      },
    );

    const requestBody = JSON.stringify(fetchMock.mock.calls[0]?.[1]);
    expect(requestBody).toContain("Reavaliar concordância e desconto.");
    expect(requestBody).toContain("Revisao anterior");
    expect(requestBody).toContain("REGRA ZERO");
    expect(requestBody).toContain("Nada exibivel a professora pode aparecer em ingles");
  });
});
