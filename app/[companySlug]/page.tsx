import {ExternalCompanyPreview} from '../components/personalization/ExternalCompanyPreview';
export const metadata={title:'Prévia empresarial | JobForged',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{companySlug:string}>}){const {companySlug}=await params;return <ExternalCompanyPreview slug={companySlug}/>}
