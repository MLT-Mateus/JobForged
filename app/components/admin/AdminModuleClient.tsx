"use client";
import {OperationalModule} from '../operations/OperationalModule';
import {FinanceDemo} from '../operations/FinanceDemo';
import {modulePermission,useCompanyAccess} from '../operations/access';

import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { WorkspaceShell } from "../ui/WorkspaceShell";

import { useRouter } from "next/navigation";



import { useEffect, useState, type ReactNode } from "react";
import { BriefcaseBusiness, CalendarDays, House, LayoutDashboard, Palette, Settings2, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { useThemePreference, WorkspacePageHeader, WorkspaceState } from "@/app/components/ui";
import { BrandAsset } from "@/app/components/BrandAsset";
import { useCompanyAuthSession } from "@/app/components/auth/auth-service";
import { moduleCopy, type AdminModuleId } from "./admin-data";
import { type WorkspaceModule } from "./feature-availability";
import type { AwaitedAdminContext } from "./admin-types";
import { CompanyManagementClient } from "./CompanyManagementClient";
import { AccountManagementClient } from "./AccountManagementClient";
import { customizationService } from '../personalization/personalization-service';
import { brandingStyle, brandingIcon } from '../personalization/branding-model';
import {portalWordmark} from '../personalization/portal-chrome';
import type { Customization } from '../personalization/personalization-types';
import { CompanyBrandingProvider } from '../personalization/CompanyBranding';
import '../personalization/company-branding.css';

const nav = [
  ["Home","/app/home",House],["Dashboards","/app/dashboards",LayoutDashboard],["Vagas","/app/vagas",BriefcaseBusiness],["Filiais","/app/filiais",House],["Candidaturas","/app/candidaturas",UsersRound],["Agenda","/app/agenda",CalendarDays],["Personalização","/app/personalizacao",Palette],["Administradores","/app/administradores",ShieldCheck],["Financeiro","/app/financeiro",WalletCards],["Configurações","/app/configuracoes",Settings2],
] as const;

export function AdminShell({ module, context, children }: { module: WorkspaceModule; context: {organization: AwaitedAdminContext["organization"]; user: Pick<AwaitedAdminContext["user"], "name" | "role" | "initials">}; children: ReactNode }) {
  const router=useRouter();
  const auth=useCompanyAuthSession();
  const access=useCompanyAccess(auth.company?.id);
  const {theme}=useThemePreference();
  const [branding,setBranding]=useState<{companyId:string;value:Customization}|null>(null);
  useEffect(()=>{if(!auth.checking&&(!auth.authenticated||auth.platformAdmin||!auth.company))router.replace(`${auth.authenticated ? "/403" : "/401"}?next=${encodeURIComponent(window.location.pathname)}`)},[auth.checking,auth.authenticated,auth.platformAdmin,auth.company,router]);
  useEffect(()=>{if(!auth.company?.id||auth.platformAdmin)return;let active=true;const companyId=auth.company.id;
    const load=()=>{void customizationService.load().then(value=>{if(active&&value.published.organizationId===companyId)setBranding({companyId,value:value.published})}).catch(()=>{if(active)setBranding(null)})};
    load();window.addEventListener('jobforged-customization-published',load);window.addEventListener('focus',load);
    return()=>{active=false;window.removeEventListener('jobforged-customization-published',load);window.removeEventListener('focus',load)};
  },[auth.company?.id,auth.platformAdmin]);
  if(auth.checking)return <main className="jf-session-state"><WorkspaceState title="Validando seu acesso" description="Aguarde enquanto confirmamos sua sessão."/></main>;
  if(!auth.authenticated||auth.platformAdmin||!auth.company)return <main className="jf-session-state"><WorkspaceState title="Redirecionando…"/></main>;
  const organizationTheme=branding?.companyId===auth.company.id?branding.value:null;
  let selectedTheme=theme;
  if(organizationTheme){let hasPreference=true;try{hasPreference=!!localStorage.getItem('jobforged-theme')}catch{/* Keep the active user preference. */}
    if(!organizationTheme.theme.allowSwitch||!hasPreference)selectedTheme=organizationTheme.theme.defaultMode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):organizationTheme.theme.defaultMode;
  }
  const brandStyle=organizationTheme?brandingStyle(organizationTheme,selectedTheme):{};
  const companyIcon=organizationTheme?brandingIcon(organizationTheme,selectedTheme):undefined;

  return <CompanyBrandingProvider value={organizationTheme} theme={selectedTheme} companyId={auth.company.id} companyRole={auth.role||""}><WorkspaceShell className="company-branding" themeOverride={selectedTheme} showThemeSwitch={organizationTheme?.theme.allowSwitch??true} items={nav.filter(([,href])=>!modulePermission[href.slice(5)]||access?.permissions[modulePermission[href.slice(5)]]).map(([label,href,icon])=>({label,href,icon,active:`/app/${module}`===href}))} logo={companyIcon?`${companyIcon}?icon=1`:context.organization.logo} fullLogo={organizationTheme?portalWordmark(organizationTheme,selectedTheme):undefined} brand={organizationTheme?.shortName||auth.company.name} title={organizationTheme?.displayName||auth.company.name} subtitle="Organização ativa" style={brandStyle} actions={<><NotificationBell key={`${auth.email}:${auth.company.id}`}/></>} footer={<div className="admin-user"><Link href="/app/minha-conta" title="Minha conta"><span>{organizationTheme?.assets.avatar?<BrandAsset src={organizationTheme.assets.avatar.url} alt="Avatar da empresa"/>:(auth.fullName || auth.email || "U").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase()}</span><span><strong>{auth.fullName || auth.email || "Conta"}</strong><small title={auth.company.name}>{organizationTheme?.shortName || auth.company.name}</small></span></Link></div>}>{!access?<WorkspaceState title="Validando permissões..."/>:access.error?<WorkspaceState kind="error" title={access.error}/>:modulePermission[module]&&!access.permissions[modulePermission[module]]?<WorkspaceState kind="forbidden" title="Você não possui acesso a este módulo."/>:<div className="jf-workspace-stack">{children}</div>}</WorkspaceShell></CompanyBrandingProvider>;
}

export function AdminPageHeader({ module, action }: { module: AdminModuleId; action?: ReactNode }) { const copy=moduleCopy[module]; return <WorkspacePageHeader section={`Painel / ${copy.title}`} title={copy.title} description={copy.description} action={action}/> }
export default function AdminModuleClient({module,context}:{module:AdminModuleId;context:AwaitedAdminContext}){let content:ReactNode;if(['dashboards','candidaturas','agenda'].includes(module))content=<OperationalModule module={module as 'dashboards'|'candidaturas'|'agenda'}/>;else if(module==='financeiro')content=<FinanceDemo/>;else if(module==='administradores')content=<CompanyManagementClient mode="members"/>;else if(module==='configuracoes')content=<><CompanyManagementClient mode="settings"/><OperationalModule module="configuracoes"/></>;else content=<AccountManagementClient/>;return <AdminShell module={module} context={context}>{content}</AdminShell>}
