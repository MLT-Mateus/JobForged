import type {Job} from './job-types';
export const jobSections=[
 {id:'sobre',label:'Sobre o Cargo',title:'Identificação da vaga',description:'Informações essenciais para o candidato entender onde e como vai trabalhar.'},
 {id:'atribuicoes',label:'Atribuições',title:'Funções da vaga',description:'Descreva as atividades do cotidiano e os atributos esperados para o cargo.'},
 {id:'beneficios',label:'Benefícios',title:'Benefícios e crescimento',description:'Apresente os benefícios e as possibilidades de desenvolvimento.'},
 {id:'perfil',label:'Perfil Esperado',title:'Perfil e diferenciais',description:'Defina a formação, as habilidades e os diferenciais recomendados.'},
 {id:'processo',label:'Processo',title:'Processo seletivo',description:'Deixe claras as etapas, os prazos e as formas de contato.'},
] as const;
export const jobOptions={
 areas:['Administrativo','Atendimento','Comercial','Financeiro','Gestão de Pessoas','Marketing','Operações','Tecnologia'],
 pcd:['Disponível para PCD','Exclusiva para PCD','Indisponível para PCD'],
 levels:['Júnior','Pleno','Sênior','Especialista','Coordenador','Gerente','Diretor'],
 salaries:['Salário a combinar','Abaixo de R$ 500',...Array.from({length:14},(_,i)=>`R$ ${(501+i*1000).toLocaleString('pt-BR')} - R$ ${(1500+i*1000).toLocaleString('pt-BR')}`),'Acima de R$ 14.501','Informar valores'],
 contracts:['Menor Aprendiz','Estágio','Temporário','Autônomo','Efetivo - CLT','Prestador de Serviço','Free Lancer','Trainee'],
 modes:['Presencial','Home Office','Híbrido'],
 journeys:['Matutino','Matutino e Vespertino','Vespertino','Vespertino e Noturno','Noturno','Noturno e Matutino'],
 education:['Ensino Médio','Técnico','Graduação','Pós-Graduação','MBA','Mestrado','Doutorado'],
 benefits:['Vale Transporte','Vale Alimentação','Vale Refeição','Plano de Saúde','Plano Odontológico','Seguro de Vida','Auxílio Home Office','Bônus','PLR','Day Off Aniversário','GymPass','Auxílio Creche','Auxílio Educação','Stock Option'],
 interviews:['Técnica','Comportamental','Cultural','Case Prático'],
};
export const selectOptions=(items:string[],current='')=>Array.from(new Set([...items,...(current?[current]:[])])).map(value=>({value,label:value}));
export function editorChecks(job:Job){return [
 {section:0,label:'Título da vaga',done:!!job.title.trim()},
 {section:0,label:'Acessibilidade para PCD',done:!!job.pcd},
 {section:0,label:'Setor do cargo',done:!!job.area.trim()},
 {section:0,label:'Nível mínimo',done:!!job.level},
 {section:0,label:'Faixa salarial',done:job.salaryRange==='Informar valores'?!!job.salaryMin:!!job.salaryRange||!!job.salaryMin},
 {section:0,label:'Modelo de contrato',done:!!job.contractType},
 {section:0,label:'Disposição do trabalho',done:!!job.modality},
 {section:0,label:'Jornada de trabalho',done:!!job.journey},
 {section:0,label:'Endereço da vaga',done:!!job.branchIds?.length&&!!job.city&&!!job.state},
 {section:1,label:'Descrição da vaga',done:!!job.summary.trim()},
 {section:1,label:'Atribuições do cargo',done:job.responsibilities.some(x=>!!x.trim())},
 {section:4,label:'Etapa do processo',done:job.stages.some(x=>!!x.name.trim())},
 {section:4,label:'Confirmação de privacidade',done:job.lgpd},
 ];}

/** Preserve process identities across reorder, rename and removal. */
export function reconcileStages(previous:Job['stages'],names:string[]):Job['stages']{
 const matched=names.map(name=>previous.find(stage=>stage.name===name));
 const used=new Set(matched.filter(Boolean).map(stage=>stage!.id));
 return names.map((name,index)=>{const stage=matched[index]||previous.find(stage=>!used.has(stage.id));const id=stage?.id||crypto.randomUUID();used.add(id);return {id,name,required:stage?.required??true}});
}

/** Follow-up uses the applied form, never unchecked AI suggestions. */
export function applicationFeedback(job:Job){
 const checks=editorChecks(job),critical=checks.filter(c=>!c.done&&c.section!==4);
 const strengths=[job.title.trim()?'cargo identificado':'',checks.find(c=>c.label==='Endereço da vaga')?.done?'local de trabalho definido':'',checks.find(c=>c.label==='Faixa salarial')?.done?'remuneração informada':'',job.responsibilities.some(x=>x.trim())?'atribuições descritas':''].filter(Boolean);
 const questions:Record<string,string>={
  'Título da vaga':'Qual é o nome do cargo?',
  'Acessibilidade para PCD':'A vaga é disponível para PCD, exclusiva para PCD ou indisponível para PCD?',
  'Setor do cargo':'Em qual setor essa pessoa vai trabalhar?',
  'Nível mínimo':'Qual é o nível esperado para o cargo?',
  'Faixa salarial':'Qual é o salário previsto ou prefere informar “a combinar”?',
  'Modelo de contrato':'Qual será o tipo de contratação?',
  'Disposição do trabalho':'O trabalho será presencial, híbrido ou remoto?',
  'Jornada de trabalho':'Em qual período a pessoa vai trabalhar?',
  'Endereço da vaga':'Para qual filial e cidade é a vaga?',
  'Descrição da vaga':'Como você resumiria o propósito deste cargo?',
  'Atribuições do cargo':'Quais serão as principais atividades dessa pessoa?',
 };
 const lines=['Sugestões selecionadas aplicadas ao formulário. Elas ainda precisam ser salvas.'];
 if(strengths.length)lines.push('Já temos uma boa base: '+strengths.join(', ')+'.');
 if(critical.length){lines.push('Para completar as informações essenciais, falta: '+critical.map(c=>c.label.toLowerCase()).join(', ')+'.');lines.push(questions[critical[0].label]);}
 else{
  const optional=[!job.benefits.some(x=>x.trim())&&!job.additionalBenefits.trim()?'benefícios':'',!job.requirements.some(x=>x.trim())?'requisitos realmente necessários':'',!job.teamDescription.trim()?'contexto da equipe':''].filter(Boolean);
  lines.push('As informações essenciais da vaga estão preenchidas.');
  if(optional.length)lines.push('Para ajudar o candidato a decidir, podemos detalhar '+optional.join(', ')+'. Esses complementos são opcionais. Quer começar por '+optional[0]+'?');
  else lines.push('A vaga também apresenta benefícios, requisitos e contexto da equipe. Revise os textos antes de salvar.');
 }
 const process=checks.filter(c=>!c.done&&c.section===4);if(process.length)lines.push('No formulário, confira também: '+process.map(c=>c.label.toLowerCase()).join(' e ')+'.');
 return lines.join('\n\n');
}
