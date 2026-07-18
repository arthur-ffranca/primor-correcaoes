import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findEssayMock = vi.fn();
const createReviewVersionMock = vi.fn();
const analyzeEssayRevisionMock = vi.fn();

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
    },
  },
}));

vi.mock("@/lib/essay/maritaca", () => ({
  analyzeEssayRevisionWithMaritaca: analyzeEssayRevisionMock,
}));

function version(versionNumber: number) {
  return {
    id: `version_${versionNumber}`,
    essaySubmissionId: "essay_1",
    versionNumber,
    source: versionNumber === 1 ? "ai_initial" : "ai_adjusted",
    teacherInstruction: null,
    transcriptionSnapshot: "Texto transcrito.",
    issuesPayload: [],
    criterionScoresPayload: perfectScores,
    totalRawScore: 8.5,
    total1000Score: 1000,
    teacherNotes: null,
  };
}

describe("POST /api/essays/[essayId]/request-revision", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "teacher@example.com",
      },
    });

    analyzeEssayRevisionMock.mockResolvedValue({
      issues: [
        {
          quote: "comentarem mau",
          type: "Ortografia",
          explanation: "Uso inadequado de mau.",
          suggestion: "comentarem mal",
          impactedCriteria: ["grammar"],
          grammarAspect: "orthography",
          scoreImpact: 0.2,
        },
      ],
      criterionScores: {
        ...perfectScores,
        grammar: 0.3,
      },
      uncertaintyNotes: [],
    });
  });

  it("creates version 1 for old essays and returns an adjusted version 2", async () => {
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
      reviewVersions: [],
    });
    createReviewVersionMock
      .mockResolvedValueOnce(version(1))
      .mockResolvedValueOnce({
        ...version(2),
        teacherInstruction: "Reavaliar ortografia.",
        issuesPayload: [
          {
            quote: "comentarem mau",
            type: "Ortografia",
            explanation: "Uso inadequado de mau.",
            suggestion: "comentarem mal",
            impactedCriteria: ["grammar"],
            grammarAspect: "orthography",
            scoreImpact: 0.2,
          },
        ],
        criterionScoresPayload: {
          ...perfectScores,
          grammar: 0.3,
        },
        totalRawScore: 8.3,
        total1000Score: 976,
      });

    const { POST } = await import("@/app/api/essays/[essayId]/request-revision/route");
    const response = await POST(
      new Request("http://localhost/api/essays/essay_1/request-revision", {
        method: "POST",
        body: JSON.stringify({ teacherInstruction: "Reavaliar ortografia." }),
      }),
      { params: Promise.resolve({ essayId: "essay_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.versionNumber).toBe(2);
    expect(createReviewVersionMock).toHaveBeenCalledTimes(2);
    expect(analyzeEssayRevisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedText: "Texto transcrito.",
        teacherInstruction: "Reavaliar ortografia.",
        previousReview: expect.objectContaining({
          versionNumber: 1,
          totalRawScore: 8.5,
        }),
      }),
    );
  });

  it("blocks a fourth AI review", async () => {
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
      reviewVersions: [version(1), version(2), version(3)],
    });

    const { POST } = await import("@/app/api/essays/[essayId]/request-revision/route");
    const response = await POST(
      new Request("http://localhost/api/essays/essay_1/request-revision", {
        method: "POST",
        body: JSON.stringify({ teacherInstruction: "Rodar novamente." }),
      }),
      { params: Promise.resolve({ essayId: "essay_1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain("limite de 3 revisões");
    expect(analyzeEssayRevisionMock).not.toHaveBeenCalled();
    expect(createReviewVersionMock).not.toHaveBeenCalled();
  });
});
