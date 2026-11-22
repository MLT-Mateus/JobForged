"use client";
import {useEffect,useState} from 'react';
import {CreditCard} from 'lucide-react';
import {Panel,PanelHeading,WorkspacePageHeader,StatusBadge,WorkspaceState,ActionButton,EmptyState} from '../ui';
import {planLabel,planStatusLabel} from '../admin/display-labels';
type BillingCompany={name:string;plan_id:string;plan_status:string};
/** Only persisted subscription data: payment integration is not available. */
export function FinanceDemo(){
 const [company,setCompany]=useState<BillingCompany|null>(null),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{const controller=new AbortController();void fetch('/api/company',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json() as Promise<{company:BillingCompany}>}).then(value=>{if(!controller.signal.aborted){setCompany(value.company);setError(false)}}).catch(()=>{if(!controller.signal.aborted)setError(true)});return()=>controller.abort()},[revision]);
 return <><WorkspacePageHeader section="Painel / Financeiro" title="Financeiro" description="Plano e informações de cobrança da empresa."/>{error?<WorkspaceState kind="error" title="Não foi possível consultar o plano" action={<ActionButton onClick={()=>setRevision(v=>v+1)}>Tentar novamente</ActionButton>}/>:!company?<WorkspaceState title="Carregando plano..."/>:<Panel><PanelHeading title="Plano atual"/><div className="jf-panel-body jf-workspace-toolbar"><strong>{planLabel(company.plan_id)}</strong><StatusBadge tone="info">{planStatusLabel(company.plan_status)}</StatusBadge></div></Panel>}<Panel><PanelHeading title="Cobranças"/><EmptyState variant="compact" icon={CreditCard} title="Cobranças ainda não disponíveis" description="Quando a cobrança estiver integrada, suas faturas e formas de pagamento aparecerão aqui."/></Panel></>;
}
