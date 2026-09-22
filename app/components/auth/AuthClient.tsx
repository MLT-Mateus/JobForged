"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CircleAlert, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { BrandAsset } from "@/app/components/BrandAsset";
import { ActionButton, AppToast, CheckboxField, SelectField, TextField, ThemeSelector, type ThemeMode, type ToastNotice } from "@/app/components/ui";
import { commercialPlans, isPlanId, plansById } from "@/app/data/plans";
import { maskCnpj, maskCpf, maskPhone, passwordRules, validateLogin, validateSignup, type LoginValues, type SignupValues } from "./auth-validation";
import { simulateAuthentication } from "./auth-service";
import "./auth.css";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

function usePublicTheme() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  useEffect(() => {
    const stored = localStorage.getItem("jobforged-theme");
    const initial = stored === "dark" || stored === "light" ? stored : document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = initial;
    document.documentElement.style.colorScheme = initial;
    setTheme(initial);
  }, []);
  const changeTheme = (next: ThemeMode) => {
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("jobforged-theme", next);
    setTheme(next);
  };
  return { theme, changeTheme };
}

function AuthShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { theme, changeTheme } = usePublicTheme();
  return <main className={`auth-page ${compact ? "auth-page--compact" : ""}`}>
    <div className="auth-grid" aria-hidden="true" />
    <header className="auth-header">
      <Link href="/" className="auth-brand" aria-label="JobForged — página inicial"><BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={636} height={184}/></Link>
      <ThemeSelector theme={theme} onChange={changeTheme}/>
    </header>
    <div className="auth-layout">
      <aside className="auth-context" aria-label="Contexto da conta empresarial">
        <span className="auth-context__icon"><Building2 aria-hidden="true"/></span>
        <p className="auth-eyebrow">Conta empresarial JobForged</p>
        <h2>Sua operação de recrutamento começa com uma base segura.</h2>
        <p>Este ambiente é exclusivo para empresas clientes e administradores responsáveis.</p>
        <ul><li><ShieldCheck/> Identidade e dados da organização</li><li><UserRound/> Acesso inicial do administrador</li><li><LockKeyhole/> Preparado para autenticação segura</li></ul>
      </aside>
      <section className="auth-card">{children}</section>
    </div>
  </main>;
}

function LoadingLabel({ loading, idle }: { loading: boolean; idle: string }) {
  return loading ? <><span className="auth-spinner" aria-hidden="true"/>Processando...</> : <>{idle}<ArrowRight aria-hidden="true"/></>;
}

