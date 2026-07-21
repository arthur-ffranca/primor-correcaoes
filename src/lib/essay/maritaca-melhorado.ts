import { z } from "zod";
import { getMaritacaEnv } from "@/lib/env";
import { getPerfectCriterionScores } from "@/lib/essay/criteria";
import type { EssayImageInput, EssayIssue, CriterionKey } from "@/lib/essay/types";

const MARITACA_CHAT_COMPLETIONS_URL = "https://chat.maritaca.ai/api/chat/completions";
const DEFAULT_MARITACA_MODEL = "sabia-4";

type Fetcher = typeof fetch;

type MaritacaContentText = {
  type: "text";
  text: string;
};

type MaritacaContentImage = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

type MaritacaMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<MaritacaContentText | MaritacaContentImage>;
};

type MaritacaCallOptions = {
  apiKey?: string;
  model?: string;
  fetcher?: Fetcher;
};

export type MaritacaTranscriptionResult = {
  status: "readable" | "needs_resubmission";
  rawText: string;
  uncertaintyNotes: string[];
};

export type MaritacaAnalysisResult = {
  issues: EssayIssue[];
  criterionScores: Record<CriterionKey, number>;
  uncertaintyNotes: string[];
};

export type MaritacaRevisionInput = {
  normalizedText: string;
  teacherInstruction: string;
  previousReview: {
    versionNumber: number;
    issues: EssayIssue[];
    criterionScores: Record<CriterionKey, number>;
    totalRawScore: number;
    total1000Score: number;
  };
};

const transcriptionSchema = z.object({
  status: z.enum(["readable", "needs_resubmission"]),
  rawText: z.string().default(""),
  uncertaintyNotes: z.array(z.string()).default([]),
});

const criterionScoresSchema = z.object({
  genre: z.number().min(0).max(2),
  purpose: z.number().min(0).max(2),
  interlocution: z.number().min(0).max(1),
  image: z.number().min(0).max(1),
  sourceText: z.number().min(0).max(1),
  cohesionAndCoherence: z.number().min(0).max(1),
  grammar: z.number().min(0).max(0.5),
  aesthetics: z.number().min(0).max(0),
});

const issueSchema = z.object({
  quote: z.string(),
  type: z.string(),
  explanation: z.string(),
  suggestion: z.string(),
  impactedCriteria: z.array(
    z.enum([
      "genre",
      "purpose",
      "interlocution",
      "image",
      "sourceText",
      "cohesionAndCoherence",
      "grammar",
      "aesthetics",
    ]),
  ),
  grammarAspect: z.enum(["accentuation", "agreement", "orthography"]).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  scoreImpact: z.number().optional(),
  impactSummary: z.string().optional(),
});

const analysisSchema = z.object({
  issues: z.array(issueSchema).default([]),
  criterionScores: criterionScoresSchema.default(getPerfectCriterionScores()),
  uncertaintyNotes: z.array(z.string()).default([]),
});

function getMaritacaOptions(options: MaritacaCallOptions = {}) {
  if (options.apiKey) {
    return {
      apiKey: options.apiKey,
      model: options.model ?? DEFAULT_MARITACA_MODEL,
      fetcher: options.fetcher ?? fetch,
    };
  }

  const env = getMaritacaEnv();
  return {
    apiKey: env.MARITACA_API_KEY,
    model: options.model ?? env.MARITACA_MODEL,
    fetcher: options.fetcher ?? fetch,
  };
}

export function buildMaritacaImageContent(image: EssayImageInput): MaritacaContentImage {
  if (!["image/png", "image/jpeg"].includes(image.mimeType)) {
    throw new Error(`Formato de imagem nao suportado: ${image.mimeType}`);
  }

  const base64 = Buffer.from(image.buffer).toString("base64");
  return {
    type: "image_url",
    image_url: {
      url: `data:${image.mimeType};base64,${base64}`,
    },
  };
}

export function parseMaritacaJsonContent<T>(content: string): T {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  const jsonText =
    firstBrace >= 0 && lastBrace > firstBrace ? withoutFence.slice(firstBrace, lastBrace + 1) : withoutFence;

  return JSON.parse(jsonText) as T;
}

