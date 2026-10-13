import LegalPage from "@/app/components/LegalPage";
import { termsOfServiceHtml } from "@/app/legal-documents";
import { publicPageMetadata } from "@/app/seo";

export const metadata = publicPageMetadata("JobForged | Termos de Serviço", "Consulte as condições de acesso e uso dos produtos, serviços e recursos oferecidos pela JobForged.", "/termos-servico");

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Termos de Serviço"
      description="Condições de acesso e uso dos produtos, serviços e recursos oferecidos pela JobForged."
      documentHtml={termsOfServiceHtml}
      downloadHref="/documents/jobforged-termos-de-uso.docx"
    />
  );
}
