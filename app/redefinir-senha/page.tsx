import type { Metadata } from "next";
import { PasswordRecoveryClient } from "@/app/components/auth/AuthClient";
export const metadata: Metadata = { title: "Redefinir senha | JobForged" };
export default function Page() { return <PasswordRecoveryClient reset />; }
