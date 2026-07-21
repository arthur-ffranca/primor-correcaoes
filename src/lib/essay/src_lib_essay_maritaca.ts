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
      max_tokens: 3000,
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
      body: errorBody.substring(0, 500), // Primeiros 500 chars
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

  const content: Array<MaritacaContentText | MaritacaContentImage> = [
    {
      type: "text",
      text:
        "Leia a redacao manuscrita nas imagens e transcreva fielmente em portugues brasileiro para correcao escolar. " +
        "Preserve os paragrafos da folha em rawText: quando houver abertura visual de paragrafo, insira uma linha em branco. " +
        "Nao compacte todos os paragrafos em um bloco unico; mantenha a estrutura visual da folha o maximo possivel. " +
        "Use acentuacao brasileira correta quando a palavra estiver claramente identificavel, para nao criar falsos erros de OCR: " +
        "escreva 'milhao' como 'milhão', 'voces' como 'vocês' e 'historia' como 'história' quando esse for o sentido claro. " +
        "Nao reescreva frases, nao melhore concordancia, nao corrija coesao e nao altere escolhas do aluno alem de normalizar acentos evidentes gerados por OCR. " +
        "Se a presenca ou ausencia de acento parecer um erro claramente visivel do aluno, preserve a forma escrita e registre em uncertaintyNotes. " +
        "Se houver muitas palavras ilegiveis, folha cortada, sombra forte ou baixa confianca, retorne needs_resubmission. " +
        "Retorne apenas JSON neste formato: " +
        '{"status":"readable|needs_resubmission","rawText":"texto transcrito","uncertaintyNotes":["observacoes curtas"]}.',
    },
    ...images.map(buildMaritacaImageContent),
  ];

  const parsed = await callMaritacaJson<unknown>(
    [
      {
        role: "system",
        content:
          "Voce e um transcritor cuidadoso de redacoes escolares manuscritas em portugues brasileiro. " +
          "Sua prioridade e nao criar falsos erros: preserve paragrafos, use acentuacao brasileira quando a palavra for clara " +
          "e peca reenvio quando a leitura nao for confiavel.",
      },
      {
        role: "user",
        content,
      },
    ],
    options,
  );

  const result = transcriptionSchema.parse(parsed);
  if (result.status === "readable" && result.rawText.trim().length < 40) {
    return {
      status: "needs_resubmission",
      rawText: result.rawText,
      uncertaintyNotes: [
        ...result.uncertaintyNotes,
        "A transcricao ficou curta demais para uma correcao confiavel.",
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
