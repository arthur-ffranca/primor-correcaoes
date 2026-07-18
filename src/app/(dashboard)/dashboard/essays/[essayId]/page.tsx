import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ReviewShell } from "@/components/review/review-shell";
import { getReviewTranscription } from "@/lib/essay/review-transcription";
import { MAX_REVIEW_VERSIONS, getLatestReviewVersion } from "@/lib/essay/review-version";
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
      reviewVersions: {
        orderBy: {
          versionNumber: "asc",
        },
      },
    },
  });

  if (!essay || !essay.preliminaryAnalysis) {
    return <p>Redacao nao encontrada.</p>;
  }

  const currentVersion = getLatestReviewVersion(essay.reviewVersions);
  const currentIssues = currentVersion
    ? ((currentVersion.issuesPayload as EssayIssue[]) ?? [])
    : ((essay.preliminaryAnalysis.issuesPayload as EssayIssue[]) ?? []);
  const currentCriterionScores = currentVersion
    ? (currentVersion.criterionScoresPayload as Record<CriterionKey, number>)
    : (essay.preliminaryAnalysis.criterionScoresPayload as Record<CriterionKey, number>);
  const currentRawScore = currentVersion?.totalRawScore ?? essay.preliminaryAnalysis.totalRawScore;
  const current1000Score = currentVersion?.total1000Score ?? essay.preliminaryAnalysis.total1000Score;

  return (
    <ReviewShell
      essayId={essay.id}
      reviewVersionNumber={currentVersion?.versionNumber ?? 1}
      maxReviewVersions={MAX_REVIEW_VERSIONS}
      studentName={essay.studentName}
      classGroup={essay.classGroup}
      theme={essay.theme}
      transcription={getReviewTranscription(essay.transcription)}
      issues={currentIssues}
      criterionScores={currentCriterionScores}
      totalRawScore={currentRawScore}
      total1000Score={current1000Score}
    />
  );
}
