import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { convertRawScoreToThousand } from "@/lib/essay/score";

type ApproveEssayPayload = {
  approvedTranscription: string;
  approvedIssues: unknown[];
  approvedCriterionScores: Record<string, number>;
};

export async function POST(request: Request, context: { params: Promise<{ essayId: string }> }) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { essayId } = await context.params;
  const body = (await request.json()) as ApproveEssayPayload;
  const totalRawScore = Object.values(body.approvedCriterionScores).reduce((sum, value) => sum + Number(value), 0);

  await db.finalReview.upsert({
    where: { essaySubmissionId: essayId },
    update: {
      approvedTranscription: body.approvedTranscription,
      approvedIssuesPayload: body.approvedIssues,
      approvedCriterionScoresPayload: body.approvedCriterionScores,
      approvedTotalRawScore: totalRawScore,
      approvedTotal1000Score: convertRawScoreToThousand(totalRawScore, 8.5),
      approvedAt: new Date(),
    },
    create: {
      essaySubmissionId: essayId,
      approvedTranscription: body.approvedTranscription,
      approvedIssuesPayload: body.approvedIssues,
      approvedCriterionScoresPayload: body.approvedCriterionScores,
      approvedTotalRawScore: totalRawScore,
      approvedTotal1000Score: convertRawScoreToThousand(totalRawScore, 8.5),
      approvedAt: new Date(),
    },
  });

  await db.essaySubmission.update({
    where: { id: essayId },
    data: { status: "approved" },
  });

  return NextResponse.json({ ok: true });
}
