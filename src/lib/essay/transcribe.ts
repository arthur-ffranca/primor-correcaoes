const COMMON_PT_BR_ACCENTS = new Map([
  ["apos", "após"],
  ["ate", "até"],
  ["coesao", "coesão"],
  ["coerencia", "coerência"],
  ["comentario", "comentário"],
  ["comentarios", "comentários"],
  ["comecar", "começar"],
  ["comecaram", "começaram"],
  ["comeco", "começo"],
  ["correcao", "correção"],
  ["criterio", "critério"],
  ["criterios", "critérios"],
  ["crianca", "criança"],
  ["criancas", "crianças"],
  ["decisao", "decisão"],
  ["diversao", "diversão"],
  ["estetica", "estética"],
  ["estao", "estão"],
  ["experiencia", "experiência"],
  ["faco", "faço"],
  ["familia", "família"],
  ["fisica", "física"],
  ["gramatica", "gramática"],
  ["genero", "gênero"],
  ["historia", "história"],
  ["infancia", "infância"],
  ["influencia", "influência"],
  ["indicio", "indício"],
  ["indicios", "indícios"],
  ["interlocucao", "interlocução"],
  ["ja", "já"],
  ["mae", "mãe"],
  ["midia", "mídia"],
  ["milhao", "milhão"],
  ["nao", "não"],
  ["noticia", "notícia"],
  ["noticias", "notícias"],
  ["numero", "número"],
  ["opiniao", "opinião"],
  ["opinioes", "opiniões"],
  ["possivel", "possível"],
  ["possiveis", "possíveis"],
  ["portugues", "português"],
  ["proposito", "propósito"],
  ["proximo", "próximo"],
  ["publicacoes", "publicações"],
  ["redacao", "redação"],
  ["relacao", "relação"],
  ["revisao", "revisão"],
  ["saude", "saúde"],
  ["sao", "são"],
  ["tambem", "também"],
  ["toxica", "tóxica"],
  ["toxicas", "tóxicas"],
  ["transcricao", "transcrição"],
  ["ultima", "última"],
  ["ultimo", "último"],
  ["video", "vídeo"],
  ["videos", "vídeos"],
  ["voce", "você"],
  ["voces", "vocês"],
]);

function applyOriginalCasing(original: string, replacement: string) {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }

  if (original.charAt(0) === original.charAt(0).toUpperCase()) {
    return `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`;
  }

  return replacement;
}

function restoreCommonPortugueseAccents(text: string) {
  let normalized = text;

  for (const [plain, accented] of COMMON_PT_BR_ACCENTS) {
    normalized = normalized.replace(new RegExp(`\\b${plain}\\b`, "gi"), (match) =>
      applyOriginalCasing(match, accented),
    );
  }

  return normalized;
}

export function normalizeTranscription(rawText: string) {
  return rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => restoreCommonPortugueseAccents(line.replace(/[ \t]+/g, " ").trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
