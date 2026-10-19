"use client";
import {ActionButton,Panel,PanelHeading,WorkspacePageHeader} from '../ui';
import {brandingStyle} from './branding-model';
import type {Customization} from './personalization-types';
import './company-branding.css';
/** The same token consumer is used by the editor and the Design System. */
export function CompanyPanelPreview({data,theme}:{data:Customization;theme:'light'|'dark'}){
 return <div className="company-branding jf-panel-body jf-workspace-stack" data-theme={theme} style={{...brandingStyle(data,theme),background:'var(--jf-ui-surface-soft)',backgroundImage:'var(--company-panel-image)',backgroundSize:'var(--company-panel-fit)',backgroundPosition:'var(--company-panel-position)',color:'var(--jf-ui-text)'}}>
  <WorkspacePageHeader section={data.shortName} title={data.displayName} description={data.slogan||'Prévia de identidade visual. Os dados desta demonstração não são registros da empresa.'}/>
  <Panel><PanelHeading title="Identidade da equipe" description="Títulos e textos usam o par tipográfico selecionado."/><div className="jf-panel-body jf-workspace-stack"><p>As cores e fontes desta prévia seguem os mesmos tokens utilizados pelo painel empresarial.</p><div className="jf-workspace-toolbar"><ActionButton type="button">Ação principal</ActionButton><ActionButton type="button" variant="secondary">Ação secundária</ActionButton></div></div></Panel>
 </div>;
}
