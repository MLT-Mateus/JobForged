import LegalPage from "@/app/components/LegalPage";
import { privacyPolicyHtml } from "@/app/legal-documents";
import { publicPageMetadata } from "@/app/seo";

export const metadata = publicPageMetadata("JobForged | Política de Privacidade", "Entenda como a JobForged trata dados pessoais e protege a privacidade durante o uso da plataforma.", "/politicas-privacidade");

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      description="Informações sobre privacidade, tratamento de dados pessoais e segurança na experiência JobForged."
      documentHtml={privacyPolicyHtml}
      downloadHref="/documents/jobforged-politica-de-privacidade.docx"
    />
  );
}
