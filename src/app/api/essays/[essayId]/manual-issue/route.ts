import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  applyIssueDiscount,
  buildTeacherIssue,
} from "@/lib/essay/issues";
import {
  buildInitialReviewVersion,
  getLatestReviewVersion,
} from "@/lib/essay/review-version";
import { convertRawScoreToThousand } from "@/lib/essay/score";
import type { CriterionKey, EssayIssue } from "@/lib/essay/types";

type ManualIssuePayload = {
  quote?: string;
  category?: string;
  scoreImpact?: number;
  explanation?: string;
  teacherComment?: string;
};

type PersistedReviewVersion = {
  id: string;
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

function asIssues(value: unknown) {
  return Array.isArray(value) ? (value as EssayIssue[]) : [];
}

function asCriterionScores(value: unknown) {
  return value as Record<CriterionKey, number>;
}

function sumScores(scores: Record<CriterionKey, number>) {
  return Number(Object.values(scores).reduce((sum, value) => sum + value, 0).toFixed(2));
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

function validatePayload(payload: ManualIssuePayload) {
  const category = payload.category?.trim();
  const explanation = payload.explanation?.trim();
  const teacherComment = payload.teacherComment?.trim();
  const scoreImpact = Number(payload.scoreImpact);

  if (!category || !explanation || !teacherComment || !Number.isFinite(scoreImpact) || scoreImpact <= 0) {
    return null;
  }

  return {
    quote: payload.quote,
    category,
    explanation,
    teacherComment,
    scoreImpact,
  };
}

export async function POST(request: Request, context: { params: Promise<{ essayId: string }> }) {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = validatePayload((await request.json()) as ManualIssuePayload);
  if (!payload) {
    return NextResponse.json(
      { message: "Informe categoria, desconto, por que tirou nota e comentário da professora." },
      { status: 400 },
    );
  }

  const { essayId } = await context.params;
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

  const teacherIssue = buildTeacherIssue(payload);
  const issues = [...asIssues(currentVersion.issuesPayload), teacherIssue];
  const criterionScores = applyIssueDiscount(asCriterionScores(currentVersion.criterionScoresPayload), teacherIssue);
  const totalRawScore = sumScores(criterionScores);

  const updatedVersion = await db.reviewVersion.update({
    where: {
      id: currentVersion.id,
    },
    data: {
      issuesPayload: issues as Prisma.InputJsonValue,
      criterionScoresPayload: criterionScores as Prisma.InputJsonValue,
      totalRawScore,
      total1000Score: convertRawScoreToThousand(totalRawScore),
      teacherNotes: payload.teacherComment,
    },
  });

  return NextResponse.json(responseFromVersion(updatedVersion));
}
