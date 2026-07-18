import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DashboardLayout from "@/app/(dashboard)/dashboard/layout";
import { NewEssayForm } from "@/components/forms/new-essay-form";
import { HistoryTable } from "@/components/history/history-table";
import { IssuesTable } from "@/components/review/issues-table";
import { ReviewShell } from "@/components/review/review-shell";
import { ScoreCard } from "@/components/review/score-card";

describe("polished teacher workspace UI", () => {
  it("limits essay uploads to PNG or JPEG photos in the teacher form", () => {
    const html = renderToStaticMarkup(<NewEssayForm />);

    expect(html).toContain('name="essayPhotos"');
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/png,image/jpeg"');
    expect(html).toContain("multiple");
    expect(html).toContain("required");
  });

  it("renders the dashboard inside a branded workspace shell", () => {
    const html = renderToStaticMarkup(
      <DashboardLayout>
        <div>conteudo</div>
      </DashboardLayout>,
    );

    expect(html).toContain("workspace-shell");
    expect(html).toContain("brand-mark");
    expect(html).toContain("Nova redação");
  });

  it("renders history rows as an editorial correction table", () => {
    const html = renderToStaticMarkup(
      <HistoryTable
        rows={[
          {
            id: "essay_1",
            studentName: "Ana Souza",
            classGroup: "3A",
            theme: "Influenciadores digitais",
            status: "ready_for_review",
          },
        ]}
      />,
    );

    expect(html).toContain("correction-table");
    expect(html).toContain("status-pill status-ready_for_review");
    expect(html).toContain("Em revisão");
    expect(html).toContain("button-link");
  });

  it("renders review issues and scores as decision cards with teacher-facing technical categories", () => {
    const issuesHtml = renderToStaticMarkup(
      <IssuesTable
        issues={[
          {
            quote: "comentarem mau de mim",
            type: "grammar",
            explanation: "Uso incorreto do advérbio.",
            suggestion: "comentarem mal de mim",
            impactedCriteria: ["grammar"],
            grammarAspect: "orthography",
            severity: "high",
            scoreImpact: 0.5,
          },
          {
            quote: "minha escolha servisse exemplo",
            type: "cohesionAndCoherence",
            explanation: "A construção prejudica a clareza da relação entre as ideias.",
            suggestion: "Explicar melhor a relação entre escolha e exemplo.",
            impactedCriteria: ["cohesionAndCoherence"],
            severity: "high",
            scoreImpact: 0.4,
            source: "professora",
            sourceLabel: "Feito pela professora",
            teacherComment: "Explicar melhor a relação entre escolha e exemplo.",
          },
        ]}
      />,
    );
    const scoreHtml = renderToStaticMarkup(
      <ScoreCard
        criterionScores={{
          genre: 2,
          purpose: 1.5,
          interlocution: 1,
          image: 1,
          sourceText: 1,
          cohesionAndCoherence: 0.7,
          grammar: 0.3,
          aesthetics: 0.4,
        }}
        totalRawScore={7.9}
        total1000Score={929}
      />,
    );

    expect(issuesHtml).toContain("impact-panel");
    expect(issuesHtml).toContain("impact-table");
    expect(issuesHtml).toContain("Categoria técnica");
    expect(issuesHtml).toContain("Ortografia");
    expect(issuesHtml).toContain("Coesão e coerência");
    expect(issuesHtml).toContain("Feito pela professora");
    expect(issuesHtml).toContain("Desconto");
    expect(issuesHtml).toContain("-0,5 ponto");
    expect(issuesHtml).not.toContain(">grammar<");
    expect(issuesHtml).not.toContain("cohesionAndCoherence");
    expect(scoreHtml).toContain("score-panel");
    expect(scoreHtml).toContain("score-hero");
  });

  it("renders the transcription in a block that preserves handwritten paragraph breaks", () => {
    const html = renderToStaticMarkup(
      <ReviewShell
        essayId="essay_1"
        reviewVersionNumber={2}
        maxReviewVersions={3}
        studentName="Ana Souza"
        classGroup="3A"
        theme="Influenciadores digitais"
        transcription={"Primeiro parágrafo.\n\nSegundo parágrafo."}
        issues={[]}
        criterionScores={{
          genre: 2,
          purpose: 2,
          interlocution: 1,
          image: 1,
          sourceText: 1,
          cohesionAndCoherence: 1,
          grammar: 0.5,
          aesthetics: 0,
        }}
        totalRawScore={8.5}
        total1000Score={1000}
      />,
    );

    expect(html).toContain("transcription-text");
    expect(html).toContain("Primeiro parágrafo.\n\nSegundo parágrafo.");
    expect(html).toContain("Revisão 2 de 3");
    expect(html).toContain("Pedir ajuste da IA");
    expect(html).toContain("Adicionar apontamento da professora");
  });
  it("keeps the score panel from overlapping the transcription column", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

    expect(css).toContain("grid-template-columns: minmax(0, 1fr) minmax(280px, 360px)");
    expect(css).toMatch(/\.review-main\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.review-main,\s*\.review-side,\s*\.transcription-panel\s*\{[\s\S]*?min-width: 0;/);
    expect(css).toMatch(/\.impact-panel,\s*\.table-scroll\s*\{[\s\S]*?min-width: 0;/);
    expect(css).toMatch(/\.transcription-text\s*\{[\s\S]*?overflow-wrap: anywhere;/);
  });
});
