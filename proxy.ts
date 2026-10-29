import {NextRequest,NextResponse} from 'next/server';
import {publicSearchPaths,searchEnvironment} from './app/lib/seo';
/** Indexing headers never grant access or change authentication. */
export function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;const headers=new Headers();
 if(!searchEnvironment().indexable||!publicSearchPaths.includes(path))headers.set('X-Robots-Tag','noindex, follow');
 if(path==='/500'||path==='/503'){headers.set('Cache-Control','no-store');return NextResponse.next({status:path==='/503'?503:500,headers})}
 return NextResponse.next({headers});
}
export const config={matcher:['/((?!_next/|assets/|brand/|fonts/|favicon).*)']};
