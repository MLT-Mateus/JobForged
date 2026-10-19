#!/usr/bin/env python3
"""Non-sensitive PNG probe of the private Test bucket; no application account used."""
import base64
import json
import os
import shlex
import subprocess
import uuid

def main():
    if os.geteuid()!=0:
        raise SystemExit('Execute como root na VPS de Test.')
    with open('/opt/jbfd/test/.env',encoding='utf-8') as handle:
        settings=dict(line.strip().split('=',1) for line in handle if '=' in line and not line.lstrip().startswith('#'))
    payload={name:shlex.split(settings[name])[0] for name in ['SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY','SUPABASE_BRANDING_STORAGE_TOKEN']}
    payload['path']='00000000-0000-4000-8000-000000000083/'+str(uuid.uuid4())+'.png'
    payload['image']=base64.b64encode(open('/opt/jbfd/preparation-branding/probe.png','rb').read()).decode()
    code="""let input='';for await(const chunk of process.stdin)input+=chunk;const c=JSON.parse(input);
const base=c.SUPABASE_INTERNAL_URL,token=c.SUPABASE_BRANDING_STORAGE_TOKEN,headers={apikey:c.SUPABASE_ANON_KEY,Authorization:'Bearer '+token};
const path='/storage/v1/object/company-branding/'+c.path;
const put=await fetch(base+path,{method:'POST',headers:{...headers,'Content-Type':'image/png','x-upsert':'false'},body:Buffer.from(c.image,'base64')});
const read=await fetch(base+path,{headers});const bytes=Buffer.from(await read.arrayBuffer());
const denied=await fetch(base+path,{headers:{apikey:c.SUPABASE_ANON_KEY,Authorization:'Bearer '+c.SUPABASE_ANON_KEY}});
const app=await fetch(base+'/rest/v1/rpc/read_company_branding',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});
const result={upload:put.status,read:read.status,integrity:bytes.equals(Buffer.from(c.image,'base64')),anonymous:denied.status,appAccess:app.status};
console.log(JSON.stringify(result));if(!put.ok||!read.ok||!result.integrity||denied.ok||app.ok)process.exitCode=1;
"""
    result=subprocess.run(['docker','exec','-i','jbfd-test-app-1','node','--input-type=module','-e',code],input=json.dumps(payload),text=True,capture_output=True)
    if result.stdout:
        print(result.stdout.strip())
    if result.returncode:
        raise SystemExit('A verificação do bucket Test falhou. Nenhuma credencial foi exibida.')

if __name__=='__main__':
    main()
