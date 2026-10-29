import type {MetadataRoute} from 'next';
import {searchEnvironment} from './lib/seo';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{
 const {origin,indexable}=searchEnvironment();
 // Crawlers must be able to read noindex, including on previously discoverable Test pages.
 return {rules:[{userAgent:'*',allow:'/'}],...(indexable?{sitemap:`${origin}/sitemap.xml`,host:origin}:{})};
}
