import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { scoreEssayFromIssues } from "@/lib/essay/analyze";
import { runEssayPipeline } from "@/lib/essay/pipeline";
import { buildInitialReviewVersion } from "@/lib/essay/review-version";
import { uploadEssayPage } from "@/lib/storage";
import { createEssaySchema } from "@/lib/validation/essay";
import type { EssayImageInput, EssayPipelineResult } from "@/lib/essay/types";

const MAX_ESSAY_FILES = 4;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

type ParsedEssayRequest = {
  studentName: string;
  classGroup: string;
  theme: string;
  submissionDate: string;
  images: EssayImageInput[];
};

function isJsonRequest(request: Request) {
  return request.headers.get("content-type")?.includes("application/json") ?? false;
}

function isFileLike(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "size" in value && "type" in value && "name" in value;
}

async function readFileBuffer(file: File) {
  if ("arrayBuffer" in file && typeof file.arrayBuffer === "function") {
    return Buffer.from(await file.arrayBuffer());
  }

  if ("text" in file && typeof file.text === "function") {
    return Buffer.from(await file.text());
  }

  throw new Error("Nao foi possivel ler o arquivo enviado.");
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function parseMultipartEssayRequest(request: Request): Promise<ParsedEssayRequest | NextResponse> {
  const formData = await request.formData();
  const files = formData.getAll("essayPhotos").filter(isFileLike);

  if (!files.length) {
    return NextResponse.json({ message: "Envie pelo menos uma foto da redacao." }, { status: 400 });
  }

  if (files.length > MAX_ESSAY_FILES) {
    return NextResponse.json({ message: `Envie no maximo ${MAX_ESSAY_FILES} fotos por redacao.` }, { status: 400 });
  }

  const images: EssayImageInput[] = [];

  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Use imagens nos formatos PNG ou JPEG." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: "Cada foto deve ter no maximo 12 MB." }, { status: 400 });
    }

    images.push({
      buffer: await readFileBuffer(file),
      mimeType: file.type,
      filename: file.name,
    });
  }

  const submissionDate = getRequiredString(formData, "submissionDate");
  const normalizedDate = submissionDate.includes("T")
    ? submissionDate
    : new Date(`${submissionDate}T00:00:00.000Z`).toISOString();

  const payload = createEssaySchema.parse({
    studentName: getRequiredString(formData, "studentName"),
    classGroup: getRequiredString(formData, "classGroup"),
    theme: getRequiredString(formData, "theme"),
    submissionDate: normalizedDate,
    files: files.map((file) => file.name || "redacao.jpg"),
  });

  return {
    studentName: payload.studentName,
    classGroup: payload.classGroup,
    theme: payload.theme,
    submissionDate: payload.submissionDate,
    images,
  };
}

async function parseJsonEssayRequest(request: Request): Promise<ParsedEssayRequest> {
  const payload = createEssaySchema.parse(await request.json());

  return {
    studentName: payload.studentName,
    classGroup: payload.classGroup,
    theme: payload.theme,
    submissionDate: payload.submissionDate,
    images: [],
  };
}

function buildAiFailureAnalysis(): EssayPipelineResult {
  return {
    status: "needs_resubmission",
    rawText: "",
    normalizedText: "",
    uncertaintyNotes: ["Nao foi possivel processar a redacao com IA."],
    issues: [],
    criterionScores: scoreEssayFromIssues(),
    totalRawScore: 0,
    total1000Score: 0,
    resubmissionReason: "Nao foi possivel processar a imagem agora. Tente enviar novamente em alguns minutos.",
  };
}

function getImageExtension(mimeType: string) {
  return mimeType === "image/png" ? "png" : "jpg";
}

function createDatabaseStoragePath(input: { essayId: string; pageOrder: number; extension: string }) {
  return `database://${input.essayId}/page-${input.pageOrder}.${input.extension}`;
}

function toPrismaBytes(bytes: Buffer | Uint8Array): Uint8Array<ArrayBuffer> {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied;
}

function hasUsableObjectStorageConfig() {
  const endpoint = process.env.S3_ENDPOINT?.trim();

  if (!endpoint) {
    return false;
  }

  try {
    const url = new URL(endpoint);
    const hostname = url.hostname.toLowerCase();
    return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "0.0.0.0";
  } catch {
    return false;
  }
}

