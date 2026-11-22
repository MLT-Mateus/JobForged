import type { NextRequest } from "next/server";
import { readSession, requestDatabase, requireSameOrigin } from "@/app/api/auth/_server";
import { isValidCpf } from "@/app/components/auth/auth-validation";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const headers=new Headers({"Cache-Control":"no-store"});
  const session=await readSession(request,headers);
  if(!session || session.platformAdmin || !session.company)return Response.json({message:"Acesso negado."},{status:403,headers});
  const response=await requestDatabase("rpc/account_read_v1",session.accessToken,{});
  if(!response?.ok)return Response.json({message:"Não foi possível carregar seu perfil."},{status:503,headers});
  return Response.json(await response.json(),{headers});
}
export async function PATCH(request: NextRequest) {
  if (!requireSameOrigin(request)) return Response.json({ message: "Origem inválida." }, { status: 403 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  const session = await readSession(request, headers);
  if (!session || session.platformAdmin || !session.company) return Response.json({ message: "Acesso negado." }, { status: 403, headers });
  const body = await request.json().catch(() => null) as { fullName?: unknown; cpf?: unknown; phone?: unknown } | null;
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  if (fullName.length < 3 || fullName.length > 120) return Response.json({ message: "Informe um nome entre 3 e 120 caracteres." }, { status: 400, headers });
  if(body&&('cpf' in body||'phone' in body)&&(!('cpf' in body)||!('phone' in body)))return Response.json({message:'Envie CPF e telefone juntos para atualizar a identificação.'},{status:400,headers});
  const cpf=typeof body?.cpf==='string'?body.cpf.replace(/\D/g,''):'';
  const phone=typeof body?.phone==='string'?body.phone.replace(/\D/g,''):'';
  if((body?.cpf!=null&&typeof body.cpf!=='string')||(cpf&&!isValidCpf(cpf)))return Response.json({message:"Informe um CPF válido.",field:"cpf"},{status:400,headers});
  if((body?.phone!=null&&typeof body.phone!=='string')||(phone&&!/^\d{10,11}$/.test(phone)))return Response.json({message:"Informe DDD e telefone com 10 ou 11 dígitos.",field:"phone"},{status:400,headers});
  // Old clients may still save only the name; do not clear their identity fields.
  const identity=body&&('cpf' in body||'phone' in body);
  const response = await requestDatabase(identity?"rpc/update_my_member_identity_v1":"rpc/update_my_member_profile", session.accessToken, identity?{new_full_name:fullName,new_cpf:cpf||null,new_phone:phone||null}:{ new_full_name: fullName });
  if (!response?.ok) return Response.json({ message: "Não foi possível salvar o perfil." }, { status: 400, headers });
  const member = await response.json() as {full_name?:string;fullName?:string;cpf?:string|null;phone?:string|null};
  return Response.json(identity?member:{ fullName: member.full_name }, { headers });
}
