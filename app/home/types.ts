import type { LucideIcon } from "lucide-react";

export type HomeViewState = "loading" | "ready" | "empty" | "error" | "forbidden";

export type OrganizationTheme = {
  mode: "light" | "dark";
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceSoft: string;
  text: string;
  textMuted: string;
  border: string;
};

export type Organization = {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  theme: { light: OrganizationTheme; dark: OrganizationTheme };
};

export type HomePermission =
  | "home.metrics.view"
  | "home.activities.view"
  | "home.onboarding.view"
  | "home.onboarding.continue"
  | "vacancies.create";

export type HomeUser = {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  permissions: HomePermission[];
};

export type Banner = { id: string; image?: string; eyebrow?: string; title: string; description: string; link?: { label: string; href: string } };
export type Metric = { id: string; label: string; value: number; detail: string; tone: "brand" | "info" | "positive" | "neutral" };
export type ActivityKind = "vacancy-created" | "vacancy-published" | "application" | "candidate-moved" | "interview" | "admin" | "settings";
export type Activity = { id: string; kind: ActivityKind; description: string; actor: string; occurredAt: string };
export type OnboardingStep = { id: string; label: string; complete: boolean };
export type HomeData = {
  organizationId: string;
  summary: string;
  banners: Banner[];
  metrics: Metric[];
  activities: Activity[];
  onboarding: { progress: number; steps: OnboardingStep[] };
};

export type NavItem = { label: string; href: string; icon: LucideIcon };
