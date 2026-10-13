import LegalPage from "@/app/components/LegalPage";
import { dataDeletionPolicyHtml } from "@/app/legal-documents";
import { publicPageMetadata } from "@/app/seo";

export const metadata = publicPageMetadata("JobForged | Política de Exclusão de Dados", "Veja como solicitar a exclusão de dados e quais critérios se aplicam às contas e informações da JobForged.", "/politicas-exclusao");

export default function DataDeletionPolicyPage() {
  return (
    <LegalPage
      title="Política de Exclusão de Dados"
      description="Orientações e critérios relacionados à solicitação e ao processo de exclusão de dados na JobForged."
      documentHtml={dataDeletionPolicyHtml}
      downloadHref="/documents/jobforged-politica-de-exclusao-de-conta-e-dados.docx"
    />
  );
}
