/** Cancel abandoned requests instead of holding scarce gateway slots until timeout. */
export function upstreamLifetime(response,timeout=30000){
 const controller=new AbortController();
 const close=()=>{if(!response.writableFinished)controller.abort()};
 response.once('close',close);if(response.destroyed)close();
 return {signal:AbortSignal.any([controller.signal,AbortSignal.timeout(timeout)]),dispose:()=>response.off('close',close)};
}
