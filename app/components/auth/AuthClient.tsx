"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Building2, Check, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { BrandAsset } from "@/app/components/BrandAsset";
import { ActionButton, AppToast, CheckboxField, TextField, ThemeSelector, useThemePreference, type ToastNotice } from "@/app/components/ui";
import { maskCnpj, maskPhone, normalizeText, passwordRules, validateLogin, validateSignup, type LoginValues, type SignupValues } from "./auth-validation";
import { signInCompany, signUpCompany } from "./auth-service";
import "./auth.css";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

function AuthShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { theme, changeTheme } = useThemePreference();

  return (
    <main className={`auth-page ${compact ? "auth-page--compact" : ""}`}>
      <div className="auth-grid" aria-hidden="true" />
      <header className="site-header auth-official-header">
        <div className="container nav-wrap">
          <Link href="/" className="brand" aria-label="JobForged — página inicial">
            <BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={636} height={184} />
          </Link>
          <ThemeSelector theme={theme} onChange={changeTheme} />
        </div>
      </header>
      <div className="auth-layout">
        <aside className="auth-context">
          <span className="auth-context__icon"><Building2 /></span>
          <p className="auth-eyebrow">Conta empresarial JobForged</p>
          <h2>Recrutamento estruturado desde o primeiro acesso.</h2>
          <p>Ambiente exclusivo para empresas e administradores responsáveis.</p>
          <ul>
            <li><ShieldCheck />Plano Freemium sem cobrança</li>
            <li><UserRound />Conta vinculada à organização</li>
            <li><LockKeyhole />Autenticação segura pelo Supabase</li>
          </ul>
        </aside>
        <section className="auth-card">{children}</section>
      </div>
    </main>
  );
}

function LoadingLabel({ loading, idle }: { loading: boolean; idle: string }) {
  return loading ? <><span className="auth-spinner" />Processando...</> : idle;
}

