import type { CriterionKey } from "@/lib/essay/types";

type ScoreCardProps = {
  criterionScores: Record<CriterionKey, number>;
  totalRawScore: number;
  total1000Score: number;
};

const labelByCriterion: Record<CriterionKey, string> = {
  genre: "Gênero",
  purpose: "Propósito",
  interlocution: "Interlocução",
  image: "Imagem",
  sourceText: "Texto-fonte",
  cohesionAndCoherence: "Coesão e coerência",
  grammar: "Gramática",
  aesthetics: "Estética",
};

const maxByCriterion: Record<CriterionKey, number> = {
  genre: 2,
  purpose: 2,
  interlocution: 1,
  image: 1,
  sourceText: 1,
  cohesionAndCoherence: 1,
  grammar: 0.5,
  aesthetics: 0.5,
};

export function ScoreCard({ criterionScores, totalRawScore, total1000Score }: ScoreCardProps) {
  return (
    <section className="score-panel">
      <p className="eyebrow">Nota sugerida</p>
      <div className="score-hero">
        <strong>{totalRawScore.toFixed(1)}</strong>
        <span>/ 8,5</span>
      </div>
      <p className="score-conversion">{total1000Score} / 1000</p>

      <h2>Notas por critério</h2>
      <ul className="criterion-list">
        {Object.entries(criterionScores).map(([criterion, score]) => {
          const key = criterion as CriterionKey;
          const max = maxByCriterion[key];
          const width = Math.max(0, Math.min(100, (score / max) * 100));

          return (
            <li key={criterion}>
              <div>
                <span>{labelByCriterion[key]}</span>
                <strong>
                  {score} / {max}
                </strong>
              </div>
              <span className="criterion-track">
                <span className="criterion-fill" style={{ width: `${width}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
