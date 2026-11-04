"use client";
import {createContext,useContext,type ReactNode} from 'react';
const Context=createContext<Record<string,string>>({});
export function FieldFeedback({errors,children}:{errors:Record<string,string>;children:ReactNode}){return <Context.Provider value={errors}>{children}</Context.Provider>}
export function useFieldError(name?:string){const errors=useContext(Context);return name?errors[name]:undefined}
/** Activate the containing tab, expand ancestors, then focus without losing field values. */
export function revealField(root:HTMLElement,field:HTMLElement,activate?:(group:string)=>void){
 const group=field.closest<HTMLElement>('[data-appearance-group]')?.dataset.appearanceGroup;if(group)activate?.(group);
 let parent=field.parentElement;while(parent&&parent!==root){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement}
 requestAnimationFrame(()=>requestAnimationFrame(()=>{field.focus({preventScroll:true});field.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}));
}
