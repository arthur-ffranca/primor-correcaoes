import { NewEssayForm } from "@/components/forms/new-essay-form";

export default function NewEssayPage() {
  return (
    <section>
      <h1>Nova Redacao</h1>
      <p>Cadastre a redacao com os metadados basicos para iniciar a analise preliminar.</p>
      <NewEssayForm />
    </section>
  );
}
