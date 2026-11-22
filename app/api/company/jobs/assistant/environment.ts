/** Fixed, server-owned destinations: never accept a workflow or host from input. */
export function assistantEnvironment(){
 const environment=process.env.APP_ENV;
 return environment==='test'||environment==='live'?environment:null;
}
export function assistantWebhook(environment:'test'|'live',operation:'authoring'|'authoring-stream'|'media'){
 return `https://n8n.jobforged.com/webhook/jbfd-${environment}-job-${operation}`;
}
