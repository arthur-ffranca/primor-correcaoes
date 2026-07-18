"use client";

import Link from "next/link";
import { useState } from "react";

type SubmissionState = "idle" | "submitting" | "success" | "error";
type SubmissionResult = {
  id: string;
  status: "ready_for_review" | "needs_resubmission" | string;
  resubmissionReason?: string;
};

export function NewEssayForm() {
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmissionState("submitting");
    setError(null);
    setResult(null);

    const formData = new FormData(form);

    const response = await fetch("/api/essays", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmissionState("error");
      setError(payload?.message ?? "Nao foi possivel criar a redacao.");
      return;
    }

    if (!payload?.id || !payload?.status) {
      setSubmissionState("error");
      setError("A redacao foi enviada, mas a resposta do servidor veio incompleta.");
      return;
    }

    setResult(payload);
    setSubmissionState("success");
    if (payload.status === "ready_for_review") {
      form.reset();
    }
  }

  return (
    <form className="panel-form" onSubmit={handleSubmit}>
      <div className="form-card-header">
        <p className="eyebrow">Cadastro</p>
        <h2>Dados da redação</h2>
      </div>

      <label htmlFor="studentName">Aluno</label>
      <input id="studentName" name="studentName" type="text" placeholder="Nome do aluno" required />

      <div className="form-grid">
        <div>
          <label htmlFor="classGroup">Turma</label>
          <input id="classGroup" name="classGroup" type="text" placeholder="3A" required />
        </div>
        <div>
          <label htmlFor="submissionDate">Data</label>
          <input id="submissionDate" name="submissionDate" type="date" required />
        </div>
      </div>

      <label htmlFor="theme">Tema</label>
      <input id="theme" name="theme" type="text" placeholder="Tema ou proposta da redação" required />

      <label htmlFor="essayPhotos">Fotos da redação</label>
      <input id="essayPhotos" name="essayPhotos" type="file" accept="image/png,image/jpeg" multiple required />

      {submissionState === "success" && result?.status === "ready_for_review" ? (
        <p className="form-success">
          Redação lida pela IA e enviada para revisão.{" "}
          <Link href={`/dashboard/essays/${result.id}`}>Abrir devolutiva</Link>
        </p>
      ) : null}
      {submissionState === "success" && result?.status === "needs_resubmission" ? (
        <p className="form-error">
          A IA não conseguiu ler a foto com segurança. {result.resubmissionReason ?? "Envie uma nova imagem."}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={submissionState === "submitting"}>
        {submissionState === "submitting" ? "Enviando..." : "Criar redação"}
      </button>
    </form>
  );
}