export function LoginClient() {
  const [values, setValues] = useState<LoginValues>({ identifier: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<LoginValues>>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notice, setNotice] = useState<ToastNotice | null>(null);

  const updateIdentifier = (raw: string) => {
    const value = /^[\d.\-\s]*$/.test(raw) ? maskCpf(raw) : raw.slice(0, 120);
    setValues((current) => ({ ...current, identifier: value }));
    if (errors.identifier) setErrors((current) => ({ ...current, identifier: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    setGeneralError("");
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      await simulateAuthentication("login", values.identifier);
      setValues((current) => ({ ...current, password: "" }));
      setSuccess(true);
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : "Não foi possível concluir a demonstração.");
    } finally { setLoading(false); }
  }

  if (success) return <AuthShell compact><div className="auth-confirmation" role="status"><span><Check/></span><p className="auth-eyebrow">Demonstração concluída</p><h1>Dados validados com sucesso</h1><p>A autenticação real será habilitada após a integração segura do sistema. Nenhuma sessão foi criada.</p><div className="auth-confirmation__actions"><Link className="jf-action jf-action--primary" href="/">Voltar para a página inicial</Link><button className="jf-action jf-action--secondary" type="button" onClick={()=>setSuccess(false)}>Revisar acesso</button></div></div></AuthShell>;

  return <AuthShell compact>
    <div className="auth-heading"><p className="auth-eyebrow">Bem-vindo de volta</p><h1>Acesse sua conta</h1><p>Entre para continuar gerenciando seus processos seletivos.</p></div>
    {generalError && <div className="auth-alert auth-alert--error" role="alert"><CircleAlert/><span><strong>Não foi possível continuar</strong>{generalError}</span></div>}
    <form className="auth-form" noValidate onSubmit={submit}>
      <TextField label="E-mail ou CPF" icon={Mail} value={values.identifier} onChange={(event)=>updateIdentifier(event.target.value)} error={errors.identifier} autoComplete="username" inputMode="email" placeholder="nome@empresa.com.br ou 000.000.000-00"/>
      <TextField label="Senha" icon={LockKeyhole} type="password" value={values.password} onChange={(event)=>{setValues((current)=>({...current,password:event.target.value}));if(errors.password)setErrors((current)=>({...current,password:undefined}))}} error={errors.password} autoComplete="current-password" placeholder="Digite sua senha"/>
      <div className="auth-form__meta"><CheckboxField label="Lembrar de mim" checked={remember} onChange={(event)=>setRemember(event.target.checked)}/><button type="button" className="auth-link-button" onClick={()=>setNotice({kind:"info",title:"Recuperação de acesso",text:"A recuperação de senha será disponibilizada com a integração do sistema de autenticação."})}>Esqueci minha senha</button></div>
      <ActionButton type="submit" disabled={loading} aria-busy={loading} className="auth-submit"><LoadingLabel loading={loading} idle="Entrar"/></ActionButton>
    </form>
    <div className="auth-switch"><span>Sua empresa ainda não possui uma conta?</span><Link href="/cadastro">Cadastrar empresa</Link></div>
    <Link className="auth-back" href="/"><ArrowLeft/>Voltar para a página inicial</Link>
    {notice && <AppToast notice={notice} onClose={()=>setNotice(null)}/>} 
  </AuthShell>;
}

const emptySignup: SignupValues = { company:"",cnpj:"",phone:"",email:"",password:"",confirmPassword:"",plan:"",consent:false };

export function SignupClient() {
  const [values, setValues] = useState<SignupValues>(emptySignup);
  const [errors, setErrors] = useState<FieldErrors<SignupValues>>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const requestedPlan = new URLSearchParams(window.location.search).get("plano");
    if (isPlanId(requestedPlan)) setValues((current) => ({ ...current, plan: requestedPlan }));
  }, []);

  const selectedPlan = isPlanId(values.plan) ? plansById[values.plan] : null;
  const rules = passwordRules(values.password);
  const strength = Object.values(rules).filter(Boolean).length;
  const strengthLabel = strength <= 2 ? "Inicial" : strength <= 4 ? "Boa" : "Forte";
  const set = <K extends keyof SignupValues>(key: K, value: SignupValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateSignup(values);
    setErrors(nextErrors);
    setGeneralError("");
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      await simulateAuthentication("signup", values.email);
      setValues((current)=>({...current,password:"",confirmPassword:""}));
      setSuccess(true);
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : "Não foi possível concluir a demonstração.");
    } finally { setLoading(false); }
  }

  if (success) return <AuthShell><div className="auth-confirmation" role="status"><span><Check/></span><p className="auth-eyebrow">Adesão empresarial</p><h1>Cadastro validado para demonstração</h1><p>A criação definitiva da conta será habilitada com a integração segura do sistema de autenticação.</p>{selectedPlan&&<div className="auth-selected-plan"><span><b>{selectedPlan.name}</b><small>{selectedPlan.billing}</small></span><strong>R$ {selectedPlan.price}<small>{selectedPlan.suffix}</small></strong></div>}<div className="auth-confirmation__actions"><Link className="jf-action jf-action--primary" href="/">Voltar para a página inicial</Link><button className="jf-action jf-action--secondary" type="button" onClick={()=>setSuccess(false)}>Revisar informações</button></div></div></AuthShell>;

  return <AuthShell>
    <div className="auth-heading"><p className="auth-eyebrow">Adesão empresarial</p><h1>Cadastre sua empresa</h1><p>Crie a organização e o acesso inicial do administrador responsável.</p></div>
    {generalError && <div className="auth-alert auth-alert--error" role="alert"><CircleAlert/><span><strong>Não foi possível validar o cadastro</strong>{generalError}</span></div>}
    <form className="auth-form auth-form--signup" noValidate onSubmit={submit}>
      <TextField label="Nome da empresa" icon={Building2} value={values.company} maxLength={120} onChange={(event)=>set("company",event.target.value)} error={errors.company} autoComplete="organization" placeholder="Razão social ou nome fantasia"/>
      <div className="auth-field-row"><TextField label="CNPJ" icon={Building2} value={values.cnpj} onChange={(event)=>set("cnpj",maskCnpj(event.target.value))} error={errors.cnpj} autoComplete="off" inputMode="numeric" placeholder="00.000.000/0000-00"/><TextField label="Telefone" icon={Phone} value={values.phone} onChange={(event)=>set("phone",maskPhone(event.target.value))} error={errors.phone} autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000"/></div>
      <TextField label="E-mail do administrador" icon={Mail} value={values.email} onChange={(event)=>set("email",event.target.value.slice(0,120))} error={errors.email} autoComplete="email" inputMode="email" placeholder="administrador@empresa.com.br" helpText={errors.email ? undefined : "Este e-mail será utilizado para acessar e administrar a conta da empresa."}/>
      <div className="auth-field-row"><TextField label="Senha" icon={LockKeyhole} type="password" value={values.password} onChange={(event)=>set("password",event.target.value)} error={errors.password} autoComplete="new-password" placeholder="Crie uma senha segura"/><TextField label="Confirmar senha" icon={LockKeyhole} type="password" value={values.confirmPassword} onChange={(event)=>set("confirmPassword",event.target.value)} error={errors.confirmPassword} autoComplete="new-password" placeholder="Digite a senha novamente"/></div>
      <div className="auth-password-guide" aria-live="polite"><div className="auth-strength"><span>Força da senha: <b>{strengthLabel}</b></span><i>{[1,2,3,4,5].map((level)=><b className={level<=strength?"is-active":""} key={level}/>)}</i></div><ul>{[["length","8 caracteres"],["upper","Letra maiúscula"],["lower","Letra minúscula"],["number","Número"],["special","Caractere especial"]].map(([key,label])=><li className={rules[key as keyof typeof rules]?"is-valid":""} key={key}><Check/>{label}</li>)}</ul></div>
      <div className="auth-plan-field"><SelectField label="Plano escolhido" value={values.plan} onValueChange={(value)=>set("plan",value)} options={commercialPlans.map((plan)=>({value:plan.id,label:`${plan.name} · ${plan.billing}`,description:`R$ ${plan.price}${plan.suffix}`}))} placeholder="Escolha um plano" error={errors.plan}/>{selectedPlan&&<div className="auth-selected-plan" aria-live="polite"><span><b>{selectedPlan.name}</b><small>Modalidade {selectedPlan.billing.toLowerCase()}</small></span><strong>R$ {selectedPlan.price}<small>{selectedPlan.suffix}</small></strong></div>}</div>
      <div className={`auth-consent ${errors.consent?"is-error":""}`}><CheckboxField label={<>Li e concordo com os <Link href="/termos-servico" target="_blank">Termos de Serviço</Link> e com a <Link href="/politicas-privacidade" target="_blank">Política de Privacidade</Link> da JobForged.</>} checked={values.consent} onChange={(event)=>set("consent",event.target.checked)}/>{errors.consent&&<small role="alert">{errors.consent}</small>}<p>A conta inicial será criada para o administrador responsável pela empresa.</p></div>
      <ActionButton type="submit" disabled={loading} aria-busy={loading} className="auth-submit"><LoadingLabel loading={loading} idle="Criar conta empresarial"/></ActionButton>
    </form>
    <div className="auth-switch"><span>Sua empresa já possui uma conta?</span><Link href="/login">Entrar</Link></div>
    <Link className="auth-back" href="/"><ArrowLeft/>Voltar para a página inicial</Link>
  </AuthShell>;
}
