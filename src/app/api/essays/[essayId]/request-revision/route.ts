import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { analyzeEssayRevisionWithMaritaca } from "@/lib/essay/maritaca";
import {
  MAX_REVIEW_VERSIONS,
  buildInitialReviewVersion,
  getLatestReviewVersion,
} from "@/lib/essay/review-version";
import { convertRawScoreToThousand } from "@/lib/essay/score";
import type { CriterionKey, EssayIssue } from "@/lib/essay/types";

type RequestRevisionPayload = {
  teacherInstruction?: string;
};

type PersistedReviewVersion = {
  id?: string;
  essaySubmissionId: string;
  versionNumber: number;
  source: string;
  teacherInstruction: string | null;
  transcriptionSnapshot: string;
  issuesPayload: unknown;
  criterionScoresPayload: unknown;
  totalRawScore: number;
  total1000Score: number;
  teacherNotes?: string | null;
};

function sumScores(scores: Record<CriterionKey, number>) {
  return Number(Object.values(scores).reduce((sum, value) => sum + value, 0).toFixed(2));
}

function asIssues(value: unknown) {
  return Array.isArray(value) ? (value as EssayIssue[]) : [];
}

function asCriterionScores(value: unknown) {
  return value as Record<CriterionKey, number>;
}

function responseFromVersion(version: PersistedReviewVersion) {
  return {
    versionNumber: version.versionNumber,
    issues: asIssues(version.issuesPayload),
    criterionScores: asCriterionScores(version.criterionScoresPayload),
    totalRawScore: version.totalRawScore,
    total1000Score: version.total1000Score,
  };
}

export async function POST(request: Request, context: { params: Promise<{ essayId: string }> }) {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { essayId } = await context.params;
  const body = (await request.json()) as RequestRevisionPayload;
  const teacherInstruction = body.teacherInstruction?.trim();

  if (!teacherInstruction) {
    return NextResponse.json({ message: "Informe a orientação da professora para gerar nova revisão." }, { status: 400 });
  }

  const essay = await db.essaySubmission.findFirst({
    where: {
      id: essayId,
      userId: session.user.id,
    },
    include: {
      transcription: true,
      preliminaryAnalysis: true,
      reviewVersions: {
        orderBy: {
          versionNumber: "asc",
        },
      },
    },
  });

  if (!essay?.transcription || !essay.preliminaryAnalysis) {
    return NextResponse.json({ message: "Redação não encontrada para revisão." }, { status: 404 });
  }

  let currentVersion = getLatestReviewVersion(essay.reviewVersions as PersistedReviewVersion[]);

  if (!currentVersion) {
    const initialReviewVersion = buildInitialReviewVersion({
      essaySubmissionId: essay.id,
      transcriptionSnapshot: essay.transcription.rawText || essay.transcription.normalizedText,
      issues: asIssues(essay.preliminaryAnalysis.issuesPayload),
      criterionScores: asCriterionScores(essay.preliminaryAnalysis.criterionScoresPayload),
      totalRawScore: essay.preliminaryAnalysis.totalRawScore,
      total1000Score: essay.preliminaryAnalysis.total1000Score,
    });

    currentVersion = await db.reviewVersion.create({
      data: {
        ...initialReviewVersion,
        issuesPayload: initialReviewVersion.issuesPayload as Prisma.InputJsonValue,
        criterionScoresPayload: initialReviewVersion.criterionScoresPayload as Prisma.InputJsonValue,
      },
    });
  }

  if (currentVersion.versionNumber >= MAX_REVIEW_VERSIONS) {
    return NextResponse.json(
      { message: "Esta redação já atingiu o limite de 3 revisões por IA." },
      { status: 400 },
    );
  }

  const analysis = await analyzeEssayRevisionWithMaritaca({
    normalizedText: currentVersion.transcriptionSnapshot,
    teacherInstruction,
    previousReview: {
      versionNumber: currentVersion.versionNumber,
      issues: asIssues(currentVersion.issuesPayload),
      criterionScores: asCriterionScores(currentVersion.criterionScoresPayload),
      totalRawScore: currentVersion.totalRawScore,
      total1000Score: currentVersion.total1000Score,
    },
  });
  const totalRawScore = sumScores(analysis.criterionScores);
  const nextVersion = await db.reviewVersion.create({
    data: {
      essaySubmissionId: essay.id,
      versionNumber: currentVersion.versionNumber + 1,
      source: "ai_adjusted",
      teacherInstruction,
      transcriptionSnapshot: currentVersion.transcriptionSnapshot,
      issuesPayload: analysis.issues as Prisma.InputJsonValue,
      criterionScoresPayload: analysis.criterionScores as Prisma.InputJsonValue,
      totalRawScore,
      total1000Score: convertRawScoreToThousand(totalRawScore),
    },
  });

  return NextResponse.json(responseFromVersion(nextVersion));
}
