import {notFound} from 'next/navigation';
import {loadPublicPortal} from '@/app/lib/public-portal';
import {PublicCompanyPortal} from '@/app/components/personalization/PublicCompanyPortal';
export const dynamic='force-dynamic';
export const metadata={title:'Carreiras | JobForged',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{companySlug:string}>}){const {companySlug}=await params;const data=await loadPublicPortal(companySlug);if(!data)notFound();return <PublicCompanyPortal data={data}/>}
