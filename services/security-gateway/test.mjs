import test from 'node:test';
import assert from 'node:assert/strict';
import { clientAddress,limitsFor,sessionClaimHints,policyPath,validStaticPng } from './policy.mjs';
import {crc32,deflateSync} from 'node:zlib';
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
test('session hints reject malformed input and confer no verification',()=>{
 assert.equal(sessionClaimHints('Bearer invalid'),null);
 assert.equal(sessionClaimHints('Basic value'),null);
 const claims={sub:'19000000-0000-4000-8000-000000000001',session_id:'19000000-0000-4000-8000-000000000002',aal:'aal2'};
 const token='header.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.UNVERIFIED';
 assert.deepEqual(sessionClaimHints('Bearer '+token),{person:claims.sub,session:claims.session_id,aal:'aal2'});
});
test('BFF actions use the same durable budgets, including trailing slashes',()=>{
 assert.equal(policyPath('/api/auth/sign-in/'),'/auth/v1/token');
 assert.equal(policyPath('/api/auth/candidate-sign-up'),'/auth/v1/signup');
 assert.equal(policyPath('/rest/v1/rpc/create_candidate_signup_intent'),'/auth/v1/signup');
 assert.equal(policyPath('/api/auth/recover'),'/auth/v1/recover');
 assert.equal(policyPath('/auth/v1/recover/'),'/auth/v1/recover');
});
test('direct Storage accepts bounded static PNG and rejects spoofed formats',()=>{
 const chunk=(type,data)=>{const t=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([length,t,data,crc]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
 const signature=Buffer.from([137,80,78,71,13,10,26,10]);
 const image=Buffer.concat([signature,chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,0,128,128,255]))),chunk('IEND',Buffer.alloc(0))]);
 assert.equal(validStaticPng(image),true);
 assert.equal(validStaticPng(Buffer.from('<svg/>')),false);
 assert.equal(validStaticPng(Buffer.concat([image,Buffer.from('<script/>')])),false);
 const broken=Buffer.from(image);broken[broken.length-1]^=1;assert.equal(validStaticPng(broken),false);
 assert.equal(validStaticPng(Buffer.concat([signature,chunk('IHDR',header),chunk('acTL',Buffer.alloc(8)),image.subarray(33)])),false);
 header.writeUInt32BE(8192);assert.equal(validStaticPng(Buffer.concat([signature,chunk('IHDR',header),image.subarray(33)])),false);
});
