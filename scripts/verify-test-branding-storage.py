#!/usr/bin/env python3
"""Non-sensitive PNG probe of the private Test bucket; no application account used."""
import base64
import json
import os
import subprocess
import uuid

def main():
    if os.geteuid()!=0:
        raise SystemExit('Execute como root na VPS de Test.')
    # Exercise the running application's environment, not an injected .env file.
    payload={}
    payload['path']='00000000-0000-4000-8000-000000000083/'+str(uuid.uuid4())+'.png'
    payload['image']=base64.b64encode(open('/opt/jbfd/preparation-branding/probe.png','rb').read()).decode()
    code="""let input='';for await(const chunk of process.stdin)input+=chunk;const c=JSON.parse(input);
const base=process.env.SUPABASE_INTERNAL_URL,token=process.env.SUPABASE_BRANDING_STORAGE_TOKEN,headers={apikey:process.env.SUPABASE_ANON_KEY,Authorization:'Bearer '+token};
const paths=[c.path,'platform/'+c.path.split('/')[1]];
for(const objectPath of paths){
const path='/storage/v1/object/company-branding/'+objectPath;
const put=await fetch(base+path,{method:'POST',headers:{...headers,'Content-Type':'image/png','x-upsert':'false'},body:Buffer.from(c.image,'base64')});
const read=await fetch(base+path,{headers});const bytes=Buffer.from(await read.arrayBuffer());
const denied=await fetch(base+path,{headers:{apikey:c.SUPABASE_ANON_KEY,Authorization:'Bearer '+c.SUPABASE_ANON_KEY}});
const app=await fetch(base+'/rest/v1/rpc/read_company_branding',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});
const result={namespace:objectPath.startsWith('platform/')?'platform':'company',upload:put.status,read:read.status,integrity:bytes.equals(Buffer.from(c.image,'base64')),anonymous:denied.status,appAccess:app.status};
console.log(JSON.stringify(result));if(!put.ok||!read.ok||!result.integrity||denied.ok||app.ok)process.exitCode=1;
}
const invalid=await fetch(base+'/storage/v1/object/company-branding/unapproved/'+c.path.split('/')[1],{method:'POST',headers:{...headers,'Content-Type':'image/png'},body:Buffer.from(c.image,'base64')});
console.log(JSON.stringify({unsupportedNamespaceDenied:!invalid.ok,status:invalid.status}));if(invalid.ok)process.exitCode=1;
"""
    result=subprocess.run(['docker','exec','-i','jbfd-test-app-1','node','--input-type=module','-e',code],input=json.dumps(payload),text=True,capture_output=True)
    if result.stdout:
        print(result.stdout.strip())
    if result.returncode:
        raise SystemExit('A verificaÃ§Ã£o do bucket Test falhou. Nenhuma credencial foi exibida.')

if __name__=='__main__':
    main()
