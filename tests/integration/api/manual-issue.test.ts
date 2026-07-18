import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findEssayMock = vi.fn();
const createReviewVersionMock = vi.fn();
const updateReviewVersionMock = vi.fn();

const perfectScores = {
  genre: 2,
  purpose: 2,
  interlocution: 1,
  image: 1,
  sourceText: 1,
  cohesionAndCoherence: 1,
  grammar: 0.5,
  aesthetics: 0,
};

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    essaySubmission: {
      findFirst: findEssayMock,
    },
    reviewVersion: {
      create: createReviewVersionMock,
      update: updateReviewVersionMock,
    },
  },
}));

function version() {
  return {
    id: "version_2",
    essaySubmissionId: "essay_1",
    versionNumber: 2,
    source: "ai_adjusted",
    teacherInstruction: "Reavaliar ortografia.",
    transcriptionSnapshot: "Texto transcrito.",
    issuesPayload: [],
    criterionScoresPayload: perfectScores,
    totalRawScore: 8.5,
    total1000Score: 1000,
    teacherNotes: null,
  };
}

describe("POST /api/essays/[essayId]/manual-issue", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "teacher@example.com",
      },
    });
  });

  it("appends a teacher issue to the current review table and discounts the criterion", async () => {
    findEssayMock.mockResolvedValue({
      id: "essay_1",
      userId: "user_1",
      transcription: {
        rawText: "Texto transcrito.",
        normalizedText: "Texto normalizado.",
      },
      preliminaryAnalysis: {
        issuesPayload: [],
        criterionScoresPayload: perfectScores,
        totalRawScore: 8.5,
        total1000Score: 1000,
      },
      reviewVersions: [version()],
    });
    updateReviewVersionMock.mockResolvedValue({
      ...version(),
      issuesPayload: [
        {
          quote: "comentarem mau",
          type: "Ortografia",
          explanation: "Uso incorreto de mau.",
          suggestion: "Trocar por mal.",
          impactedCriteria: ["grammar"],
          grammarAspect: "orthography",
          scoreImpact: 0.2,
          source: "professora",
          sourceLabel: "Feito pela professora",
          teacherComment: "Trocar por mal.",
        },
      ],
      criterionScoresPayload: {
        ...perfectScores,
        grammar: 0.3,
      },
      totalRawScore: 8.3,
      total1000Score: 976,
    });

    const { POST } = await import("@/app/api/essays/[essayId]/manual-issue/route");
    const response = await POST(
      new Request("http://localhost/api/essays/essay_1/manual-issue", {
        method: "POST",
        body: JSON.stringify({
          quote: "comentarem mau",
          category: "Ortografia",
          scoreImpact: 0.2,
          explanation: "Uso incorreto de mau.",
          teacherComment: "Trocar por mal.",
        }),
      }),
      { params: Promise.resolve({ essayId: "essay_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.issues[0].sourceLabel).toBe("Feito pela professora");
    expect(payload.criterionScores.grammar).toBe(0.3);
    expect(updateReviewVersionMock).toHaveBeenCalledWith({
      where: { id: "version_2" },
      data: expect.objectContaining({
        teacherNotes: "Trocar por mal.",
        totalRawScore: 8.3,
        total1000Score: 976,
      }),
    });
  });
});
