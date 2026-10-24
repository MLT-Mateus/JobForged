export const adminVerificationMessage='Confirme sua autenticação em Segurança para continuar.';
export async function administrativeFailure(response:Response|null|undefined,fallback:string,headers:Headers,defaultStatus=400){
 const error=await response?.json().catch(()=>null) as {message?:string}|null;
 if(response?.status===403&&error?.message==='recent MFA required')return Response.json({code:'ADMIN_MFA_REQUIRED',message:adminVerificationMessage},{status:403,headers});
 if(response?.status===429){headers.set('Retry-After','60');return Response.json({code:'RATE_LIMITED',message:'Limite temporário atingido. Aguarde e tente novamente.'},{status:429,headers});}
 return Response.json({message:fallback},{status:response?.status===403?403:defaultStatus,headers});
}
