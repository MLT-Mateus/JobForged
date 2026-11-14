import {emailRecipient} from './email-recipient.ts';
import {renderEmailHtml} from '../design-system/email-template-catalog.ts';
export function platformCommunicationHtml({title,message,link}:{title:string;message:string;link:string}){
 const origin=process.env.APP_ENV==='test'?'https://test.jobforged.com':'https://jobforged.com';
 return renderEmailHtml('platform-communication','light',false,{}, {COMMUNICATION_TITLE:title,COMMUNICATION_MESSAGE:message,APP_URL:link||origin+'/app/home'});
}
export async function sendPlatformCommunicationEmail(item:{email:string;title:string;message:string;link:string}):Promise<'sent'|'failed'|'uncertain'>{
 const recipient=emailRecipient(item.email);if(!recipient)return 'failed';
 try{const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(5000),headers:{accept:'application/json','api-key':process.env.BREVO_API_KEY!,'content-type':'application/json'},body:JSON.stringify({sender:{name:'JobForged',email:'suporte@jobforged.com'},to:[{email:recipient}],subject:item.title.replace(/[\r\n\u0000-\u001f\u007f]/g,' '),htmlContent:platformCommunicationHtml(item),textContent:item.title+'\n\n'+item.message+(item.link?'\n'+item.link:'')+'\n\n'+(process.env.APP_ENV==='test'?'[TESTE] · ':'')+'Enviado por JobForged'})});return response.ok?'sent':response.status>=500?'uncertain':'failed'}catch{return 'uncertain'}
}
