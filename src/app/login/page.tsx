import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <section className="auth-page">
      <div className="auth-ambient auth-ambient-one" />
      <div className="auth-ambient auth-ambient-two" />

      <aside className="auth-copy">
        <p className="eyebrow">Correções Primor</p>
        <h1>Correção de redações com olhar de professora, não de planilha.</h1>
        <p>
          Um espaço privado para enviar fotos, revisar apontamentos, priorizar os maiores descontos e aprovar a
          devolutiva final com segurança.
        </p>
        <div className="trust-strip">
          <span>Acesso único da professora</span>
          <span>Histórico protegido</span>
          <span>Revisão antes da aprovação</span>
        </div>
      </aside>

      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-lockup">
          <span className="brand-mark">CP</span>
          <span>Correções Primor</span>
        </div>
        <p className="eyebrow">Área segura</p>
        <h2 id="login-title">Acesso da Professora</h2>
        <p>Entre com email e senha para acessar o histórico privado de correções.</p>
        <LoginForm />
        <p className="fine-print">Demo local. Nenhuma redação é exposta publicamente.</p>
      </section>
    </section>
  );
}
