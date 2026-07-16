"use client";

import { useState } from "react";

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function NewEssayForm() {
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionState("submitting");
    setError(null);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/essays", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        studentName: formData.get("studentName"),
        classGroup: formData.get("classGroup"),
        theme: formData.get("theme"),
        submissionDate: new Date(String(formData.get("submissionDate"))).toISOString(),
        files: ["pending-upload"],
      }),
    });

    if (!response.ok) {
      setSubmissionState("error");
      setError("Nao foi possivel criar a redacao.");
      return;
    }

    setSubmissionState("success");
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="studentName">Aluno</label>
      <input id="studentName" name="studentName" type="text" required />

      <label htmlFor="classGroup">Turma</label>
      <input id="classGroup" name="classGroup" type="text" required />

      <label htmlFor="theme">Tema</label>
      <input id="theme" name="theme" type="text" required />

      <label htmlFor="submissionDate">Data</label>
      <input id="submissionDate" name="submissionDate" type="date" required />

      <label htmlFor="essayPhotos">Fotos da redacao</label>
      <input id="essayPhotos" name="essayPhotos" type="file" accept="image/*" multiple required />

      {submissionState === "success" ? <p>Redacao enviada para processamento inicial.</p> : null}
      {error ? <p>{error}</p> : null}

      <button type="submit" disabled={submissionState === "submitting"}>
        {submissionState === "submitting" ? "Enviando..." : "Criar redacao"}
      </button>
    </form>
  );
}
