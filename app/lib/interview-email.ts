import {renderEmailHtml} from '../design-system/email-template-catalog.ts';
export function renderInterviewEmail(data:{company:string;name:string;title:string;startsAt:string;endsAt:string;url:string;logo:string;color:string}){
 const time=(value:string)=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long',timeStyle:'short'});
 return renderEmailHtml('interview-invitation','light',false,{}, {
  COMPANY_NAME:data.company,CANDIDATE_NAME:data.name,JOB_TITLE:data.title,
  INTERVIEW_START:time(data.startsAt),INTERVIEW_END:time(data.endsAt),MEETING_URL:data.url,
  INTERVIEW_NOTE:data.url==='https://meet.google.com/'?'Este é um convite de demonstração. A empresa deve fornecer o link da reunião antes da entrevista.':'Confira o horário e acesse o link no momento da entrevista.',
 });
}
