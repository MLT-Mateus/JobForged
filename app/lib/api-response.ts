/** Never display a proxy HTML/plain-text body or a JSON parser exception. */
export async function apiResponse<T>(response:Response,fallback='Não foi possível concluir. Tente novamente.'):Promise<T>{
 const payload=await response.json().catch(()=>null) as (T&{message?:unknown})|null;
 if(!response.ok){
  const messages:Record<number,string>={401:'Sua sessão expirou. Entre novamente.',403:'Envio não autorizado. Confira sua sessão e as permissões da conta.',413:'O arquivo excede o tamanho permitido.',415:'Formato de arquivo não permitido.',429:'Limite temporário atingido. Aguarde e tente novamente.',503:'Serviço temporariamente indisponível. Tente novamente.'};
  throw Error(typeof payload?.message==='string'?payload.message:messages[response.status]||fallback);
 }
 if(!payload)throw Error(fallback);
 return payload;
}
