import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";
import { termsOfServiceHtml } from "@/app/legal-documents";

export const metadata: Metadata = {
  title: "Termos de Serviço | JobForged",
  description: "Termos de Serviço da plataforma JobForged.",
};

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
