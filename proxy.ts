import {NextRequest,NextResponse} from 'next/server';
import {publicSearchPaths,searchEnvironment} from './app/lib/seo';
import {getSupabaseConfig,requestDatabase} from './app/api/auth/_server';
import {validCompanyHostname} from './app/lib/company-domain';
/** Custom hosts can render only their verified tenant, never the business/admin panels. */
export async function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;const headers=new Headers();
 if(!searchEnvironment().indexable||!publicSearchPaths.includes(path))headers.set('X-Robots-Tag','noindex, follow');
 // The gateway overwrites this header from the original Host. It is still only
 // a lookup hint: custom names must pass the database proof before routing.
 let hostname=request.nextUrl.hostname.toLowerCase();const forwarded=request.headers.get('x-forwarded-host');
 if(forwarded){try{const origin=new URL('https://'+forwarded);if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error();hostname=origin.hostname.toLowerCase()}catch{return new NextResponse('Origem inválida.',{status:400,headers})}}
 const primary=new URL(process.env.APP_PUBLIC_URL||'https://test.jobforged.com').hostname;
 const canonical=[primary,primary==='jobforged.com'?'www.jobforged.com':'', 'localhost','127.0.0.1','[::1]'].includes(hostname);
 if(!canonical){
  if(!validCompanyHostname(hostname))return new NextResponse('Página não encontrada.',{status:404,headers});
  try{const config=getSupabaseConfig();if(!config)throw new Error();const r=await requestDatabase('rpc/resolve_company_domain',config.anonKey,{requested_hostname:hostname});if(!r?.ok)throw new Error();const slug=await r.json() as string|null;
   if(!slug)return new NextResponse('Domínio não verificado ou indisponível.',{status:404,headers});
   headers.set('Cache-Control','private, no-store');
   if(path==='/api/domain-ready')return NextResponse.json({ready:true},{headers});
   if(path==='/recuperar-senha')return NextResponse.redirect(new URL('/recuperar-senha',process.env.APP_PUBLIC_URL||'https://test.jobforged.com'),303);
   if(path==='/'){const target=new URL(request.url);target.pathname='/'+slug;return NextResponse.rewrite(target,{headers})}
   if(path==='/'+slug)return NextResponse.redirect(new URL('/',request.url));
   const accountRead=['/api/auth/session','/api/portal/account','/api/portal/resume'].includes(path)&&['GET','HEAD'].includes(request.method);
   const accountWrite=['/api/auth/sign-in','/api/auth/sign-out','/api/auth/recover','/api/auth/candidate-sign-up','/api/portal/account','/api/portal/resume'].includes(path)&&request.method==='POST';
   const allowed=accountRead||accountWrite||['/termos-servico','/politicas-privacidade'].includes(path)||path.startsWith('/api/portals/'+slug+'/assets/')||/^\/(careers|fonts|brand|assets)\//.test(path);
   if(!allowed)return new NextResponse('Página não encontrada.',{status:404,headers});
  }catch{return new NextResponse('Serviço temporariamente indisponível.',{status:503,headers})}
 }
 if(path==='/500'||path==='/503'){headers.set('Cache-Control','no-store');return NextResponse.next({status:path==='/503'?503:500,headers})}
 return NextResponse.next({headers});
}
export const config={matcher:['/((?!_next/|assets/|brand/|fonts/|favicon).*)']};
