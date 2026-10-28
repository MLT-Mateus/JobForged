import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import test from 'node:test';

async function run(exitCode){
 const directory=await mkdtemp(join(tmpdir(),'jbfd-live-stdin-'));
 try{
  // Execute the real preflight prefix. No SSH, Docker, production files or keys.
  const source=await readFile('scripts/jbfd-deploy-live-root.sh','utf8');
  const prefix=source.split('# The Live gateway only sends secrets through stdin.')[0];
  const script=join(directory,'helper.sh');
  await writeFile(script,prefix+String.raw`
IFS= read -r first
IFS= read -r second
IFS= read -r third
[[ "$first" == fixture-api && "$second" == fixture-user && "$third" == fixture-smtp ]] || exit 83
echo envelope-preserved
`);
  const stubs={id:'#!/usr/bin/env bash\necho 0\n',python3:'#!/usr/bin/env bash\nif [[ "$1" == -c ]]; then printf "%s\\n" aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; exit 0; fi\ncat >/dev/null\nexit "${FIXTURE_GATE_EXIT:-0}"\n'};
  for(const [name,value]of Object.entries(stubs)){const path=join(directory,name);await writeFile(path,value);await chmod(path,0o700)}
  return await new Promise((resolve,reject)=>{
   const child=spawn('bash',[script,'configure-brevo'],{env:{...process.env,PATH:directory+':'+process.env.PATH,FIXTURE_GATE_EXIT:String(exitCode)}});
   let output='';child.stdout.on('data',chunk=>{output+=chunk});child.stderr.resume();child.on('error',reject);child.on('close',code=>resolve({code,output}));
   child.stdin.end('fixture-api\nfixture-user\nfixture-smtp\n');
  });
 }finally{await rm(directory,{recursive:true,force:true})}
}

test('readiness verifier cannot consume the SMTP input envelope',{skip:process.platform==='win32'},async()=>{
 const result=await run(0);assert.equal(result.code,0);assert.equal(result.output.trim(),'envelope-preserved');
});
test('failed readiness still stops configuration before reading credentials',{skip:process.platform==='win32'},async()=>{
 const result=await run(43);assert.equal(result.code,43);assert.equal(result.output,'');
});
