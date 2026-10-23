import test from 'node:test';
import assert from 'node:assert/strict';
import { clientAddress,limitsFor } from './policy.mjs';
const secret='a'.repeat(64);
test('untrusted callers cannot choose their IP scope',()=>{
 assert.equal(clientAddress('::ffff:10.0.0.2','1.2.3.4',new Set()),'10.0.0.2');
 assert.equal(clientAddress('10.0.0.2','9.9.9.9, 1.2.3.4',new Set(['10.0.0.2'])),'1.2.3.4');
 assert.equal(clientAddress('10.0.0.2','invalid',new Set(['10.0.0.2'])),'10.0.0.2');
});
test('account scope is normalized, opaque and persists across instances',()=>{
 const a=limitsFor('/auth/v1/recover','1.2.3.4',{email:' PERSON@EXAMPLE.INVALID '},secret);
 const b=limitsFor('/auth/v1/recover','2.3.4.5',{email:'person@example.invalid'},secret);
 assert.equal(a[1][0],'recovery-account');assert.equal(a[1][1],b[1][1]);assert.match(a[1][1],/^[a-f0-9]{64}$/);
 assert.notEqual(a[1][1],limitsFor('/auth/v1/recover','1.2.3.4',{email:'person@example.invalid'},'b'.repeat(64))[1][1]);
});
test('public auth and uploads receive endpoint-specific budgets',()=>{
 assert.deepEqual(limitsFor('/auth/v1/signup','ip',{},secret).map(x=>x[0]),['auth-ip','signup-ip']);
 assert.deepEqual(limitsFor('/storage/v1/object/company-branding/x','ip',null,secret).map(x=>x[0]),['api-ip','upload-ip']);
});
