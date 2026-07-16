import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const updateEssaySubmissionMock = vi.fn();
const upsertFinalReviewMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    finalReview: {
      upsert: upsertFinalReviewMock,
    },
    essaySubmission: {
      update: updateEssaySubmissionMock,
    },
  },
}));

describe("POST /api/essays/[essayId]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "teacher@example.com",
      },
    });

    upsertFinalReviewMock.mockResolvedValue({});
    updateEssaySubmissionMock.mockResolvedValue({});
  });

  it("approves a reviewed correction", async () => {
    const { POST } = await import("@/app/api/essays/[essayId]/approve/route");

    const request = new Request("http://localhost/api/essays/essay_1/approve", {
      method: "POST",
      body: JSON.stringify({
        approvedTranscription: "Texto aprovado",
        approvedIssues: [],
        approvedCriterionScores: {
          genre: 2,
          purpose: 2,
          interlocution: 1,
          image: 1,
          sourceText: 1,
          cohesionAndCoherence: 1,
          grammar: 0.5,
          aesthetics: 0,
        },
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ essayId: "essay_1" }),
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(upsertFinalReviewMock).toHaveBeenCalled();
    expect(updateEssaySubmissionMock).toHaveBeenCalledWith({
      where: { id: "essay_1" },
      data: { status: "approved" },
    });
  });
});
