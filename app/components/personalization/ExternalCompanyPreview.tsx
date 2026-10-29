"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {portalService} from './portal-service';
import {WorkspaceState} from '../ui';
export function ExternalCompanyPreview(){const [error,setError]=useState(false);useEffect(()=>{void portalService.load().then(p=>location.replace('/'+p.slug)).catch(()=>setError(true))},[]);return <WorkspaceState kind={error?'error':'loading'} title={error?'Entre na conta empresarial para abrir a página.':'Abrindo página da empresa...'} action={error?<Link className="jf-action jf-action--primary" href="/login?next=%2Fapp%2Fpersonalizacao">Entrar</Link>:undefined}/>}
