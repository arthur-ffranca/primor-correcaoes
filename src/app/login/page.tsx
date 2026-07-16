import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <section>
      <h1>Acesso da Professora</h1>
      <p>Entre com email e senha para acessar o historico privado de correcoes.</p>
      <LoginForm />
    </section>
  );
}
