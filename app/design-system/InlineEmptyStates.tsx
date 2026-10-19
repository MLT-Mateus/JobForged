"use client";
import {Search,Filter} from 'lucide-react';
import {EmptyState,Panel,PanelHeading} from '../components/ui';
export function InlineEmptyStates(){
 return <div className="ds-empty-grid"><Panel><PanelHeading title="Em linha · pesquisas"/><EmptyState icon={Search} variant="inline" title="Nenhum resultado" description="Experimente outro termo de pesquisa."/></Panel><Panel><PanelHeading title="Em linha · filtros"/><EmptyState icon={Filter} variant="inline" title="Nenhum resultado com estes filtros" description="Remova ou ajuste os filtros para ver outros registros."/></Panel></div>;
}
