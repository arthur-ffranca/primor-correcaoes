import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <section>
      <nav>
        <a href="/dashboard">Painel</a>
        <a href="/dashboard/essays/new">Nova redacao</a>
      </nav>
      {children}
    </section>
  );
}
