import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const createSubmissionMock = vi.fn();
const createPreliminaryAnalysisMock = vi.fn();
const updateSubmissionMock = vi.fn();
const runEssayPipelineMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    essaySubmission: {
      create: createSubmissionMock,
      update: updateSubmissionMock,
    },
    preliminaryAnalysis: {
      create: createPreliminaryAnalysisMock,
    },
  },
}));

vi.mock("@/lib/essay/pipeline", () => ({
  runEssayPipeline: runEssayPipelineMock,
}));

describe("POST /api/essays", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "teacher@example.com",
      },
    });

    createSubmissionMock.mockResolvedValue({
      id: "essay_1",
    });

    runEssayPipelineMock.mockResolvedValue({
      status: "ready_for_review",
      rawText: "Texto",
      normalizedText: "Texto",
      uncertaintyNotes: [],
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
    });
  });

  it("returns 201 for a valid submission payload", async () => {
    const { POST } = await import("@/app/api/essays/route");

    const request = new Request("http://localhost/api/essays", {
      method: "POST",
      body: JSON.stringify({
        studentName: "Ana Souza",
        classGroup: "3A",
        theme: "Influenciadores digitais",
        submissionDate: "2026-07-16T00:00:00.000Z",
        files: ["users/user_1/essays/essay_1/page-1.jpg"],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.status).toBe("ready_for_review");
    expect(createSubmissionMock).toHaveBeenCalled();
    expect(createPreliminaryAnalysisMock).toHaveBeenCalled();
    expect(updateSubmissionMock).toHaveBeenCalledWith({
      where: { id: "essay_1" },
      data: { status: "ready_for_review" },
    });
  });
});
