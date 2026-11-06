"use client";
import {useState} from 'react';
import {EditorAccordion} from '../components/ui/Widgets';
import {BannerOrderControls,BannerVisibility} from '../components/ui/BannerOrderControls';
import {ToggleSwitch} from '../components/ui/FormControls';
import {moveBannerTo} from '../components/personalization/banner-order';
export function BannerManagementDemo(){const [items,setItems]=useState([{id:'a',title:'Conheça nossa equipe',order:0,visible:true},{id:'b',title:'Nossa cultura',order:1,visible:false},{id:'c',title:'Novas oportunidades',order:2,visible:true}]);return <div className="jf-workspace-stack"><p>O número indica a sequência. Escolha uma posição ou use as setas. Visível entra no carrossel; Oculto fica salvo para depois. Na empresa, selecione Salvar para aplicar a nova ordem.</p>{items.map((item,index)=><EditorAccordion key={item.id} title={item.title} icon={<span className="jf-banner-position">{index+1}</span>} badge={<BannerVisibility visible={item.visible}/>} defaultOpen={index===0}><ToggleSwitch label="Exibir na página" checked={item.visible} onCheckedChange={visible=>setItems(items.map(x=>x.id===item.id?{...x,visible}:x))}/><BannerOrderControls index={index} count={items.length} onMove={target=>setItems(moveBannerTo(items,index,target))}/></EditorAccordion>)}</div>}
