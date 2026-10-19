import {renderEmailHtml} from '@/app/design-system/email-template-catalog';
export function platformCommunicationHtml({title,message,link}:{title:string;message:string;link:string}){
 const origin=process.env.APP_ENV==='test'?'https://test.jobforged.com':'https://jobforged.com';
 return renderEmailHtml('platform-communication','light',false,{}, {COMMUNICATION_TITLE:title,COMMUNICATION_MESSAGE:message,APP_URL:link||origin+'/app/home'});
}
export async function sendPlatformCommunicationEmail(item:{email:string;title:string;message:string;link:string}):Promise<'sent'|'failed'|'uncertain'>{
 try{const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(5000),headers:{accept:'application/json','api-key':process.env.BREVO_API_KEY!,'content-type':'application/json'},body:JSON.stringify({sender:{name:'JobForged',email:'suporte@jobforged.com'},to:[{email:item.email}],subject:item.title.replace(/[\r\n\u0000-\u001f\u007f]/g,' '),htmlContent:platformCommunicationHtml(item),textContent:item.title+'\n\n'+item.message+(item.link?'\n'+item.link:'')})});return response.ok?'sent':response.status>=500?'uncertain':'failed'}catch{return 'uncertain'}
}
