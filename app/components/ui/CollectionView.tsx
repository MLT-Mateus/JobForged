"use client";

import {LayoutGrid,List,Columns3} from 'lucide-react';
import {ActionButton} from './AdminPrimitives';
import type {ReactNode} from 'react';
import './collection-view.css';

export type CollectionLayout='list'|'blocks'|'board';

export function CollectionViewSwitch({value,onChange,board=false}:{value:CollectionLayout;onChange:(value:CollectionLayout)=>void;board?:boolean}){
 return <div className="jf-collection-switch" role="group" aria-label="Visualização">
  {board&&<ActionButton variant="secondary" aria-pressed={value==='board'} icon={<Columns3/>} onClick={()=>onChange('board')}>Quadro</ActionButton>}
  <ActionButton variant="secondary" aria-pressed={value==='list'} icon={<List/>} onClick={()=>onChange('list')}>Lista</ActionButton>
  <ActionButton variant="secondary" aria-pressed={value==='blocks'} icon={<LayoutGrid/>} onClick={()=>onChange('blocks')}>Blocos</ActionButton>
 </div>;
}

export function CollectionView({value,children,className=''}:{value:CollectionLayout;children:ReactNode;className?:string}){
 return <div className={`jf-collection-view ${className}`} data-layout={value}>{children}</div>;
}
