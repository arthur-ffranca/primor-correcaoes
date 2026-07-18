const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const db = new PrismaClient();

async function main() {
  const email = "professora.demo@quero-correcao.local";
  const plainPassword = "Demo12345!";
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const user = await db.user.upsert({
    where: { email },
    update: {
      passwordHash,
    },
    create: {
      email,
      passwordHash,
    },
  });

  await db.finalReview.deleteMany({
    where: {
      essaySubmission: {
        userId: user.id,
      },
    },
  });

  await db.preliminaryAnalysis.deleteMany({
    where: {
      essaySubmission: {
        userId: user.id,
      },
    },
  });

  await db.transcription.deleteMany({
    where: {
      essaySubmission: {
        userId: user.id,
      },
    },
  });

  await db.essayFile.deleteMany({
    where: {
      essaySubmission: {
        userId: user.id,
      },
    },
  });

  await db.essaySubmission.deleteMany({
    where: {
      userId: user.id,
    },
  });

  const approvedEssay = await db.essaySubmission.create({
    data: {
      userId: user.id,
      studentName: "Ana Souza",
      classGroup: "3A",
      theme: "Influenciadores digitais e adolescencia",
      submissionDate: new Date("2026-07-10T00:00:00.000Z"),
      status: "approved",
      transcription: {
        create: {
          rawText:
            "Aos leitores do meu post, escrevo hoje para compartilhar como a internet ampliou minha voz, mas tambem exigiu maturidade emocional.",
          normalizedText:
            "Aos leitores do meu post, escrevo hoje para compartilhar como a internet ampliou minha voz, mas tambem exigiu maturidade emocional.",
          uncertaintyNotes: [],
        },
      },
      preliminaryAnalysis: {
        create: {
          issuesPayload: [
            {
              quote: "ampliou minha voz",
              type: "clareza",
              explanation: "A formulacao e boa, mas pode ganhar mais especificidade para reforcar o proposito do texto.",
              suggestion: "expandiu meu alcance nas redes sociais",
              impactedCriteria: ["purpose", "cohesionAndCoherence"],
              severity: "medium",
              scoreImpact: 0.2,
              impactSummary: "Pequeno desconto por formulacao pouco especifica.",
            },
          ],
          criterionScoresPayload: {
            genre: 2,
            purpose: 1.5,
            interlocution: 1,
            image: 1,
            sourceText: 1,
            cohesionAndCoherence: 1,
            grammar: 0.5,
            aesthetics: 0,
          },
          totalRawScore: 8,
          total1000Score: 941,
          processingNotes: [],
        },
      },
      finalReview: {
        create: {
          approvedTranscription:
            "Aos leitores do meu post, escrevo hoje para compartilhar como a internet expandiu meu alcance, mas tambem exigiu maturidade emocional e responsabilidade.",
          approvedIssuesPayload: [
            {
              quote: "ampliou minha voz",
              type: "clareza",
              explanation: "A professora preferiu um ajuste de formulacao para deixar o proposito mais explicito.",
              suggestion: "expandiu meu alcance",
              impactedCriteria: ["purpose"],
              severity: "medium",
              scoreImpact: 0.2,
              impactSummary: "Pequeno desconto por precisao vocabular.",
            },
          ],
          approvedCriterionScoresPayload: {
            genre: 2,
            purpose: 1.5,
            interlocution: 1,
            image: 1,
            sourceText: 1,
            cohesionAndCoherence: 1,
            grammar: 0.5,
            aesthetics: 0,
          },
          approvedTotalRawScore: 8,
          approvedTotal1000Score: 941,
          reviewerNotes: "Demo local com redacao aprovada.",
          approvedAt: new Date("2026-07-12T14:00:00.000Z"),
        },
      },
    },
  });

  await db.essaySubmission.create({
    data: {
      userId: user.id,
      studentName: "Bruno Lima",
      classGroup: "2B",
      theme: "Pressao estetica nas redes sociais",
      submissionDate: new Date("2026-07-13T00:00:00.000Z"),
      status: "ready_for_review",
      transcription: {
        create: {
          rawText:
            "Escrevo este post para contar que nem sempre foi facil lidar com a exposicao e com os comentarios nas redes sociais.",
          normalizedText:
            "Escrevo este post para contar que nem sempre foi facil lidar com a exposicao e com os comentarios nas redes sociais.",
          uncertaintyNotes: ["Trecho final revisado manualmente para o demo."],
        },
      },
      preliminaryAnalysis: {
        create: {
          issuesPayload: [
            {
              quote: "nem sempre foi facil lidar",
              type: "coesao",
              explanation: "A transicao entre a apresentacao do tema e o desenvolvimento pode ficar mais forte.",
              suggestion: "nem sempre foi facil lidar com essa exposicao repentina",
              impactedCriteria: ["cohesionAndCoherence", "purpose"],
              severity: "high",
              scoreImpact: 0.5,
              impactSummary: "Desconto relevante por enfraquecer a progressao do texto.",
            },
            {
              quote: "comentarios nas redes sociais",
              type: "interlocucao",
              explanation: "Falta aproximar o leitor do objetivo do post logo no primeiro paragrafo.",
              suggestion: "comentarios que voces acompanham nas redes sociais",
              impactedCriteria: ["interlocution"],
              severity: "medium",
              scoreImpact: 0.3,
              impactSummary: "Desconto moderado por reduzir a interlocucao com o leitor.",
            },
          ],
          criterionScoresPayload: {
            genre: 2,
            purpose: 1.5,
            interlocution: 0.5,
            image: 1,
            sourceText: 1,
            cohesionAndCoherence: 0.5,
            grammar: 0.5,
            aesthetics: 0,
          },
          totalRawScore: 7,
          total1000Score: 824,
          processingNotes: ["Revisar a abertura antes de aprovar."],
        },
      },
    },
  });

  console.log("Demo ready");
  console.log(`Email: ${email}`);
  console.log(`Senha: ${plainPassword}`);
  console.log(`Redacao aprovada: ${approvedEssay.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
