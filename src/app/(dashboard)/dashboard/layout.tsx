import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <section className="workspace-shell">
      <nav className="workspace-nav" aria-label="Navegação principal">
        <a className="brand-lockup nav-brand" href="/dashboard">
          <span className="brand-mark">CP</span>
          <span>Correções Primor</span>
        </a>
        <div className="nav-links">
          <a href="/dashboard">Mesa</a>
          <a className="nav-cta" href="/dashboard/essays/new">
            Nova redação
          </a>
        </div>
      </nav>
      <div className="workspace-main">{children}</div>
    </section>
  );
}
