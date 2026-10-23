import {sanitizeRichText} from './rich-content';
export function RichContent({value}:{value:string}){return <span className="jf-rich-content" dangerouslySetInnerHTML={{__html:sanitizeRichText(value)}}/>}
