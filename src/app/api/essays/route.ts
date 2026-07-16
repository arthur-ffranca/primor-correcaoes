import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { runEssayPipeline } from "@/lib/essay/pipeline";
import { createEssaySchema } from "@/lib/validation/essay";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = createEssaySchema.parse(await request.json());

  const submission = await db.essaySubmission.create({
    data: {
      userId: session.user.id,
      studentName: payload.studentName,
      classGroup: payload.classGroup,
      theme: payload.theme,
      submissionDate: new Date(payload.submissionDate),
      status: "processing",
    },
  });

  const analysis = await runEssayPipeline({
    rawText: "",
    imageQuality: "good",
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

  await db.essaySubmission.update({
    where: { id: submission.id },
    data: { status: analysis.status },
  });

  return NextResponse.json(
    {
      id: submission.id,
      status: analysis.status,
    },
    { status: 201 },
  );
}
