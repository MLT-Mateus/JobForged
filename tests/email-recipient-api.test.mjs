import test from 'node:test';
import assert from 'node:assert/strict';

test('Test recipient routing: auth, signup, invitations, interview and communications with zero external delivery',async()=>{
 const original=globalThis.fetch,old={...process.env};
 Object.assign(process.env,{APP_ENV:'test',SUPABASE_INTERNAL_URL:'https://recipients.fixture.invalid',SUPABASE_ANON_KEY:'fixture',BREVO_API_KEY:'fixture'});
 const uid='58000000-0000-4000-8000-000000000001',cid='58000000-0000-4000-8000-000000000011',id='58000000-0000-4000-8000-000000000031';
 let platform=false,claims=0;const mail=[],auth=[],database=[];
 globalThis.fetch=async(input,init={})=>{
  const url=new URL(String(input)),body=init.body?JSON.parse(init.body):null;
  if(url.origin==='https://api.brevo.com'){assert.equal(url.pathname,'/v3/smtp/email');mail.push(body);return Response.json({messageId:'simulated'});}
  assert.equal(url.origin,'https://recipients.fixture.invalid','No network request may escape this test');
  const path=url.pathname;
  if(path.startsWith('/auth/v1/')){
   auth.push({path,body});
   if(path.endsWith('/user'))return Response.json({id:uid,email:'actor@example.invalid',email_confirmed_at:'2026-11-01'});
   if(path.endsWith('/token'))return Response.json({access_token:'fixture-reauth',user:{id:uid}});
   if(path.endsWith('/signup'))return Response.json({access_token:'fixture',refresh_token:'fixture',user:{id:uid,email:body.email}});
   if(['/auth/v1/recover','/auth/v1/resend','/auth/v1/logout'].includes(path))return Response.json({});
   throw Error('Unexpected auth operation');
  }
  database.push({path,body});
  if(path.endsWith('/change_my_login_email'))return Response.json({email:body.new_email});
  if(path.endsWith('/is_platform_admin'))return Response.json(platform);
  if(path.endsWith('/session_context_v1'))return Response.json({company_id:cid,role:'owner',companies:{id:cid,name:'Fixture'}});
  if(path.endsWith('/create_company_signup_intent')||path.endsWith('/create_candidate_signup_intent'))return Response.json('a'.repeat(64));
  if(path.endsWith('/company_invitation_matches'))return Response.json(body.invite_email==='invitee@example.invalid');
  if(path.endsWith('/create_company_invitation'))return Response.json([{invitation_id:id,invitation_token:'fixture-token'}]);
  if(path.endsWith('/platform_manage'))return Response.json({id,email:'saved-invitation@example.invalid',token:'fixture-token',company_name:'Fixture'});
  if(path.endsWith('/company_operations_v1'))return Response.json({email:'linked-candidate@example.invalid',name:'Candidate',company:'Fixture',slug:'fixture',event:{title:'Interview',starts_at:'2026-11-16T13:00:00Z',ends_at:'2026-11-16T14:00:00Z',meeting_url:'https://meet.google.com/'}});
  if(path.endsWith('/claim_communication_email'))return Response.json(claims++===0?{id,attempt:'fixture',email:'selected-current@example.invalid',title:'Fixture',message:'Fixture',link:''}:{});
  if(path.endsWith('/finish_communication_email'))return Response.json(null);
  throw Error('Unexpected database operation '+path);
 };
 try{
  const {default:worker}=await import('../dist/server/index.js');
  const send=(path,body)=>worker.fetch(new Request('http://localhost'+path,{method:'POST',headers:{host:'localhost',origin:'http://localhost',cookie:'jf_auth_access=fixture','content-type':'application/json'},body:JSON.stringify(body)}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  const ok=async(path,body)=>{const r=await send(path,body);assert.equal(r.status,200,await r.text());};
  for(const path of ['/api/auth/recover','/api/auth/confirmation/resend']){await ok(path,{email:' REQUESTED@example.invalid ',to:'wrong@example.invalid'});assert.equal(auth.at(-1).body.email,'requested@example.invalid');}
  const count=auth.length;assert.equal((await send('/api/auth/recover',{email:'a@example.invalid;'})).status,400);assert.equal(auth.length,count);
  await ok('/api/auth/sign-up',{responsible:'Signup Fixture',company:'Fixture Company',cnpj:'11222333000181',phone:'11999999999',email:'signup@example.invalid',password:'Fixture9!Example',confirmPassword:'Fixture9!Example',acceptedTerms:true,to:'wrong@example.invalid'});
  assert.equal(auth.find(x=>x.path.endsWith('/signup')).body.email,'signup@example.invalid');assert.deepEqual(mail.at(-1).to,[{email:'signup@example.invalid'}]);
  await ok('/api/auth/candidate-sign-up',{fullName:'Candidate Fixture',email:'candidate-signup@example.invalid',password:'Fixture9!Example',confirmPassword:'Fixture9!Example',acceptedTerms:true,slug:'fixture'});assert.equal(auth.at(-1).body.email,'candidate-signup@example.invalid');
  await ok('/api/auth/invitee-sign-up',{token:'a'.repeat(64),email:'invitee@example.invalid',password:'Fixture9!Example'});assert.equal(auth.at(-1).body.email,'invitee@example.invalid');
  await ok('/api/company/members',{email:'invited@example.invalid',to:'wrong@example.invalid'});assert.deepEqual(mail.at(-1).to,[{email:'invited@example.invalid'}]);
  await ok('/api/company/operations/invitation',{companyId:cid,id,email:'wrong@example.invalid',to:'wrong@example.invalid'});assert.deepEqual(mail.at(-1).to,[{email:'linked-candidate@example.invalid'}]);
  const sent=mail.length;assert.equal((await send('/api/company/operations/invitation',{companyId:'foreign',id})).status,409);assert.equal(mail.length,sent);
  await ok('/api/account/credentials',{operation:'email',email:'new@example.invalid',confirmation:'new@example.invalid',currentPassword:'Fixture9!Example',userId:'foreign'});
  assert.deepEqual(database.findLast(x=>x.path.endsWith('/change_my_login_email')).body,{new_email:'new@example.invalid',current_password:'Fixture9!Example'});
  assert.equal(mail.length,sent,'Direct email change must not send a message');
  assert.equal(auth.filter(x=>x.path.endsWith('/user')&&x.body).length,0,'Direct change must not start Auth confirmation mail');
  platform=true;
  for(const operation of ['invitation.create','invitation.resend']){await ok('/api/backoffice',{operation,company:cid,target:id,values:{email:'wrong@example.invalid',role:'admin'},reason:'Fixture audit'});assert.deepEqual(mail.at(-1).to,[{email:'saved-invitation@example.invalid'}]);}
  await ok('/api/backoffice/communications/email',{id,email:'wrong@example.invalid'});assert.deepEqual(mail.at(-1).to,[{email:'selected-current@example.invalid'}]);
  for(const payload of mail){assert.equal(payload.to.length,1);assert.equal(payload.cc,undefined);assert.equal(payload.bcc,undefined);assert.match(payload.to[0].email,/@example\.invalid$/);}
 }finally{globalThis.fetch=original;for(const key of ['APP_ENV','SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY','BREVO_API_KEY']){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}}
});
