"use client";
import type {ReactEventHandler} from 'react';
import './proportional-image.css';
/** One source, intact foreground and a decorative blurred extension; no canvas or resize loop. */
export function ProportionalImage({src,alt,position='center',className='',compactSrc,onLoad,loading}:{src:string;alt:string;position?:string;className?:string;compactSrc?:string;onLoad?:ReactEventHandler<HTMLImageElement>;loading?:'eager'|'lazy'}){
 return <div className={`jf-proportional-image ${className}`}><picture>{compactSrc&&<source media="(max-width:680px)" srcSet={compactSrc}/>}<img className="jf-proportional-image__ambient" src={src} alt="" aria-hidden="true" decoding="async" loading={loading}/></picture><span className="jf-proportional-image__glass" aria-hidden="true"/><picture>{compactSrc&&<source media="(max-width:680px)" srcSet={compactSrc}/>}<img className="jf-proportional-image__foreground" src={src} alt={alt} decoding="async" loading={loading} onLoad={onLoad} style={{objectPosition:position}}/></picture></div>;
}
