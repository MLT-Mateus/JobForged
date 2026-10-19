import { getSupabaseConfig } from '@/app/api/auth/_server';
export async function brandingStorage(path:string,body?:Uint8Array){
 const config=getSupabaseConfig(),token=process.env.SUPABASE_BRANDING_STORAGE_TOKEN;
 if(!config||!token){console.error('[branding-storage] Missing server configuration');return null;}
 const operation=body?'upload':'read';
 const response=await fetch(`${config.url}/storage/v1/object/company-branding/${path}`,{method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(15000),
  headers:{apikey:config.anonKey,Authorization:`Bearer ${token}`,...(body?{'Content-Type':'image/png','x-upsert':'false'}:{})},...(body?{body:Buffer.from(body)}:{})}).catch(()=>{console.error('[branding-storage] Request failed',{operation});return null;});
 // No credentials, file contents or provider response bodies in diagnostics.
 if(response&&!response.ok)console.error('[branding-storage] Storage rejected request',{operation,status:response.status});
 return response;
}
