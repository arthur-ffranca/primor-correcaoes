import { NewEssayForm } from "@/components/forms/new-essay-form";

export default function NewEssayPage() {
  return (
    <section className="form-page">
      <header className="page-hero compact">
        <div>
          <p className="eyebrow">Ingestão segura</p>
          <h1>Nova redação</h1>
          <p>Cadastre a redação com metadados básicos e fotos legíveis para iniciar a análise preliminar.</p>
        </div>
      </header>
      <div className="form-layout">
        <NewEssayForm />
        <aside className="guidance-card">
          <p className="eyebrow">Qualidade da foto</p>
          <h2>Para uma boa leitura</h2>
          <p>Use imagem reta, boa luz, página inteira visível e evite sombras sobre a escrita.</p>
          <div className="guidance-list">
            <span>Sem cortes</span>
            <span>Sem dados públicos</span>
            <span>Revisão obrigatória</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
