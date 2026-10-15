import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { readSession } from "@/app/api/auth/_server";
import { BackofficeClient } from "@/app/components/admin/BackofficeClient";
import "@/app/components/admin/admin.css";

export const metadata: Metadata = { title: "JobForged | Backoffice" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const incoming = await headers();
  const request = new NextRequest("https://test.jobforged.com/backoffice", { headers: incoming });
  const session = await readSession(request, new Headers());
  if (!session?.platformAdmin) {
    redirect(new URL("/login", process.env.APP_PUBLIC_URL || "https://jobforged.com").toString());
  }
  return <BackofficeClient email={session.email} />;
}
