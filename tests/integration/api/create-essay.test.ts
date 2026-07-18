import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const createSubmissionMock = vi.fn();
const createTranscriptionMock = vi.fn();
const createPreliminaryAnalysisMock = vi.fn();
const createReviewVersionMock = vi.fn();
const createEssayFileManyMock = vi.fn();
const updateSubmissionMock = vi.fn();
const runEssayPipelineMock = vi.fn();
const uploadEssayPageMock = vi.fn();
const originalStorageEnv = {
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
};

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    essaySubmission: {
      create: createSubmissionMock,
      update: updateSubmissionMock,
    },
    transcription: {
      create: createTranscriptionMock,
    },
    preliminaryAnalysis: {
      create: createPreliminaryAnalysisMock,
    },
    reviewVersion: {
      create: createReviewVersionMock,
    },
    essayFile: {
      createMany: createEssayFileManyMock,
    },
  },
}));

vi.mock("@/lib/essay/pipeline", () => ({
  runEssayPipeline: runEssayPipelineMock,
}));

vi.mock("@/lib/storage", () => ({
  uploadEssayPage: uploadEssayPageMock,
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

    uploadEssayPageMock.mockImplementation(async (input) => ({
      key: `users/${input.userId}/essays/${input.essayId}/page-${input.pageOrder}.${input.extension}`,
      mimeType: input.contentType,
      pageOrder: input.pageOrder,
    }));

    process.env.S3_ENDPOINT = "https://myttqqsrilaxyicaudfo.storage.supabase.co/storage/v1/s3";
    process.env.S3_REGION = "sa-east-1";
    process.env.S3_BUCKET = "essay-uploads";
    process.env.S3_ACCESS_KEY_ID = "test-access-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";

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

  afterEach(() => {
    for (const [key, value] of Object.entries(originalStorageEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("returns 201 for a valid submission payload", async () => {
    const { POST } = await import("@/app/api/essays/route");

    const request = new Request("http://localhost/api/essays", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
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
    expect(createTranscriptionMock).toHaveBeenCalledWith({
      data: {
        essaySubmissionId: "essay_1",
        rawText: "Texto",
        normalizedText: "Texto",
        uncertaintyNotes: [],
      },
    });
    expect(createPreliminaryAnalysisMock).toHaveBeenCalled();
    expect(createReviewVersionMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        essaySubmissionId: "essay_1",
        versionNumber: 1,
        source: "ai_initial",
        transcriptionSnapshot: "Texto",
        totalRawScore: 8.5,
        total1000Score: 1000,
      }),
    });
    expect(updateSubmissionMock).toHaveBeenCalledWith({
      where: { id: "essay_1" },
      data: { status: "ready_for_review" },
    });
  });

  it("accepts multipart photo uploads and sends images to the pipeline", async () => {
    const { POST } = await import("@/app/api/essays/route");
    const fakeFile = {
      name: "redacao.jpg",
      type: "image/jpeg",
      size: 10,
      arrayBuffer: async () => Buffer.from("fake-image").buffer,
    } as File;
    const formData = {
      get: vi.fn((key: string) => {
        const fields: Record<string, string> = {
          studentName: "Beatriz Lima",
          classGroup: "3B",
          theme: "Trabalho infantil na internet",
          submissionDate: "2026-07-17",
        };
        return fields[key] ?? null;
      }),
      getAll: vi.fn((key: string) => (key === "essayPhotos" ? [fakeFile] : [])),
    } as unknown as FormData;

    const request = new Request("http://localhost/api/essays", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data",
      },
    }) as Request;
    request.formData = vi.fn().mockResolvedValue(formData);

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(201);
    expect(payload.id).toBe("essay_1");
    expect(runEssayPipelineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rawText: "",
        imageQuality: "good",
        images: [
          expect.objectContaining({
            mimeType: "image/jpeg",
            filename: "redacao.jpg",
          }),
        ],
      }),
    );
  });

  it("saves uploaded photos in private storage and registers essay file pages", async () => {
    const { POST } = await import("@/app/api/essays/route");
    const firstImage = Buffer.from("primeira-pagina");
    const secondImage = Buffer.from("segunda-pagina");
    const files = [
      {
        name: "pagina-1.jpg",
        type: "image/jpeg",
        size: firstImage.length,
        arrayBuffer: async () => firstImage.buffer.slice(firstImage.byteOffset, firstImage.byteOffset + firstImage.byteLength),
      },
      {
        name: "pagina-2.png",
        type: "image/png",
        size: secondImage.length,
        arrayBuffer: async () =>
          secondImage.buffer.slice(secondImage.byteOffset, secondImage.byteOffset + secondImage.byteLength),
      },
    ] as File[];
    const formData = {
      get: vi.fn((key: string) => {
        const fields: Record<string, string> = {
          studentName: "Beatriz Lima",
          classGroup: "3B",
          theme: "Trabalho infantil na internet",
          submissionDate: "2026-07-17",
        };
        return fields[key] ?? null;
      }),
      getAll: vi.fn((key: string) => (key === "essayPhotos" ? files : [])),
    } as unknown as FormData;

    const request = new Request("http://localhost/api/essays", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data",
      },
    }) as Request;
    request.formData = vi.fn().mockResolvedValue(formData);

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(201);
    expect(uploadEssayPageMock).toHaveBeenCalledTimes(2);
    expect(uploadEssayPageMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: "user_1",
        essayId: "essay_1",
        pageOrder: 1,
        extension: "jpg",
        contentType: "image/jpeg",
        body: firstImage,
      }),
    );
    expect(uploadEssayPageMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: "user_1",
        essayId: "essay_1",
        pageOrder: 2,
        extension: "png",
        contentType: "image/png",
        body: secondImage,
      }),
    );
    expect(createEssayFileManyMock).toHaveBeenCalledWith({
      data: [
        {
          essaySubmissionId: "essay_1",
          storagePath: "users/user_1/essays/essay_1/page-1.jpg",
          mimeType: "image/jpeg",
          pageOrder: 1,
        },
        {
          essaySubmissionId: "essay_1",
          storagePath: "users/user_1/essays/essay_1/page-2.png",
          mimeType: "image/png",
          pageOrder: 2,
        },
      ],
    });
  });

  it("falls back to private database storage when object storage is unavailable", async () => {
    process.env.S3_ENDPOINT = "http://127.0.0.1:54321/storage/v1/s3";
    const { POST } = await import("@/app/api/essays/route");
    const imageBytes = Buffer.from("imagem-privada");
    const fakeFile = {
      name: "pagina-1.jpg",
      type: "image/jpeg",
      size: imageBytes.length,
      arrayBuffer: async () => imageBytes.buffer.slice(imageBytes.byteOffset, imageBytes.byteOffset + imageBytes.byteLength),
    } as File;
    const formData = {
      get: vi.fn((key: string) => {
        const fields: Record<string, string> = {
          studentName: "Beatriz Lima",
          classGroup: "3B",
          theme: "Trabalho infantil na internet",
          submissionDate: "2026-07-17",
        };
        return fields[key] ?? null;
      }),
      getAll: vi.fn((key: string) => (key === "essayPhotos" ? [fakeFile] : [])),
    } as unknown as FormData;

    const request = new Request("http://localhost/api/essays", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data",
      },
    }) as Request;
    request.formData = vi.fn().mockResolvedValue(formData);

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(201);
    expect(uploadEssayPageMock).not.toHaveBeenCalled();
    expect(createEssayFileManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          essaySubmissionId: "essay_1",
          storagePath: "database://essay_1/page-1.jpg",
          mimeType: "image/jpeg",
          pageOrder: 1,
          contentBytes: expect.any(Uint8Array),
        }),
      ],
    });
    const savedPage = createEssayFileManyMock.mock.calls.at(-1)?.[0].data[0];
    expect(Buffer.from(savedPage.contentBytes).equals(imageBytes)).toBe(true);
  });

  it("marks the submission for resubmission when AI processing fails", async () => {
    runEssayPipelineMock.mockRejectedValueOnce(new Error("Maritaca unavailable"));
    const { POST } = await import("@/app/api/essays/route");

    const request = new Request("http://localhost/api/essays", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentName: "Carla Mendes",
        classGroup: "3C",
        theme: "Influenciadores digitais",
        submissionDate: "2026-07-16T00:00:00.000Z",
        files: ["users/user_1/essays/essay_1/page-1.jpg"],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.status).toBe("needs_resubmission");
    expect(createTranscriptionMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        essaySubmissionId: "essay_1",
        uncertaintyNotes: expect.arrayContaining(["Nao foi possivel processar a redacao com IA."]),
      }),
    });
    expect(createReviewVersionMock).not.toHaveBeenCalled();
    expect(updateSubmissionMock).toHaveBeenCalledWith({
      where: { id: "essay_1" },
      data: { status: "needs_resubmission" },
    });
  });
});
