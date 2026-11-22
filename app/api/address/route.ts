export const runtime='nodejs';
export async function GET(request:Request){
 const cep=new URL(request.url).searchParams.get('cep')||'',headers={'Cache-Control':'no-store'};
 if(!/^\d{8}$/.test(cep))return Response.json({message:'Informe os 8 dígitos do CEP.'},{status:400,headers});
 try{
  const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:AbortSignal.timeout(6000),redirect:'error',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error();
  const data=await response.json() as Record<string,unknown>;
  if(data.erro)return Response.json({message:'CEP não encontrado. Confira o número ou preencha o endereço manualmente.'},{status:404,headers});
  const text=(key:string)=>typeof data[key]==='string'?(data[key] as string).trim().slice(0,200):'';
  if(text('cep').replace(/\D/g,'')!==cep||!text('localidade')||! /^[A-Z]{2}$/.test(text('uf')))throw Error();
  return Response.json({postalCode:cep,street:text('logradouro'),district:text('bairro'),city:text('localidade'),state:text('uf')},{headers:{'Cache-Control':'public, max-age=86400'}});
 }catch{return Response.json({message:'Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.'},{status:503,headers})}
}
