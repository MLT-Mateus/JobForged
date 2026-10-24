import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {termsOfServiceHtml} from '../app/legal-documents.ts';
import {passwordRules} from '../shared/password-policy.mjs';

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
