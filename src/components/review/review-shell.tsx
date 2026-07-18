"use client";

import { useState } from "react";
import { IssuesTable } from "@/components/review/issues-table";
import { ScoreCard } from "@/components/review/score-card";
import type { EssayIssue, CriterionKey } from "@/lib/essay/types";

type ReviewShellProps = {
  essayId: string;
  reviewVersionNumber: number;
  maxReviewVersions: number;
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
  const [reviewState, setReviewState] = useState({
    issues: props.issues,
    criterionScores: props.criterionScores,
    totalRawScore: props.totalRawScore,
    total1000Score: props.total1000Score,
    reviewVersionNumber: props.reviewVersionNumber,
  });
  const [teacherInstruction, setTeacherInstruction] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const canRequestRevision = reviewState.reviewVersionNumber < props.maxReviewVersions;

  function applyReviewPayload(payload: {
    versionNumber: number;
    issues: EssayIssue[];
    criterionScores: Record<CriterionKey, number>;
    totalRawScore: number;
    total1000Score: number;
  }) {
    setReviewState({
      reviewVersionNumber: payload.versionNumber,
      issues: payload.issues,
      criterionScores: payload.criterionScores,
      totalRawScore: payload.totalRawScore,
      total1000Score: payload.total1000Score,
    });
  }

  async function handleApprove() {
    const response = await fetch(`/api/essays/${props.essayId}/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        approvedTranscription: props.transcription,
        approvedIssues: reviewState.issues,
        approvedCriterionScores: reviewState.criterionScores,
        approvedReviewVersionNumber: reviewState.reviewVersionNumber,
      }),
    });

    if (!response.ok) {
      setStatusMessage("Nao foi possivel aprovar a revisao.");
      return;
    }

    setStatusMessage("Revisao aprovada e salva no historico.");
  }

  async function handleRequestRevision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const instruction = teacherInstruction.trim();
    if (!instruction || !canRequestRevision) {
      return;
    }

    setIsBusy(true);
    const response = await fetch(`/api/essays/${props.essayId}/request-revision`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        teacherInstruction: instruction,
      }),
    });

    setIsBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatusMessage(payload?.message ?? "Nao foi possivel gerar nova revisao.");
      return;
    }

    applyReviewPayload(await response.json());
    setTeacherInstruction("");
    setStatusMessage("Nova revisao gerada para validacao da professora.");
  }

  async function handleManualIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsBusy(true);
    const response = await fetch(`/api/essays/${props.essayId}/manual-issue`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        quote: String(formData.get("quote") ?? ""),
        category: String(formData.get("category") ?? ""),
        scoreImpact: Number(formData.get("scoreImpact") ?? 0),
        explanation: String(formData.get("explanation") ?? ""),
        teacherComment: String(formData.get("teacherComment") ?? ""),
      }),
    });

    setIsBusy(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatusMessage(payload?.message ?? "Nao foi possivel adicionar apontamento da professora.");
      return;
    }

    applyReviewPayload(await response.json());
    form.reset();
    setStatusMessage("Apontamento da professora anexado a tabela.");
  }

  return (
    <section className="review-page">
      <header className="page-hero review-hero">
        <div>
          <p className="eyebrow">Revisão preliminar</p>
          <h1>{props.studentName}</h1>
          <p>{props.theme}</p>
        </div>
        <div className="hero-meta">
          <span>Turma {props.classGroup}</span>
          <span>Revisão {reviewState.reviewVersionNumber} de {props.maxReviewVersions}</span>
          <span>{reviewState.total1000Score} / 1000</span>
        </div>
      </header>

      <div className="review-grid">
        <div className="review-main">
          <article className="transcription-panel">
            <p className="eyebrow">Texto lido</p>
            <h2>Transcrição</h2>
            <div className="transcription-text">
              {props.transcription || "Transcrição ainda não disponível."}
            </div>
          </article>

          <IssuesTable issues={reviewState.issues} />
        </div>

        <aside className="review-side">
          <ScoreCard
            criterionScores={reviewState.criterionScores}
            totalRawScore={reviewState.totalRawScore}
            total1000Score={reviewState.total1000Score}
          />

          <section className="approval-card">
            <p className="eyebrow">Decisão</p>
            <h2>Aprovar devolutiva</h2>
            <p>Ao aprovar, a correção entra no histórico e libera o pacote para download.</p>
            <button className="primary-button" type="button" onClick={handleApprove}>
              Aprovar revisão
            </button>
            {statusMessage ? <p className="form-success">{statusMessage}</p> : null}
          </section>

          <section className="approval-card">
            <p className="eyebrow">Calibração</p>
            <h2>Pedir ajuste da IA</h2>
            {canRequestRevision ? (
              <form className="mini-form" onSubmit={handleRequestRevision}>
                <label htmlFor="teacherInstruction">Orientação da professora</label>
                <textarea
                  id="teacherInstruction"
                  value={teacherInstruction}
                  onChange={(event) => setTeacherInstruction(event.target.value)}
                  placeholder="Ex.: Reavaliar concordância e propósito; achei a nota alta."
                  rows={4}
                />
                <button className="button-link secondary" type="submit" disabled={isBusy || !teacherInstruction.trim()}>
                  Gerar nova revisão
                </button>
              </form>
            ) : (
              <p>Esta redação já chegou ao limite de 3 revisões por IA.</p>
            )}
          </section>

          <section className="approval-card">
            <p className="eyebrow">Linha manual</p>
            <h2>Adicionar apontamento da professora</h2>
            <form className="mini-form" onSubmit={handleManualIssue}>
              <label htmlFor="quote">Trecho</label>
              <input id="quote" name="quote" placeholder="Opcional: trecho exato ou deixe em branco" />

              <label htmlFor="category">Categoria técnica</label>
              <select id="category" name="category" defaultValue="Ortografia">
                <option>Ortografia</option>
                <option>Acentuação</option>
                <option>Concordância</option>
                <option>Coesão e coerência</option>
                <option>Propósito</option>
                <option>Gênero</option>
                <option>Interlocução</option>
                <option>Uso do texto-fonte</option>
                <option>Imagem/persona</option>
              </select>

              <label htmlFor="scoreImpact">Desconto</label>
              <input id="scoreImpact" name="scoreImpact" type="number" min="0.1" max="2" step="0.1" defaultValue="0.1" />

              <label htmlFor="explanation">Por que tirou nota</label>
              <textarea id="explanation" name="explanation" rows={3} />

              <label htmlFor="teacherComment">Comentário da professora</label>
              <textarea id="teacherComment" name="teacherComment" rows={3} />

              <button className="button-link secondary" type="submit" disabled={isBusy}>
                Anexar à tabela
              </button>
            </form>
          </section>
        </aside>
      </div>
    </section>
  );
}
