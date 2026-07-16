import type { CriterionKey } from "@/lib/essay/types";

type ScoreCardProps = {
  criterionScores: Record<CriterionKey, number>;
  totalRawScore: number;
  total1000Score: number;
};

const labelByCriterion: Record<CriterionKey, string> = {
  genre: "Genero",
  purpose: "Proposito",
  interlocution: "Interlocucao",
  image: "Imagem",
  sourceText: "Texto-fonte",
  cohesionAndCoherence: "Coesao e coerencia",
  grammar: "Gramatica",
  aesthetics: "Estetica",
};

export function ScoreCard({ criterionScores, totalRawScore, total1000Score }: ScoreCardProps) {
  return (
    <section>
      <h2>Notas por criterio</h2>
      <ul>
        {Object.entries(criterionScores).map(([criterion, score]) => (
          <li key={criterion}>
            {labelByCriterion[criterion as CriterionKey]}: {score}
          </li>
        ))}
      </ul>
      <p>Nota Unicamp: {totalRawScore}</p>
      <p>Nota convertida (0-1000): {total1000Score}</p>
    </section>
  );
}
