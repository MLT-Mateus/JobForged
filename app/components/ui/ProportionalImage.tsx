"use client";
import './proportional-image.css';
/** One source, intact foreground and a decorative blurred extension; no canvas or resize loop. */
export function ProportionalImage({src,alt,position='center',className='',compactSrc}:{src:string;alt:string;position?:string;className?:string;compactSrc?:string}){
 return <div className={`jf-proportional-image ${className}`}><picture>{compactSrc&&<source media="(max-width:680px)" srcSet={compactSrc}/>}<img className="jf-proportional-image__ambient" src={src} alt="" aria-hidden="true" decoding="async"/></picture><span className="jf-proportional-image__glass" aria-hidden="true"/><picture>{compactSrc&&<source media="(max-width:680px)" srcSet={compactSrc}/>}<img className="jf-proportional-image__foreground" src={src} alt={alt} decoding="async" style={{objectPosition:position}}/></picture></div>;
}
