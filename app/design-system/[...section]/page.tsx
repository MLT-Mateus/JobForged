import type { Metadata } from "next";
import DesignSystemClient from "../DesignSystemClient";
import "../design-system.css";

export const metadata: Metadata = {
  title: "JobForged",
  description: "Fundamentos visuais, componentes e padrões de interface da plataforma JobForged.",
};

export default function DesignSystemSectionPage() {
  return <DesignSystemClient />;
}
