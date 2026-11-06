/** Public errors never expose provider responses, HTML, parser failures or secrets. */
export function publicError(message:unknown,fallback='Não foi possível concluir. Tente novamente.'):string{
 if(typeof message!=='string'||!message.trim())return fallback;
 const value=message.trim();
 const known:Record<string,string>={
 'Service busy':'Há muitas solicitações ao mesmo tempo. Aguarde alguns segundos e tente novamente.',
 'Security gateway unavailable':'A conexão com o serviço foi interrompida. Aguarde alguns segundos e tente novamente.',
 'Failed to fetch':'Não foi possível conectar. Confira sua internet e tente novamente.',
 'NetworkError when attempting to fetch resource.':'Não foi possível conectar. Confira sua internet e tente novamente.',
 'Session unavailable':'Sua sessão não está disponível. Entre novamente.',
 'Too many requests. Try again later.':'Você fez muitas solicitações. Aguarde um minuto antes de tentar novamente.',
 'Forbidden':'Sua conta não tem permissão para esta ação. Confira a conta conectada.',
 'Not found':'Este item não foi encontrado. Atualize a página e tente novamente.',
 'Invalid request':'Não foi possível interpretar os dados. Confira os campos e tente novamente.',
 'Invalid API path':'Este endereço não está disponível. Volte à página anterior.',
 'Private administration required':'Esta ação exige uma conta administrativa autorizada.',
 'Storage operation unavailable':'Esta operação de arquivo não está disponível para sua conta.',
 'Request too large':'Os dados excedem o tamanho permitido. Reduza o arquivo e tente novamente.',
 'Use a simple PDF up to 5 MB':'Envie um PDF de até 5 MB.',
 'Use a valid static PNG image':'Envie uma imagem PNG válida, sem animação.',
 'Use at least 8 characters, uppercase, lowercase, number and symbol, up to 72 UTF-8 bytes':'Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo. Evite senhas muito longas.',
 };
 if(known[value])return known[value];
 if(value.length>600||/<[a-z!]|unexpected token|not valid json|json.parse|syntaxerror|postgres|sqlstate|jwt|stack trace|authorization|bearer |access_token|refresh_token|token=|failed to|internal server error/i.test(value))return fallback;
 // Unknown upstream text is not a user-facing contract. Keep reviewed Portuguese messages.
 return /[áàâãéêíóôõúç]|\b(não|informe|use|aguarde|revise|confira|sua|seu|dados|campo|limite|quota|atingida|arquivo|imagem|senha|conta|endereço|sessão|domínio|erro|formato|acesso|empresa|você)\b/i.test(value)?value:fallback;
}
export async function apiResponse<T>(response:Response,fallback='Não foi possível concluir. Tente novamente.'):Promise<T>{
 const payload=await response.json().catch(()=>null) as (T&{message?:unknown})|null;
 if(!response.ok){
  const messages:Record<number,string>={400:'Confira os dados informados e tente novamente.',401:'Sua sessão expirou. Entre novamente.',403:'Sua conta não tem permissão para esta ação. Confira a conta conectada.',404:'Este item não foi encontrado. Atualize a página.',409:'Os dados mudaram em outra sessão. Atualize antes de tentar novamente.',413:'O arquivo excede o tamanho permitido.',415:'Formato de arquivo não permitido. Confira os formatos indicados no campo.',422:'Revise os campos indicados antes de continuar.',429:'Limite temporário atingido. Aguarde um minuto e tente novamente.',500:'Não foi possível concluir no momento. Tente novamente; se continuar, contate o suporte.',502:'A conexão com o serviço foi interrompida. Tente novamente.',503:'Serviço temporariamente ocupado. Aguarde alguns segundos e tente novamente.',504:'A consulta demorou mais que o esperado. Tente novamente.'};
  throw Error(publicError(payload?.message,messages[response.status]||fallback));
 }
 if(!payload)throw Error(fallback);
 return payload;
}
/** Only idempotent reads retry once; cancel on navigation. Never retry writes or rate limits. */
export async function readApi<T>(url:string,fallback:string,signal?:AbortSignal):Promise<T>{
 for(let attempt=0;attempt<2;attempt++){
  let response:Response;
  try{response=await fetch(url,{cache:'no-store',credentials:'same-origin',signal})}catch(error){if(signal?.aborted)throw error;throw Error('Não foi possível conectar. Confira sua internet e tente novamente.')}
  if(attempt===0&&[502,503,504].includes(response.status)){
   const retry=Number(response.headers.get('Retry-After'));const delay=Number.isFinite(retry)&&retry>0?Math.min(retry*1000,3000):400;
   await response.body?.cancel();
   await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Consulta cancelada','AbortError'))};const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve()},delay+Math.random()*300);if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true})});continue;
  }
  return apiResponse<T>(response,fallback);
 }
 throw Error(fallback);
}
