import type { CriterionKey, EssayIssue } from "@/lib/essay/types";

const severityWeight: Record<NonNullable<EssayIssue["severity"]>, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const grammarAspectLabelByKey: Record<NonNullable<EssayIssue["grammarAspect"]>, string> = {
  accentuation: "Acentuação",
  agreement: "Concordância",
  orthography: "Ortografia",
};

const criterionLabelByKey: Record<CriterionKey, string> = {
  genre: "Gênero",
  purpose: "Propósito",
  interlocution: "Interlocução",
  image: "Imagem/persona",
  sourceText: "Uso do texto-fonte",
  cohesionAndCoherence: "Coesão e coerência",
  grammar: "Gramática",
  aesthetics: "Estética",
};

const issueCategoryLabelByNormalizedType: Record<string, string> = {
  acentuacao: "Acentuação",
  accentuation: "Acentuação",
  concordancia: "Concordância",
  agreement: "Concordância",
  ortografia: "Ortografia",
  orthography: "Ortografia",
  gramatica: "Gramática",
  grammar: "Gramática",
  coesao: "Coesão",
  cohesion: "Coesão",
  coerencia: "Coerência",
  coherence: "Coerência",
  coesaoecoerencia: "Coesão e coerência",
  coesaocoerencia: "Coesão e coerência",
  cohesionandcoherence: "Coesão e coerência",
  genero: "Gênero",
  genre: "Gênero",
  proposito: "Propósito",
  purpose: "Propósito",
  interlocucao: "Interlocução",
  interlocution: "Interlocução",
  imagem: "Imagem/persona",
  image: "Imagem/persona",
  imagempersona: "Imagem/persona",
  textofonte: "Uso do texto-fonte",
  usodotextofonte: "Uso do texto-fonte",
  sourcetext: "Uso do texto-fonte",
  estetica: "Estética",
  aesthetics: "Estética",
  conjugacaoverbal: "Conjugação verbal",
  conjugacao: "Conjugação verbal",
  pontuacao: "Pontuação",
  punctuation: "Pontuação",
  paralelismo: "Paralelismo",
  parallelism: "Paralelismo",
  regencia: "Regência",
  regency: "Regência",
  estruturafrasal: "Estrutura frasal",
  frasestructure: "Estrutura frasal",
  vocabulario: "Vocabulário",
  vocabulary: "Vocabulário",
  escolhavocabular: "Escolha vocabular",
};

const criterionByManualCategory: Record<string, CriterionKey> = {
  acentuacao: "grammar",
  concordancia: "grammar",
  ortografia: "grammar",
  gramatica: "grammar",
  coesaoecoerencia: "cohesionAndCoherence",
  coesaocoerencia: "cohesionAndCoherence",
  proposito: "purpose",
  genero: "genre",
  interlocucao: "interlocution",
  usodotextofonte: "sourceText",
  textofonte: "sourceText",
  imagempersona: "image",
  imagem: "image",
  estetica: "aesthetics",
};

const grammarAspectByManualCategory: Record<string, EssayIssue["grammarAspect"]> = {
  acentuacao: "accentuation",
  concordancia: "agreement",
  ortografia: "orthography",
};

type TeacherIssueInput = {
  quote?: string;
  category: string;
  scoreImpact: number;
  explanation: string;
  teacherComment: string;
};

export function getIssueImpact(issue: EssayIssue) {
  if (typeof issue.scoreImpact === "number") {
    return issue.scoreImpact;
  }

  if (issue.severity) {
    return severityWeight[issue.severity] / 10;
  }

  return issue.impactedCriteria.length / 10;
}

export function getExecutiveIssues(issues: EssayIssue[], limit = 5) {
  return [...issues]
    .sort((left, right) => getIssueImpact(right) - getIssueImpact(left))
    .slice(0, limit);
}

export function getGrammarAspectLabel(issue: EssayIssue) {
  return issue.grammarAspect ? grammarAspectLabelByKey[issue.grammarAspect] : "Não se aplica";
}

export function getCriterionLabel(criterion: CriterionKey | string) {
  return criterionLabelByKey[criterion as CriterionKey] ?? "Critério avaliativo";
}

export function getIssueCategoryLabel(issue: EssayIssue) {
  if (issue.grammarAspect) {
    return grammarAspectLabelByKey[issue.grammarAspect];
  }

  const typeLabel = issueCategoryLabelByNormalizedType[normalizeLabelKey(issue.type)];
  if (typeLabel) {
    return typeLabel;
  }

  const firstCriterion = issue.impactedCriteria[0];
  if (firstCriterion) {
    return criterionLabelByKey[firstCriterion];
  }

  return "Erro grave";
}

export function getIssueDiscountLabel(issue: EssayIssue) {
  const impact = getIssueImpact(issue);
  if (impact <= 0) {
    return "Sem desconto";
  }

  return `-${formatPtBrDecimal(impact)} ${impact > 1 ? "pontos" : "ponto"}`;
}

export function getIssueSourceLabel(issue: EssayIssue) {
  if (issue.sourceLabel) {
    return issue.sourceLabel;
  }

  return issue.source === "professora" ? "Feito pela professora" : "Sugerido pela IA";
}

export function buildTeacherIssue(input: TeacherIssueInput): EssayIssue {
  const normalizedCategory = normalizeLabelKey(input.category);
  const criterion = criterionByManualCategory[normalizedCategory] ?? "grammar";
  const grammarAspect = grammarAspectByManualCategory[normalizedCategory];

  return {
    quote: input.quote?.trim() || "Apontamento geral",
    type: getIssueManualCategoryLabel(input.category),
    explanation: input.explanation.trim(),
    suggestion: input.teacherComment.trim(),
    impactedCriteria: [criterion],
    grammarAspect,
    scoreImpact: Number(input.scoreImpact.toFixed(2)),
    source: "professora",
    sourceLabel: "Feito pela professora",
    teacherComment: input.teacherComment.trim(),
  };
}

export function applyIssueDiscount(
  scores: Record<CriterionKey, number>,
  issue: EssayIssue,
): Record<CriterionKey, number> {
  const criterion = issue.impactedCriteria[0];
  if (!criterion) {
    return scores;
  }

  return {
    ...scores,
    [criterion]: Number(Math.max(0, (scores[criterion] ?? 0) - getIssueImpact(issue)).toFixed(2)),
  };
}

function getIssueManualCategoryLabel(category: string) {
  return issueCategoryLabelByNormalizedType[normalizeLabelKey(category)] ?? category.trim();
}

function formatPtBrDecimal(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

function normalizeLabelKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "e")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

export function isEssayIssue(value: unknown): value is EssayIssue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const issue = value as Partial<EssayIssue>;
  const validGrammarAspect =
    issue.grammarAspect === undefined ||
    issue.grammarAspect === "accentuation" ||
    issue.grammarAspect === "agreement" ||
    issue.grammarAspect === "orthography";

  return (
    typeof issue.quote === "string" &&
    typeof issue.type === "string" &&
    typeof issue.explanation === "string" &&
    typeof issue.suggestion === "string" &&
    Array.isArray(issue.impactedCriteria) &&
    validGrammarAspect
  );
}
