import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { activeOrganizationId, getHomeContext } from "./service";
import "./home.css";

export const metadata: Metadata = { title: "Home | JobForged", description: "Visão geral da organização no painel JobForged." };

export default async function HomePage() {
  const context = await getHomeContext(activeOrganizationId);
  return <HomeClient initialContext={context} />;
}
