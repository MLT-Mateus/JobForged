"use client";
import {RichTextField,TextField,TextAreaField} from './FormControls';
import {richTextPlain} from './rich-content';
/** Existing formatting stays editable; new short copy uses a compact control. */
export function ContentField({value,onChange,label,name,maxLength=120,multiline=false,resetKey}:{value:string;onChange:(value:string)=>void;label:string;name?:string;maxLength?:number;multiline?:boolean;resetKey?:string|number}){
 const formatted=/<(?:strong|em|b|i|u|a|ul|ol|h[1-6])(?:\s|>)/i.test(value);
 if(formatted)return <RichTextField textOnly maxLength={maxLength} resetKey={resetKey} name={name} label={label} value={value} onChange={onChange}/>;
 return multiline?<TextAreaField name={name} label={label} value={richTextPlain(value)} maxLength={maxLength} onChange={e=>onChange(e.target.value)}/>:<TextField name={name} label={label} value={richTextPlain(value)} maxLength={maxLength} onChange={e=>onChange(e.target.value)}/>;
}
