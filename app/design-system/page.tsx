import type { Metadata } from "next";
import DesignSystemClient from "./DesignSystemClient";
import "./design-system.css";

export const metadata: Metadata = {
  title: "JobForged | Design System",
  description:
    "Fundamentos visuais, componentes e padrões de interface da plataforma JobForged.",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignSystemClient />;
}
