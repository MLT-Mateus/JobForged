import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {retainAssets,retainedAsset,validAssetName} from '../shared/retained-assets.mjs';
import {clientFailureKind} from '../shared/client-error.mjs';
const file='AppearancePreviewPanel-AbCd1234.js';
test('retains immutable public chunks across deployments, retries safely and bounds retention',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'jbfd-assets-'));try{
 const source=path.join(root,'source'),cache=path.join(root,'cache');await mkdir(source);
 await writeFile(path.join(source,file),'export const preview=true;');await writeFile(path.join(source,'secret.env'),'private');await writeFile(path.join(source,'debug-AbCd1234.js.map'),'private');
 const revision=n=>String(n).padStart(40,'0');
 await retainAssets(source,cache,revision(1));await retainAssets(source,cache,revision(1));
 assert.equal(new TextDecoder().decode((await retainedAsset(cache,file)).bytes),'export const preview=true;');
 assert.deepEqual(await readdir(path.join(cache,revision(1))),['.complete',file]);
 for(let n=2;n<=6;n++)await retainAssets(source,cache,revision(n));
 assert.equal((await readdir(cache)).length,4);assert.ok(!(await readdir(cache)).includes(revision(1)));
 await writeFile(path.join(source,file),'different');await assert.rejects(retainAssets(source,cache,revision(6)),/Immutable/);
 assert.equal(await readFile(path.join(cache,revision(6),file),'utf8'),'export const preview=true;');
 for(const name of ['../secret.env','x.js','debug-AbCd1234.js.map','%2e%2e.env','x-AbCd1234.html','a/b-AbCd1234.js']){assert.equal(validAssetName(name),false);assert.equal(await retainedAsset(cache,name),null)}
 assert.equal(await retainedAsset(undefined,file),null);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('error categories expose no raw error or credential information',()=>{
 for(const message of ['Failed to fetch dynamically imported module: https://example.invalid/private?token=secret','Loading chunk 19 failed','Importing a module script failed'])assert.equal(clientFailureKind(new Error(message)),'outdated-assets');
 assert.equal(clientFailureKind(new Error('private form data')),'render-failed');assert.equal(clientFailureKind(null),'render-failed');
});
