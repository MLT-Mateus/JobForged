"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';

import {WorkspaceState} from '../ui';
export function ExternalCompanyPreview(){const [error,setError]=useState(false);useEffect(()=>{void fetch('/api/company/portal',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();location.replace('/api/company/portal/open')}).catch(()=>setError(true))},[]);return <WorkspaceState kind={error?'error':'loading'} title={error?'Entre na conta empresarial para abrir a página.':'Abrindo página da empresa...'} action={error?<Link className="jf-action jf-action--primary" href="/login?next=%2Fapp%2Fpersonalizacao">Entrar</Link>:undefined}/>}
