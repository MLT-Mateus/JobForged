"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "O que significa um ATS white label?",
    answer: "É uma plataforma de recrutamento e seleção que funciona com a identidade da sua empresa. A JobForged permite personalizar marca, cores, conteúdo, página de carreiras e domínio para criar uma experiência própria para candidatos e gestores.",
  },
  {
    question: "A JobForged substitui planilhas e controles separados?",
    answer: "Sim. A JobForged concentra vagas, candidatos, currículos, etapas, comunicações e indicadores em um fluxo simples, reduzindo retrabalho e informações dispersas.",
  },
  {
    question: "Como a triagem por IA ajuda a contratar melhor?",
    answer: "A IA compara as informações dos currículos com os critérios definidos para a vaga e ajuda a priorizar os perfis mais aderentes. A decisão continua com o RH, apoiada por dados mais organizados.",
  },
  {
    question: "É possível entrevistar candidatos pelo WhatsApp?",
    answer: "Sim. A JobForged envia perguntas de triagem, confirmações e comunicações pelo WhatsApp e registra as respostas no processo seletivo para o RH acompanhar tudo em um só lugar.",
  },
  {
    question: "As etapas do processo seletivo podem ser personalizadas?",
    answer: "Sim. Cada empresa pode estruturar o pipeline conforme sua realidade, com etapas e critérios adaptados aos diferentes tipos de vaga.",
  },
  {
    question: "A plataforma pode funcionar no domínio da minha empresa?",
    answer: "Sim. A JobForged foi pensada para operar como uma solução da sua própria marca, incluindo domínio personalizado e página de carreiras integrada à experiência do candidato.",
  },
];

export default function FaqList() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {faqs.map((faq, index) => {
        const isOpen = openFaq === index;
        return (
          <div className={`faq-item ${isOpen ? "faq-item--open" : ""}`} key={faq.question}>
            <button type="button" aria-expanded={isOpen} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(isOpen ? null : index)}>
              <span>{faq.question}</span><ChevronDown aria-hidden="true" />
            </button>
            <div id={`faq-answer-${index}`} className={`faq-answer ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
              <div><p>{faq.answer}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
