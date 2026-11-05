import {headers} from 'next/headers';
import {NextRequest} from 'next/server';
import {unauthorized,forbidden,redirect} from 'next/navigation';
import {readSession,requestDatabase} from '@/app/api/auth/_server';
import {validPortalSlug} from '@/app/lib/company-portal';
import {PublicPortalAccount} from '@/app/components/personalization/PublicPortalAccount';
import {WorkspaceState} from '@/app/components/ui';
export const dynamic='force-dynamic';export const metadata={title:'JobForged | Conta do candidato'};
export default async function Page(){const incoming=await headers(),session=await readSession(new NextRequest('https://jobforged.com/candidato',{headers:incoming}),new Headers());if(!session)unauthorized();if(session.role!=='candidate')forbidden();const r=await requestDatabase('rpc/candidate_account',session.accessToken,{operation:'read',page_number:1});const a=r?.ok?await r.json() as {profile?:{slug?:string}}:null;const slug=a?.profile?.slug;if(typeof slug==='string'&&validPortalSlug(slug))redirect('/'+slug+'?acesso=entrar');return <main className="container system-status-content"><WorkspaceState title="Sua conta de candidato" description="Abra seus alertas, perfil e currículo no menu da conta." action={<PublicPortalAccount slug="" initialLogin/>}/></main>}
