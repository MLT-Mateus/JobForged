import type {MetadataRoute} from 'next';
import {publicSearchPaths,searchEnvironment} from './lib/seo';
export const dynamic='force-dynamic';
export default function sitemap():MetadataRoute.Sitemap{
 const {origin,indexable}=searchEnvironment();if(!indexable)return [];
 // No fabricated lastmod: it must represent a real content update, not request time.
 return publicSearchPaths.map(path=>({url:new URL(path,origin).href}));
}
