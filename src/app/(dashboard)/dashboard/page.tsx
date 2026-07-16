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

  return (
    <section>
      <h1>Painel da Professora</h1>
      <p>Acompanhe redacoes em revisao e correcoes aprovadas.</p>
      <HistoryTable rows={essays} />
    </section>
  );
}
