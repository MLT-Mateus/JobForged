import {renderRichText} from './rich-content';
export function RichContent({value}:{value:string}){return <span className="jf-rich-content" dangerouslySetInnerHTML={{__html:renderRichText(value)}}/>}
