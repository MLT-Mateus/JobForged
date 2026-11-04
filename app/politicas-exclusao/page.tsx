import {publicPageMetadata} from "../lib/seo";
import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";
import { dataDeletionPolicyHtml } from "@/app/legal-documents";

export const dynamic="force-dynamic";
export function generateMetadata():Metadata{return {...publicPageMetadata("/politicas-exclusao"),
  title: "JobForged | Política de Exclusão de Dados",
  description: "Política de Exclusão de Dados da plataforma JobForged.",
}}

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
