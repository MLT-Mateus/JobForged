"use client";
import type {ReactNode} from 'react';
import {BrandAsset} from '../BrandAsset';
import {InlineBrandLoader} from '../InlineBrandLoader';
export function ChatBubble({role,children}:{role:'assistant'|'user';children:ReactNode}){return <article className={'jf-chat-message is-'+role}>{role==='assistant'&&<span className="jf-chat-avatar"><BrandAsset src="/brand/jobforged-symbol.svg" width={30} height={30} alt=""/></span>}<div className="jf-chat-bubble"><span className="jf-chat-author">{role==='assistant'?'JobForged':'Você'}</span>{children}</div></article>}
export function ChatProcessing({label='Preparando sua resposta'}:{label?:string}){return <div className="jf-chat-processing" role="status"><InlineBrandLoader/><span>{label}<span className="jf-chat-dots" aria-hidden="true">...</span></span></div>}
export function ChatComposer({children}:{children:ReactNode}){return <div className="jf-chat-composer">{children}</div>}
