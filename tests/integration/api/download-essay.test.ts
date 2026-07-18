import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findEssayMock = vi.fn();
const getObjectBufferMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    essaySubmission: {
      findUniqueOrThrow: findEssayMock,
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  getObjectBuffer: getObjectBufferMock,
}));

describe("GET /api/essays/[essayId]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "teacher@example.com",
      },
    });

    findEssayMock.mockResolvedValue({
      id: "essay_1",
      studentName: "Ana Souza",
      classGroup: "3A",
      theme: "Influenciadores digitais",
      files: [
        {
          storagePath: "users/user_1/essays/essay_1/page-1.jpg",
          mimeType: "image/jpeg",
          pageOrder: 1,
          contentBytes: null,
        },
      ],
      finalReview: {
        approvedTranscription: "Texto aprovado",
        approvedIssuesPayload: [],
        approvedCriterionScoresPayload: {
          genre: 2,
          purpose: 2,
          interlocution: 1,
          image: 1,
          sourceText: 1,
          cohesionAndCoherence: 1,
          grammar: 0.5,
          aesthetics: 0,
        },
        approvedTotalRawScore: 8.5,
        approvedTotal1000Score: 1000,
      },
    });

    getObjectBufferMock.mockResolvedValue(Buffer.from("fake-image"));
  });

  it("returns a zip file for an approved essay", async () => {
    const { GET } = await import("@/app/api/essays/[essayId]/download/route");

    const response = await GET(new Request("http://localhost/api/essays/essay_1/download"), {
      params: Promise.resolve({ essayId: "essay_1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/zip");
    expect(getObjectBufferMock).toHaveBeenCalledWith("users/user_1/essays/essay_1/page-1.jpg");
  });

  it("uses database-stored original photos when object storage was not configured", async () => {
    findEssayMock.mockResolvedValueOnce({
      id: "essay_1",
      studentName: "Ana Souza",
      classGroup: "3A",
      theme: "Influenciadores digitais",
      files: [
        {
          storagePath: "database://essay_1/page-1.png",
          mimeType: "image/png",
          pageOrder: 1,
          contentBytes: Buffer.from("imagem-no-banco"),
        },
      ],
      finalReview: {
        approvedTranscription: "Texto aprovado",
        approvedIssuesPayload: [],
        approvedCriterionScoresPayload: {
          genre: 2,
          purpose: 2,
          interlocution: 1,
          image: 1,
          sourceText: 1,
          cohesionAndCoherence: 1,
          grammar: 0.5,
          aesthetics: 0,
        },
        approvedTotalRawScore: 8.5,
        approvedTotal1000Score: 1000,
      },
    });
    const { GET } = await import("@/app/api/essays/[essayId]/download/route");

    const response = await GET(new Request("http://localhost/api/essays/essay_1/download"), {
      params: Promise.resolve({ essayId: "essay_1" }),
    });

    expect(response.status).toBe(200);
    expect(getObjectBufferMock).not.toHaveBeenCalled();
  });
});
