import loader from '../../public/brand/jobforged-loader-rotating.svg?raw';

/** Approved motion and geometry, colored by the active shared brand tokens. */
export function JobForgedLoadingAnimation({size=112,className='',variant='primary'}:{size?:number;className?:string;variant?:'primary'|'inverted'}) {
 const primary='var(--jf-loader-primary, var(--jf-ui-brand))',secondary='var(--jf-loader-secondary, var(--jf-ui-accent))';
 return <span className={`jf-brand-loader ${className}`} style={{width:size,height:size}} aria-hidden="true" dangerouslySetInnerHTML={{__html:loader.replaceAll('#20B2AA',variant==='inverted'?secondary:primary).replaceAll('#4169E1',variant==='inverted'?primary:secondary)}}/>;
}
