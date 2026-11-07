"use client";
import {useState} from 'react';
import {AdaptiveNavigation} from '../components/ui/AdaptiveNavigation';
import {TextField} from '../components/ui';
export function AdaptiveNavigationDemo(){
 const [label,setLabel]=useState('Conheça nossas oportunidades e trajetórias');
 return <section className="ds-modern-stack"><h3>Navegação adaptativa</h3><p>Os links viram um menu quando o conteúdo deixa de caber. O menu permite rolagem, quebra rótulos longos e fecha com Escape, ao escolher um link ou ao clicar fora.</p><TextField label="Rótulo de demonstração" value={label} onChange={event=>setLabel(event.target.value)} placeholder="Escreva o rótulo..."/><div style={{display:'flex',maxWidth:600,gap:'var(--jf-ui-space-4)'}}><AdaptiveNavigation label="Navegação de demonstração"><a className="jf-nav-link" href="#navegacao">{label}</a><a className="jf-nav-link" href="#navegacao">Nossa cultura</a><a className="jf-nav-link" href="#navegacao">Fale com a equipe</a></AdaptiveNavigation></div></section>;
}
