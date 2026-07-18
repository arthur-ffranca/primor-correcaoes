import { db } from "@/lib/db";
import { auth } from "@/auth";
import { HistoryTable } from "@/components/history/history-table";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return <p>Voce precisa entrar para acessar o painel.</p>;
  }

  const essays = await db.essaySubmission.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      studentName: true,
      classGroup: true,
      theme: true,
      status: true,
    },
  });
  const totalEssays = essays.length;
  const approvedEssays = essays.filter((essay) => essay.status === "approved").length;
  const reviewEssays = essays.filter((essay) => essay.status === "ready_for_review").length;

  return (
    <section className="dashboard-page">
      <header className="page-hero">
        <div>
          <p className="eyebrow">Correções Primor</p>
          <h1>Mesa de Correção</h1>
          <p>Acompanhe redações em revisão, aprove devolutivas e baixe pacotes finais sem perder o fio da turma.</p>
        </div>
        <a className="primary-button hero-action" href="/dashboard/essays/new">
          Nova redação
        </a>
      </header>

      <section className="metric-grid" aria-label="Resumo das redações">
        <article className="metric-card">
          <span>Total</span>
          <strong>{totalEssays}</strong>
          <p>redações no histórico</p>
        </article>
        <article className="metric-card accent-card">
          <span>Para revisar</span>
          <strong>{reviewEssays}</strong>
          <p>aguardando decisão</p>
        </article>
        <article className="metric-card">
          <span>Aprovadas</span>
          <strong>{approvedEssays}</strong>
          <p>com pacote final</p>
        </article>
      </section>

      <HistoryTable rows={essays} />
    </section>
  );
}
