"use client";

import { useState } from "react";
import { IssuesTable } from "@/components/review/issues-table";
import { ScoreCard } from "@/components/review/score-card";
import type { EssayIssue, CriterionKey } from "@/lib/essay/types";

type ReviewShellProps = {
  essayId: string;
  studentName: string;
  classGroup: string;
  theme: string;
  transcription: string;
  issues: EssayIssue[];
  criterionScores: Record<CriterionKey, number>;
  totalRawScore: number;
  total1000Score: number;
};

export function ReviewShell(props: ReviewShellProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleApprove() {
    const response = await fetch(`/api/essays/${props.essayId}/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        approvedTranscription: props.transcription,
        approvedIssues: props.issues,
        approvedCriterionScores: props.criterionScores,
      }),
    });

    if (!response.ok) {
      setStatusMessage("Nao foi possivel aprovar a revisao.");
      return;
    }

    setStatusMessage("Revisao aprovada e salva no historico.");
  }

  return (
    <section>
      <header>
        <h1>{props.studentName}</h1>
        <p>Turma: {props.classGroup}</p>
        <p>Tema: {props.theme}</p>
      </header>

      <article>
        <h2>Transcricao</h2>
        <p>{props.transcription || "Transcricao ainda nao disponivel."}</p>
      </article>

      <IssuesTable issues={props.issues} />
      <ScoreCard
        criterionScores={props.criterionScores}
        totalRawScore={props.totalRawScore}
        total1000Score={props.total1000Score}
      />

      <button type="button" onClick={handleApprove}>
        Aprovar revisao
      </button>

      {statusMessage ? <p>{statusMessage}</p> : null}
    </section>
  );
}
