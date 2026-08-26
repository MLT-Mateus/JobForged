import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";
import { privacyPolicyHtml } from "@/app/legal-documents";

export const metadata: Metadata = {
  title: "Política de Privacidade | JobForged",
  description: "Política de Privacidade da plataforma JobForged.",
};

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
