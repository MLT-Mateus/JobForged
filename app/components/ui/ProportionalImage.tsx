"use client";
/* eslint-disable @next/next/no-img-element */
import './proportional-image.css';
/** One source, intact foreground and a decorative blurred extension; no canvas or resize loop. */
export function ProportionalImage({src,alt,position='center',className=''}:{src:string;alt:string;position?:string;className?:string}){
 return <div className={`jf-proportional-image ${className}`}><img className="jf-proportional-image__ambient" src={src} alt="" aria-hidden="true" decoding="async"/><span className="jf-proportional-image__glass" aria-hidden="true"/><img className="jf-proportional-image__foreground" src={src} alt={alt} decoding="async" style={{objectPosition:position}}/></div>;
}
