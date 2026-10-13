"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { plansById } from "@/app/data/plans";

export default function LandingPricingCards() {
  const [annualBilling, setAnnualBilling] = useState(true);
  const basicPlan = plansById[annualBilling ? "basico-anual" : "basico-mensal"];
  const professionalPlan = plansById[annualBilling ? "profissional-anual" : "profissional-mensal"];

  return (
    <>
      <div className="billing-toggle" role="group" aria-label="Período de cobrança">
        <button type="button" className={!annualBilling ? "is-active" : ""} aria-pressed={!annualBilling} onClick={() => setAnnualBilling(false)}>Mensal</button>
        <button type="button" className={annualBilling ? "is-active" : ""} aria-pressed={annualBilling} onClick={() => setAnnualBilling(true)}>Anual <span>2 meses grátis</span></button>
      </div>
      <div className="pricing-grid">
        <div className="lp-reveal price-card price-card--free">
          <div className="plan-head"><span>Gratuito</span><small>Para conhecer a plataforma</small></div>
          <div className="plan-price"><strong>R$ 0</strong><span>para começar</span></div>
          <p>Uma base organizada para operações menores iniciarem com clareza.</p>
          <Link className="button button--ghost jf-action jf-action--secondary" href="/cadastro">Começar grátis <ArrowRight /></Link>
          <ul>
            <li><Check /> Até 2 vagas simultâneas</li><li><Check /> 1 usuário recrutador</li><li><Check /> Página básica de carreiras</li><li><Check /> Kanban e histórico de candidatos</li><li><Check /> Até 500 candidatos armazenados</li><li><Check /> Portal geral JobForged</li>
          </ul>
        </div>
        <div className="lp-reveal price-card price-card--featured">
          <span className="plan-badge"><Star /> Mais popular</span>
          <div className="plan-head"><span>Básico</span><small>Para PMEs que querem mais controle</small></div>
          <div className="plan-price"><strong>R$ {basicPlan.price}</strong><span>{basicPlan.suffix}</span></div>
          {annualBilling && <small className="plan-equivalent">Economize R$ 40,00 por mês — R$ 480,00 por ano</small>}
          <p>O plano principal para organizar o recrutamento e acelerar a triagem.</p>
          <Link className="button button--primary jf-action jf-action--primary" href={`/cadastro?plano=${annualBilling ? "basico-anual" : "basico-mensal"}`}>Falar com especialista <ArrowRight /></Link>
          <ul><li><Check /> Até 5 vagas simultâneas</li><li><Check /> 3 usuários</li><li><Check /> Triagem por IA</li><li><Check /> WhatsApp integrado</li><li><Check /> Tudo do plano Gratuito</li></ul>
        </div>
        <div className="lp-reveal price-card price-card--professional">
          <div className="plan-head"><span>Profissional</span><small>Para operações estruturadas</small></div>
          <div className="plan-price"><strong>R$ {professionalPlan.price}</strong><span>{professionalPlan.suffix}</span></div>
          {annualBilling && <small className="plan-equivalent">Economize R$ 47,00 por mês — R$ 564,00 por ano</small>}
          <p>Mais vagas e usuários para equipes com maior volume de contratações.</p>
          <Link className="button button--blue jf-action jf-action--accent" href={`/cadastro?plano=${annualBilling ? "profissional-anual" : "profissional-mensal"}`}>Falar com especialista <ArrowRight /></Link>
          <ul><li><Check /> Até 15 vagas simultâneas</li><li><Check /> 10 usuários</li><li><Check /> Automações avançadas</li><li><Check /> Experiência white label</li><li><Check /> Tudo do plano Básico</li></ul>
        </div>
      </div>
    </>
  );
}
