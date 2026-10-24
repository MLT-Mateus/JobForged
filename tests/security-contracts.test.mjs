import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {termsOfServiceHtml} from '../app/legal-documents.ts';
import {passwordRules} from '../shared/password-policy.mjs';
import {administrativeFailure,adminVerificationMessage} from '../app/lib/administrative-feedback.ts';

test('signup receipt matches the actual terms served by the application',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/0026_verified_company_signup_intents.sql',import.meta.url),'utf8');
 const revision=sql.match(/'termsRevision','([a-f0-9]{64})'/)?.[1];
 assert.equal(revision,createHash('sha256').update(termsOfServiceHtml).digest('hex'));
});
test('password policy measures characters and UTF-8 bytes separately',()=>{
 assert.equal(passwordRules('Ab1!ééé').length,false);
 assert.equal(passwordRules('Ab1!éééé').length,true);
 assert.equal(passwordRules('Ab1!'+'é'.repeat(35)).maxBytes,false);
 assert.ok(Object.values(passwordRules('Abcdef9:')).every(Boolean));
});
test('administrative feedback preserves MFA and rate statuses without leaking provider detail',async()=>{
 const headers=new Headers({'Cache-Control':'no-store'});
 const factor=await administrativeFailure(Response.json({message:'recent MFA required'},{status:403}),'Fallback',headers);
 assert.equal(factor.status,403);assert.deepEqual(await factor.json(),{code:'ADMIN_MFA_REQUIRED',message:adminVerificationMessage});
 const denied=await administrativeFailure(Response.json({message:'private provider detail'},{status:403}),'Fallback',headers);
 assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{message:'Fallback'});
 const limited=await administrativeFailure(Response.json({message:'private provider detail'},{status:429}),'Fallback',headers);
 assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60');assert.equal((await limited.json()).code,'RATE_LIMITED');
 assert.equal((await administrativeFailure(null,'Unavailable',headers,503)).status,503);
});
