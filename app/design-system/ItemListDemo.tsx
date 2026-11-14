"use client";
import {useState} from 'react';
import {ItemListField} from '../components/ui';
export function ItemListDemo(){const [items,setItems]=useState(['Triagem','Entrevista']);return <ItemListField label="Etapas do processo" ordered items={items} onChange={setItems}/>}
