import type { Metadata } from "next";
import DesignSystemClient from "../DesignSystemClient";
import "../design-system.css";

export const metadata: Metadata = {
  title: "JobForged | Design System",
  description: "Fundamentos visuais, componentes e padrões de interface da plataforma JobForged.",
};

export default async function DesignSystemSectionPage({params}:{params:Promise<{section:string[]}>}) {
  const {section}=await params;
  return <DesignSystemClient initialSection={section[0]} />;
}