export function LoginClient() {
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>({ identifier: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors<LoginValues>>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<ToastNotice | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateLogin(values);
    setErrors(next);
    if (Object.keys(next).length) {
      setNotice({ kind: "danger", title: "Revise os campos", text: "Informe um e-mail válido e sua senha." });
      return;
    }

    setLoading(true);
    try {
      const result = await signInCompany(values);
      if (!result.ok) {
        setNotice({ kind: "danger", title: "Não foi possível entrar", text: result.message });
        return;
      }
      setValues(current => ({ ...current, password: "" }));
      router.replace("/app/home");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell compact>
      <div className="auth-heading">
        <p className="auth-eyebrow">Bem-vindo de volta</p>
        <h1>Acesse sua conta</h1>
        <p>Entre com o e-mail e a senha da sua conta empresarial.</p>
      </div>
      <form className="auth-form" noValidate onSubmit={submit}>
        <TextField
          name="email"
          type="email"
          placeholder="nome@empresa.com"
          label="E-mail"
          icon={Mail}
          value={values.identifier}
          maxLength={254}
          autoComplete="username"
          onChange={event => {
            setValues(current => ({ ...current, identifier: event.target.value.slice(0, 254) }));
            setErrors(current => ({ ...current, identifier: undefined }));
          }}
          error={errors.identifier}
        />
        <TextField
          name="password"
          placeholder="Digite sua senha"
          label="Senha"
          icon={LockKeyhole}
          type="password"
          value={values.password}
          maxLength={72}
          autoComplete="current-password"
          onChange={event => {
            setValues(current => ({ ...current, password: event.target.value }));
            setErrors(current => ({ ...current, password: undefined }));
          }}
          error={errors.password}
        />
        <Link className="auth-link-button auth-recovery" href="/recuperar-senha">Esqueci minha senha</Link>
        <ActionButton type="submit" disabled={loading} className="auth-submit">
          <LoadingLabel loading={loading} idle="Entrar" />
        </ActionButton>
      </form>
      <div className="auth-switch">
        <span>Sua empresa ainda não possui conta?</span>
        <Link href="/cadastro">Cadastrar empresa grátis</Link>
      </div>
      <Link className="auth-back" href="/"><ArrowLeft />Voltar ao início</Link>
      {notice && <AppToast notice={notice} onClose={() => setNotice(null)} />}
    </AuthShell>
  );
}

const emptySignup: SignupValues = {
  responsible: "",
  company: "",
  cnpj: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function SignupClient() {
  const router = useRouter();
  const [values, setValues] = useState(emptySignup);
  const [errors, setErrors] = useState<FieldErrors<SignupValues>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const rules = passwordRules(values.password);

  function update<K extends keyof SignupValues>(key: K, value: SignupValues[K]) {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateSignup(values);
    setErrors(next);
    if (Object.keys(next).length || !acceptedTerms) {
      setNotice({
        kind: "danger",
        title: "Revise os dados cadastrais",
        text: !acceptedTerms ? "Aceite os termos para criar a conta." : "Corrija os campos destacados antes de continuar.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await signUpCompany(values);
      if (!result.ok) {
        setNotice({ kind: "danger", title: "Cadastro não concluído", text: result.message });
        return;
      }
      setRequiresConfirmation(Boolean(result.requiresConfirmation));
      setCreated(true);
      if (!result.requiresConfirmation) router.replace("/app/home");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <AuthShell>
        <div className="auth-confirmation">
          <span><Check /></span>
          <p className="auth-eyebrow">Conta empresarial</p>
          <h1>{requiresConfirmation ? "Confirme seu e-mail" : "Conta Freemium criada"}</h1>
          <p>
            {requiresConfirmation
              ? `Enviamos as instruções para ${values.email}. Depois de confirmar, entre com seu e-mail e senha.`
              : "Seu acesso inicial está ativo. Você será direcionado ao painel empresarial."}
          </p>
          <div className="auth-selected-plan">
            <span><b>Plano Freemium</b><small>Sem pagamento nesta etapa</small></span>
            <strong>R$ 0<small>/mês</small></strong>
          </div>
          {requiresConfirmation && <Link className="jf-action jf-action--primary" href="/login">Ir para login</Link>}
        </div>
        {notice && <AppToast notice={notice} onClose={() => setNotice(null)} />}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-stepper" aria-label="Progresso do cadastro">
        <div className="is-active"><i>1</i><span>Dados cadastrais</span></div>
        <b />
        <div className="is-active"><i>2</i><span>Acesso Freemium</span></div>
      </div>
      <div className="auth-heading">
        <p className="auth-eyebrow">Adesão empresarial gratuita</p>
        <h1>Cadastre sua empresa</h1>
        <p>Crie o acesso do responsável e comece sem cobrança ou dados de pagamento.</p>
      </div>
      <form className="auth-form auth-form--signup" noValidate onSubmit={submit}>
        <TextField
          name="responsible"
          label="Nome do responsável"
          placeholder="Seu nome completo"
          icon={UserRound}
          autoComplete="name"
          maxLength={120}
          value={values.responsible}
          onChange={event => update("responsible", normalizeText(event.target.value).slice(0, 120))}
          error={errors.responsible}
        />
        <TextField
          name="company"
          label="Nome da empresa"
          placeholder="Razão social ou nome de uso"
          icon={Building2}
          autoComplete="organization"
          maxLength={160}
          value={values.company}
          onChange={event => update("company", normalizeText(event.target.value).slice(0, 160))}
          error={errors.company}
        />
        <div className="auth-field-row">
          <TextField
            name="cnpj"
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            autoComplete="off"
            maxLength={18}
            value={values.cnpj}
            onChange={event => update("cnpj", maskCnpj(event.target.value))}
            error={errors.cnpj}
          />
          <TextField
            name="phone"
            label="Telefone com DDD"
            placeholder="(00) 00000-0000"
            icon={Phone}
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            value={values.phone}
            onChange={event => update("phone", maskPhone(event.target.value))}
            error={errors.phone}
          />
        </div>
        <TextField
          name="email"
          type="email"
          label="E-mail de acesso"
          placeholder="nome@empresa.com"
          icon={Mail}
          autoComplete="email"
          maxLength={254}
          value={values.email}
          onChange={event => update("email", event.target.value.slice(0, 254))}
          error={errors.email}
        />
        <TextField
          name="new-password"
          label="Crie uma senha"
          placeholder="Mínimo de 8 caracteres"
          icon={LockKeyhole}
          type="password"
          autoComplete="new-password"
          maxLength={72}
          value={values.password}
          onChange={event => update("password", event.target.value)}
          error={errors.password}
        />
        <ul className="auth-password-requirements" aria-label="Requisitos da senha">
          {[
            [rules.length, "8 caracteres"],
            [rules.upper && rules.lower, "Maiúscula e minúscula"],
            [rules.number, "Um número"],
            [rules.special, "Um símbolo"],
          ].map(([valid, label]) => (
            <li className={valid ? "is-valid" : ""} key={String(label)}>
              <Check aria-hidden="true" />{label}
            </li>
          ))}
        </ul>
        <TextField
          name="confirm-password"
          label="Confirme a senha"
          placeholder="Digite a senha novamente"
          icon={LockKeyhole}
          type="password"
          autoComplete="new-password"
          maxLength={72}
          value={values.confirmPassword}
          onChange={event => update("confirmPassword", event.target.value)}
          error={errors.confirmPassword}
        />
        <div className="auth-selected-plan">
          <span><b>Plano Freemium</b><small>Acesso inicial · sem cobrança</small></span>
          <strong>R$ 0<small>/mês</small></strong>
        </div>
        <div className="auth-consent">
          <CheckboxField
            label={<>Li e aceito os <Link href="/termos-servico" target="_blank">Termos de Serviço</Link> e a <Link href="/politicas-privacidade" target="_blank">Política de Privacidade</Link>.</>}
            checked={acceptedTerms}
            onChange={event => setAcceptedTerms(event.target.checked)}
          />
        </div>
        <ActionButton type="submit" disabled={loading} className="auth-submit">
          <LoadingLabel loading={loading} idle="Criar conta grátis" />
        </ActionButton>
      </form>
      <div className="auth-switch"><span>Sua empresa já possui conta?</span><Link href="/login">Entrar</Link></div>
      <Link className="auth-back" href="/"><ArrowLeft />Voltar ao início</Link>
      {notice && <AppToast notice={notice} onClose={() => setNotice(null)} />}
    </AuthShell>
  );
}

export function PasswordRecoveryClient({ reset = false }: { reset?: boolean }) {
  return (
    <AuthShell compact>
      <div className="auth-heading">
        <p className="auth-eyebrow">Recuperação de acesso</p>
        <h1>{reset ? "Defina uma nova senha" : "Esqueceu sua senha?"}</h1>
        <p>A recuperação por e-mail será habilitada na próxima etapa, junto à configuração segura do serviço de e-mail.</p>
      </div>
      <div className="auth-security-note"><LockKeyhole />Sua conta e sua senha continuam protegidas. Nenhuma alteração será simulada nesta tela.</div>
      <Link className="auth-back" href="/login"><ArrowLeft />Voltar ao login</Link>
    </AuthShell>
  );
}
