import type {Metadata} from 'next';
import LandingPage from './components/LandingPage';
import {brandTitle,brandDescription,publicPageMetadata,searchEnvironment,landingStructuredData} from './lib/seo';
export const dynamic='force-dynamic';
export function generateMetadata():Metadata{
 const {origin,indexable}=searchEnvironment();const token=process.env.GOOGLE_SITE_VERIFICATION;
 return {...publicPageMetadata('/'),title:brandTitle,description:brandDescription,
 openGraph:{title:brandTitle,description:brandDescription,url:origin,siteName:'JobForged',locale:'pt_BR',type:'website',images:[{url:'/brand/jobforged-logo.png',width:636,height:184,alt:'JobForged'}]},
 twitter:{card:'summary',title:brandTitle,description:brandDescription,images:['/brand/jobforged-symbol.png']},
 ...(indexable&&token&&/^[A-Za-z0-9_-]{10,256}$/.test(token)?{verification:{google:token}}:{})};
}
export default function Home(){const {origin}=searchEnvironment();return <><LandingPage/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(landingStructuredData(origin)).replace(/</g,'\\u003c')}}/></>}
