import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { NextRequest } from 'next/server';
import { readSession } from '@/app/api/auth/_server';
import { BackofficeManagementClient } from '@/app/components/admin/BackofficeManagementClient';
import { backofficeSections } from '@/app/components/admin/backoffice-model';
import '@/app/components/admin/admin.css';
export const metadata:Metadata={title:'JobForged | Backoffice'};
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{path:string[]}>;searchParams:Promise<{company?:string}>}) {
 const {path}=await params;
 const section=backofficeSections.find(s=>s.path===`/${path[0]}`);
 if(!section || path.length>2 || (path.length===2&&(path[0]!=='empresas'||!/^[0-9a-f-]{36}$/i.test(path[1]))))notFound();
 const incoming=await headers();
 const session=await readSession(new NextRequest('https://test.jobforged.com/backoffice',{headers:incoming}),new Headers());
 if(!session?.platformAdmin)redirect('/login');
 const filter=(await searchParams).company;
 return <BackofficeManagementClient email={session.email} section={path.length===2?'company':section.id} companyId={path[1] || (filter&&/^[0-9a-f-]{36}$/i.test(filter)?filter:undefined)}/>;
}
