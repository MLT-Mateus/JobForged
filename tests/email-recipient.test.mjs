import test from 'node:test';
import assert from 'node:assert/strict';
import {emailRecipient} from '../app/lib/email-recipient.ts';
import {sendCompanyInvitationEmail,sendCompanyWelcomeEmail} from '../app/lib/brevo-email.ts';
import {sendPlatformCommunicationEmail} from '../app/lib/platform-communication-email.ts';
test('single recipient policy rejects lists, headers and absent mailboxes',()=>{
 assert.equal(emailRecipient(' Person+rh@Example.invalid '),'person+rh@example.invalid');
 for(const value of [null,'','a@example.invalid,b@example.invalid','a@example.invalid;','Person <a@example.invalid>','a@example.invalid\r\nBcc: b@example.invalid','a..b@example.invalid','.a@example.invalid','a@.example.invalid'])assert.equal(emailRecipient(value),null);
});
test('all application senders use one exact recipient, reject invalid values before transport and never fall back',async()=>{
 const original=globalThis.fetch,old=process.env.BREVO_API_KEY,env=process.env.APP_ENV;const calls=[];
 process.env.BREVO_API_KEY='fixture';process.env.APP_ENV='test';
 globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://api.brevo.com/v3/smtp/email');calls.push(JSON.parse(init.body));return Response.json({messageId:'simulated'});};
 try{
  const senders=[email=>sendCompanyInvitationEmail(email,'Fixture','fixture-token'),email=>sendCompanyWelcomeEmail({email,responsible:'Fixture',company:'Fixture'}),email=>sendPlatformCommunicationEmail({email,title:'Fixture',message:'Fixture',link:''})];
  for(const [index,send] of senders.entries()){
   const expected=`person${index}@example.invalid`;assert.equal(await send(` ${expected.toUpperCase()} `),'sent');
   const payload=calls.at(-1);assert.deepEqual(payload.to,[{email:expected}]);assert.equal(payload.cc,undefined);assert.equal(payload.bcc,undefined);
   const count=calls.length;assert.equal(await send('wrong@example.invalid;'),'failed');assert.equal(calls.length,count);
  }
 }finally{globalThis.fetch=original;if(old===undefined)delete process.env.BREVO_API_KEY;else process.env.BREVO_API_KEY=old;if(env===undefined)delete process.env.APP_ENV;else process.env.APP_ENV=env;}
});