async function callMaritacaJson<T>(
  messages: MaritacaMessage[],
  options: MaritacaCallOptions = {},
): Promise<T> {
  const maritaca = getMaritacaOptions(options);
  
  console.log(`📤 Chamando Maritaca API (model: ${maritaca.model})...`);
  
  const response = await maritaca.fetcher(MARITACA_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${maritaca.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: maritaca.model,
      messages,
      temperature: 0.1,
      max_tokens: 4000, // AUMENTADO de 3000 para 4000
    }),
  });

  // Logging detalhado de erros
  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      errorBody = "(nao foi possivel ler corpo do erro)";
    }
    
    console.error("❌ Maritaca API Error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorBody.substring(0, 500),
    });

    const detailedError = `Maritaca retornou erro ${response.status}. ${
      response.status === 401 ? "Verifique sua MARITACA_API_KEY." :
      response.status === 403 ? "Acesso proibido à API Maritaca." :
      response.status === 429 ? "Rate limit excedido. Tente novamente em alguns minutos." :
      ""
    }`;

    throw new Error(detailedError);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    console.error("⚠️ Maritaca retornou conteudo invalido:", payload);
    throw new Error("Maritaca nao retornou conteudo textual valido.");
  }

  console.log("✅ Resposta Maritaca recebida com sucesso");
  return parseMaritacaJsonContent<T>(content);
}

export async function transcribeEssayImagesWithMaritaca(
  images: EssayImageInput[],
  options: MaritacaCallOptions = {},
): Promise<MaritacaTranscriptionResult> {
  if (!images.length) {
    return {
      status: "needs_resubmission",
      rawText: "",
      uncertaintyNotes: ["Nenhuma imagem foi enviada para transcricao."],
    };
  }

  console.log(`📸 Transcrevendo ${images.length} imagem(ns) com Maritaca...`);

  // PROMPT MELHORADO PARA OCR
  const content: Array<MaritacaContentText | MaritacaContentImage> = [
    {
      type: "text",
      text:
        "Você é um transcritor especializado em OCR de redações manuscritas em português brasileiro. " +
        "TAREFA: Leia com MÁXIMA precisão o texto manuscrito nas imagens e transcreva cada palavra, linha por linha. " +
        "INSTRUÇÕES CRÍTICAS: " +
        "1. Transcreva TUDO que conseguir ler, mesmo que parcial. Se uma palavra está 80% legível, transcreva. " +
        "2. Use [?] para palavras completamente ilegíveis ou muito incertas. " +
        "3. Preserve EXATAMENTE a estrutura visual: parágrafos, espaços em branco, quebras de linha. " +
        "4. Se vir uma palavra e achar que é 'e' ou 'é', escreva como 'é' (melhor deixar com acento do que sem). " +
        "5. Normalize acentuação comum: 'nao' → 'não', 'sao' → 'são', 'voces' → 'vocês', 'historia' → 'história'. " +
        "6. NÃO compacte linhas; NÃO remova espaços; NÃO combine parágrafos. " +
        "7. Se uma letra está entre maiúscula e minúscula, siga o padrão da redação. " +
        "8. Registre em uncertaintyNotes qualquer palavra que teve que adivinhar ou [?]. " +
        "VALIDAÇÃO: Se conseguiu ler menos de 50% da redação ou se houver muita sombra/corte, retorne needs_resubmission. " +
        "RETORNO: JSON com: {\"status\":\"readable|needs_resubmission\",\"rawText\":\"TEXTO COMPLETO\",\"uncertaintyNotes\":[\"observações\"]}"
    },
    ...images.map(buildMaritacaImageContent),
  ];

  const parsed = await callMaritacaJson<unknown>(
    [
      {
        role: "system",
        content:
          "Você é um especialista em OCR de textos manuscritos. " +
          "Sua ÚNICA responsabilidade é transcrever com máxima fidelidade, palavra por palavra. " +
          "Não reescreva, não corrija, não melhore - apenas transcreva. " +
          "Use [?] para indicar incerteza. " +
          "Se não consegue ler, registre em uncertaintyNotes.",
      },
      {
        role: "user",
        content,
      },
    ],
    options,
  );

  const result = transcriptionSchema.parse(parsed);
  
  // REMOVIDO: validação muito rigorosa de 40 caracteres
  // Agora aceita transcrições menores se o status for "readable"
  if (result.status === "readable" && result.rawText.trim().length < 20) {
    return {
      status: "needs_resubmission",
      rawText: result.rawText,
      uncertaintyNotes: [
        ...result.uncertaintyNotes,
        "A transcrição ficou muito curta (menos de 20 caracteres). Pode ser imagem de muito baixa qualidade.",
      ],
    };
  }

  return result;
}