function buildDatabaseStoredPages(input: { essayId: string; images: EssayImageInput[] }) {
  return input.images.map((image, index) => {
    const pageOrder = index + 1;
    const extension = getImageExtension(image.mimeType);

    return {
      essaySubmissionId: input.essayId,
      storagePath: createDatabaseStoragePath({
        essayId: input.essayId,
        pageOrder,
        extension,
      }),
      mimeType: image.mimeType,
      pageOrder,
      contentBytes: toPrismaBytes(image.buffer),
    };
  });
}

async function persistEssayImages(input: {
  userId: string;
  essayId: string;
  images: EssayImageInput[];
}) {
  if (!input.images.length) {
    return;
  }

  if (!hasUsableObjectStorageConfig()) {
    await db.essayFile.createMany({
      data: buildDatabaseStoredPages({
        essayId: input.essayId,
        images: input.images,
      }),
    });
    return;
  }

  try {
    const storedPages = await Promise.all(
      input.images.map((image, index) =>
        uploadEssayPage({
          userId: input.userId,
          essayId: input.essayId,
          pageOrder: index + 1,
          extension: getImageExtension(image.mimeType),
          contentType: image.mimeType,
          body: image.buffer,
        }),
      ),
    );

    await db.essayFile.createMany({
      data: storedPages.map((page) => ({
        essaySubmissionId: input.essayId,
        storagePath: page.key,
        mimeType: page.mimeType,
        pageOrder: page.pageOrder,
      })),
    });
  } catch {
    await db.essayFile.createMany({
      data: buildDatabaseStoredPages({
        essayId: input.essayId,
        images: input.images,
      }),
    });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = isJsonRequest(request) ? await parseJsonEssayRequest(request) : await parseMultipartEssayRequest(request);

  if (parsed instanceof NextResponse) {
    return parsed;
  }

  const submission = await db.essaySubmission.create({
    data: {
      userId: session.user.id,
      studentName: parsed.studentName,
      classGroup: parsed.classGroup,
      theme: parsed.theme,
      submissionDate: new Date(parsed.submissionDate),
      status: "processing",
    },
  });

  let analysis: EssayPipelineResult;

  await persistEssayImages({
    userId: session.user.id,
    essayId: submission.id,
    images: parsed.images,
  });

  try {
    analysis = await runEssayPipeline({
      rawText: "",
      imageQuality: "good",
      images: parsed.images,
    });
  } catch {
    analysis = buildAiFailureAnalysis();
  }

  await db.transcription.create({
    data: {
      essaySubmissionId: submission.id,
      rawText: analysis.rawText,
      normalizedText: analysis.normalizedText,
      uncertaintyNotes: analysis.uncertaintyNotes,
    },
  });

  await db.preliminaryAnalysis.create({
    data: {
      essaySubmissionId: submission.id,
      issuesPayload: analysis.issues,
      criterionScoresPayload: analysis.criterionScores,
      totalRawScore: analysis.totalRawScore,
      total1000Score: analysis.total1000Score,
      processingNotes: analysis.uncertaintyNotes,
    },
  });

  if (analysis.status === "ready_for_review") {
    const initialReviewVersion = buildInitialReviewVersion({
      essaySubmissionId: submission.id,
      transcriptionSnapshot: analysis.rawText,
      issues: analysis.issues,
      criterionScores: analysis.criterionScores,
      totalRawScore: analysis.totalRawScore,
      total1000Score: analysis.total1000Score,
    });

    await db.reviewVersion.create({
      data: {
        ...initialReviewVersion,
        issuesPayload: initialReviewVersion.issuesPayload as Prisma.InputJsonValue,
        criterionScoresPayload: initialReviewVersion.criterionScoresPayload as Prisma.InputJsonValue,
      },
    });
  }

  await db.essaySubmission.update({
    where: { id: submission.id },
    data: { status: analysis.status },
  });

  return NextResponse.json(
    {
      id: submission.id,
      status: analysis.status,
      resubmissionReason: analysis.resubmissionReason,
    },
    { status: 201 },
  );
}
