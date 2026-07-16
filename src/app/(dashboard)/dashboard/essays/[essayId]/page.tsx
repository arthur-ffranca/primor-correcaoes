import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ReviewShell } from "@/components/review/review-shell";
import type { CriterionKey, EssayIssue } from "@/lib/essay/types";

export default async function EssayReviewPage({ params }: { params: Promise<{ essayId: string }> }) {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return <p>Voce precisa entrar para revisar uma redacao.</p>;
  }

  const { essayId } = await params;
  const essay = await db.essaySubmission.findFirst({
    where: {
      id: essayId,
      userId: session.user.id,
    },
    include: {
      transcription: true,
      preliminaryAnalysis: true,
    },
  });

  if (!essay || !essay.preliminaryAnalysis) {
    return <p>Redacao nao encontrada.</p>;
  }

  return (
    <ReviewShell
      essayId={essay.id}
      studentName={essay.studentName}
      classGroup={essay.classGroup}
      theme={essay.theme}
      transcription={essay.transcription?.normalizedText ?? ""}
      issues={(essay.preliminaryAnalysis.issuesPayload as EssayIssue[]) ?? []}
      criterionScores={essay.preliminaryAnalysis.criterionScoresPayload as Record<CriterionKey, number>}
      totalRawScore={essay.preliminaryAnalysis.totalRawScore}
      total1000Score={essay.preliminaryAnalysis.total1000Score}
    />
  );
}