export async function analyzeEssayWithMaritaca(
  normalizedText: string,
  options: MaritacaCallOptions = {},
): Promise<MaritacaAnalysisResult> {
  console.log("🔍 Analisando redacao com Maritaca...");

  const parsed = await callMaritacaJson<unknown>(
    [
      {
        role: "system",
        content:
          "Voce corrige redacoes escolares em portugues brasileiro com uma rubrica inspirada na Unicamp, " +
          "mas calibrada para destacar apenas os erros mais gritantes e de maior impacto pedagogico. " +
          "REGRA ZERO: todo conteudo exibivel ao professor deve estar em portugues brasileiro. " +
          "Nunca escreva valores internos em ingles nos campos type, explanation, suggestion ou impactSummary. " +
          "Seja direto, criterioso e evite listas longas.",
      },
      {
        role: "user",
        content:
          "Corrija a redacao abaixo. Retorne apenas JSON valido, sem markdown, neste formato: " +
          '{"issues":[{"quote":"trecho exato","type":"Categoria tecnica em portugues","explanation":"por que esta errado","suggestion":"reescrita sugerida","impactedCriteria":["grammar"],"grammarAspect":"accentuation|agreement|orthography","severity":"critical|high|medium|low","scoreImpact":0.2,"impactSummary":"impacto curto"}],"criterionScores":{"genre":2,"purpose":2,"interlocution":1,"image":1,"sourceText":1,"cohesionAndCoherence":1,"grammar":0.5,"aesthetics":0},"uncertaintyNotes":["observacoes curtas"]}. ' +
          "Use no maximo 6 issues, priorizando as que mais tiram nota. A soma maxima dos criterios e 8.5. " +
          "Respeite os limites: genre 0-2, purpose 0-2, interlocution 0-1, image 0-1, sourceText 0-1, cohesionAndCoherence 0-1, grammar 0-0.5, aesthetics sempre 0. " +
          "Os nomes internos dos criterios e enums so podem aparecer nos campos estruturais impactedCriteria, grammarAspect, severity e criterionScores. " +
          "No campo type, use apenas rotulos em portugues brasileiro para a Categoria tecnica, como Ortografia, Acentuacao, Concordancia, Coesao e coerencia, Proposito, Genero, Interlocucao, Uso do texto-fonte, Imagem/persona ou Erro grave. " +
          "As notas por criterio precisam refletir os descontos dos issues; nao de nota maxima em um criterio que teve erro relevante. " +
          "Quando um issue for de gramatica, classifique grammarAspect apenas como accentuation (acentuacao), agreement (concordancia nominal/verbal) ou orthography (ortografia). " +
          "Nao use grammarAspect para conjugacao verbal, regencia, pontuacao, paralelismo, coesao, estrutura frasal ou escolha vocabular; nesses casos, omita grammarAspect. " +
          "Se o problema nao for exatamente de acentuacao, concordancia ou ortografia, omita grammarAspect. " +
          `Redacao:\n${normalizedText}`,
      },
    ],
    options,
  );

  return analysisSchema.parse(parsed);
}

export async function analyzeEssayRevisionWithMaritaca(
  input: MaritacaRevisionInput,
  options: MaritacaCallOptions = {},
): Promise<MaritacaAnalysisResult> {
  const parsed = await callMaritacaJson<unknown>(
    [
      {
        role: "system",
        content:
          "Voce revisa uma correcao escolar ja gerada em portugues brasileiro. " +
          "A professora continua sendo a autoridade final: use a orientacao dela para recalibrar a revisao. " +
          "REGRA ZERO: Nada exibivel a professora pode aparecer em ingles. " +
          "Nunca escreva valores internos em ingles nos campos type, explanation, suggestion ou impactSummary.",
      },
      {
        role: "user",
        content:
          "Gere uma nova versao da revisao da redacao. Retorne apenas JSON valido, sem markdown, neste formato: " +
          '{"issues":[{"quote":"trecho exato","type":"Categoria tecnica em portugues","explanation":"por que esta errado","suggestion":"reescrita sugerida","impactedCriteria":["grammar"],"grammarAspect":"accentuation|agreement|orthography","severity":"critical|high|medium|low","scoreImpact":0.2,"impactSummary":"impacto curto"}],"criterionScores":{"genre":2,"purpose":2,"interlocution":1,"image":1,"sourceText":1,"cohesionAndCoherence":1,"grammar":0.5,"aesthetics":0},"uncertaintyNotes":["observacoes curtas"]}. ' +
          "Use no maximo 6 issues, priorizando os maiores descontos. " +
          "Os nomes internos dos criterios e enums so podem aparecer nos campos estruturais impactedCriteria, grammarAspect, severity e criterionScores. " +
          "No campo type, use apenas Categoria tecnica em portugues brasileiro, como Ortografia, Acentuacao, Concordancia, Coesao e coerencia, Proposito, Genero, Interlocucao, Uso do texto-fonte, Imagem/persona ou Erro grave. " +
          "A nova revisao deve considerar explicitamente a orientacao da professora, mas sem obedecer cegamente se ela contradisser a redacao. " +
          "Revisao anterior:\n" +
          JSON.stringify(input.previousReview, null, 2) +
          "\n\nOrientacao da professora:\n" +
          input.teacherInstruction +
          "\n\nRedacao:\n" +
          input.normalizedText,
      },
    ],
    options,
  );

  return analysisSchema.parse(parsed);
}
