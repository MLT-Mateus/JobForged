"use client";
import type {CSSProperties,ReactEventHandler} from 'react';
import './proportional-image.css';
export type PhotoMasks={primary:string;secondary:string};
/** One source, intact foreground and a decorative blurred extension; no canvas or resize loop. */
export function ProportionalImage({src,alt,position='center',className='',compactSrc,onLoad,loading,masks,compactMasks}:{src:string;alt:string;position?:string;className?:string;compactSrc?:string;onLoad?:ReactEventHandler<HTMLImageElement>;loading?:'eager'|'lazy';masks?:PhotoMasks;compactMasks?:PhotoMasks}){
 const layers=(pair:PhotoMasks|undefined,variant:string)=>pair&&(['primary','secondary'] as const).map(role=><span key={role} aria-hidden="true" className={`jf-proportional-image__mask ${variant}`} style={{'--jf-photo-mask':`url("${pair[role]}")`,'--jf-photo-ink':`var(--jf-photo-${role})`,maskPosition:position} as CSSProperties}/>);
 return <div className={`jf-proportional-image ${className}`}><picture>{compactSrc&&<source media="(max-width:680px)" srcSet={compactSrc}/>}<img className="jf-proportional-image__ambient" src={src} alt="" aria-hidden="true" decoding="async" loading={loading}/></picture><span className="jf-proportional-image__glass" aria-hidden="true"/><picture>{compactSrc&&<source media="(max-width:680px)" srcSet={compactSrc}/>}<img className="jf-proportional-image__foreground" src={src} alt={alt} decoding="async" loading={loading} onLoad={onLoad} style={{objectPosition:position}}/></picture>{layers(masks,compactSrc?'jf-proportional-image__mask--wide':'')}{compactSrc&&layers(compactMasks,'jf-proportional-image__mask--compact')}</div>;
}
