import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {isValidCpf} from '@/app/components/auth/auth-validation';
export const runtime='nodejs';
export async function PATCH(request:NextRequest){
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403});
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 const b=await request.json().catch(()=>null) as {id?:unknown;fullName?:unknown;cpf?:unknown;phone?:unknown}|null;
 if(typeof b?.id!=='string'||!/^[0-9a-f-]{36}$/i.test(b.id)||typeof b.fullName!=='string'||typeof b.cpf!=='string'||typeof b.phone!=='string')return Response.json({message:'Informe nome, CPF e telefone.'},{status:400,headers});
 const name=b.fullName.trim(),cpf=b.cpf.replace(/\D/g,''),phone=b.phone.replace(/\D/g,'');
 if(name.length<3||name.length>120)return Response.json({message:'Informe um nome entre 3 e 120 caracteres.',field:'fullName'},{status:400,headers});
 if(cpf&&!isValidCpf(cpf))return Response.json({message:'Informe um CPF válido.',field:'cpf'},{status:400,headers});
 if(phone&&!/^\d{10,11}$/.test(phone))return Response.json({message:'Informe DDD e telefone com 10 ou 11 dígitos.',field:'phone'},{status:400,headers});
 const response=await requestDatabase('rpc/update_company_member_identity_v1',session.accessToken,{target_member_id:b.id,new_full_name:name,new_cpf:cpf||null,new_phone:phone||null}).catch(()=>null);
 if(!response?.ok)return Response.json({message:'Não foi possível atualizar os dados deste usuário.'},{status:response?.status===403?403:400,headers});
 return Response.json(await response.json(),{headers});
}
