import type { Metadata } from "next";
import { headers } from "next/headers";
import { unauthorized, forbidden } from "next/navigation";
import { NextRequest } from "next/server";
import { readSession } from "@/app/api/auth/_server";
import { BackofficeManagementClient } from "@/app/components/admin/BackofficeManagementClient";
import "@/app/components/admin/admin.css";

export const metadata: Metadata = { title: "JobForged | Backoffice" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const incoming = await headers();
  const request = new NextRequest("https://test.jobforged.com/backoffice", { headers: incoming });
  const session = await readSession(request, new Headers());
  if (!session) unauthorized();
  if (!session.platformAdmin) forbidden();
  return <BackofficeManagementClient email={session.email} />;
}
