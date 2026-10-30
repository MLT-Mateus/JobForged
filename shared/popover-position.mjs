/** Prefer below; flip above only when needed, then constrain the taller side. */
export function popoverPosition(anchor,height,viewport,align='start'){
 const edge=12,gap=8,leftEdge=viewport.left??0,topEdge=viewport.top??0;
 const width=Math.min(300,Math.max(0,viewport.width-2*edge));
 const below=Math.max(0,topEdge+viewport.height-anchor.bottom-gap-edge),above=Math.max(0,anchor.top-topEdge-gap-edge);
 const side=height<=below?'bottom':height<=above?'top':below>=above?'bottom':'top';
 const maxHeight=side==='bottom'?below:above,shown=Math.min(height,maxHeight);
 return {side,width,maxHeight,top:side==='bottom'?anchor.bottom+gap:anchor.top-gap-shown,left:Math.max(leftEdge+edge,Math.min(align==='end'?anchor.right-width:anchor.left,leftEdge+viewport.width-edge-width))};
}
