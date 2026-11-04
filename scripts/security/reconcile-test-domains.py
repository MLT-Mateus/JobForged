"""Test-only DNS/TLS reconciler. No provider purchase, shared Traefik restart or Docker socket in the app.
Run as an operator every five minutes after the migrations. No proof tokens in logs.
"""
import argparse,hashlib,http.client,json,re,socket,ssl,subprocess
from pathlib import Path
NAME='jbfd-test-domain-routes'
TARGET='187.77.229.27'
HOST=re.compile(r'([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}\Z')
def run(args,input=None):
 r=subprocess.run(args,input=input,text=True,capture_output=True,timeout=30)
 if r.returncode:raise RuntimeError('Operator command failed: '+args[0])
 return r.stdout.strip()
def sql(statement):return run(['docker','exec','-i','supabase-db','psql','-XqAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],statement)
def records(host,kind):
 text=run(['dig','@1.1.1.1','+time=3','+tries=1','+short',kind,host])
 return [x.strip().replace('" "','').strip('"') for x in text.splitlines()]
def valid_proof(row):
 host=row['hostname']
 if not HOST.fullmatch(host) or len(host)>253 or host=='jobforged.com' or host.endswith('.jobforged.com'):return False
 try:
  ips=[x for x in records(host,'A') if re.fullmatch(r'[0-9.]+',x)]
  ipv6=[x for x in records(host,'AAAA') if ':' in x]
  return ips==[TARGET] and not ipv6 and 'jobforged-verification='+row['verification_token'] in records('_jobforged.'+host,'TXT')
 except (RuntimeError,subprocess.TimeoutExpired):return False
class FixedHTTPS(http.client.HTTPSConnection):
 def connect(self):
  self.sock=ssl.create_default_context().wrap_socket(socket.create_connection((TARGET,443),timeout=8),server_hostname=self.host)
def tls_ready(host):
 try:
  c=FixedHTTPS(host,timeout=8);c.request('GET','/api/domain-ready',headers={'Host':host});r=c.getresponse();answer=r.status==200 and json.loads(r.read(1024)).get('ready') is True;c.close();return answer
 except (OSError,ValueError,http.client.HTTPException):return False
def labels_for(hosts,network):
 labels={'traefik.enable':'true','traefik.docker.network':network,'jbfd.domain.environment':'test','jbfd.domain.digest':hashlib.sha256('\n'.join(hosts).encode()).hexdigest()}
 for host in hosts:
  identity='jbfd-test-domain-'+hashlib.sha256(host.encode()).hexdigest()[:16]
  base='traefik.http.routers.'+identity
  labels.update({base+'.rule':'Host(`'+host+'`)',base+'.entrypoints':'websecure',base+'.tls':'true',base+'.tls.certresolver':'letsencrypt',base+'.service':'jbfd-test@docker',base+'-http.rule':'Host(`'+host+'`)',base+'-http.entrypoints':'web',base+'-http.middlewares':'jbfd-test-https@docker',base+'-http.service':'jbfd-test@docker'})
  labels.update({base+'-api.rule':'Host(`'+host+'`) && PathPrefix(`/api/`)',base+'-api.priority':'1000',base+'-api.entrypoints':'websecure',base+'-api.tls':'true',base+'-api.tls.certresolver':'letsencrypt',base+'-api.service':'jbfd-test-security-api@docker'})
 # Dummy service gives Docker provider an explicit port; routers always use the real Test service.
 labels['traefik.http.services.jbfd-test-domain-dummy.loadbalancer.server.port']='3000'
 return labels
def reconcile():
 rows=json.loads(sql("select coalesce(json_agg(x),'[]') from(select d.*,c.operational_status from public.company_domains d join public.companies c on c.id=d.company_id where d.status<>'disabled' order by d.hostname limit 101)x;"))
 if len(rows)>100:raise RuntimeError('Domain platform quota exceeded')
 verified=[]
 for row in rows:
  good=row['operational_status']=='active' and valid_proof(row)
  # IDs originate in PostgreSQL UUID columns, not command input.
  cid=row['company_id'];guard=" where company_id='"+cid+"' and version="+str(int(row['version']))+" and status<>'disabled';"
  if good:
   sql("update public.company_domains set status=case when status='active' then 'active' else 'verified' end,verified_at=coalesce(verified_at,now()),checked_at=now() "+guard)
  else:sql("update public.company_domains set status=case when status='pending' and requested_at<now()-interval '7 days' then 'disabled' else 'pending' end,checked_at=now(),verified_at=null "+guard)
 verified=json.loads(sql("select coalesce(json_agg(hostname order by hostname),'[]') from public.company_domains where status in ('verified','active') and checked_at>now()-interval '1 minute';"))
 old=json.loads(run(['docker','inspect',NAME]))[0] if subprocess.run(['docker','inspect',NAME],capture_output=True).returncode==0 else None
 if old and old['Config']['Labels'].get('jbfd.domain.environment')!='test':raise RuntimeError('Unexpected container ownership')
 if verified:
  app=json.loads(run(['docker','inspect','jbfd-test-app-1']))[0]
  network=app['Config']['Labels']['traefik.docker.network']
  if network!='jbfd-test-ingress':raise RuntimeError('Unexpected Test ingress network')
  image=app['Config']['Image']
  if not re.fullmatch(r'ghcr.io/mlt-mateus/jobforged:[a-f0-9]{40}',image):raise RuntimeError('Unverified app image')
  labels=labels_for(verified,network)
  if not old or old['Config']['Labels'].get('jbfd.domain.digest')!=labels['jbfd.domain.digest']:
   if old:run(['docker','rm','-f',NAME])
   args=['docker','run','-d','--name',NAME,'--no-healthcheck','--network',network,'--restart','unless-stopped','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','64m','--cpus','0.1']
   for key,value in labels.items():args+=['--label',key+'='+value]
   run(args+['--entrypoint','node',image,'-e','setInterval(()=>{},3600000)'])
 elif old:run(['docker','rm','-f',NAME])
 ready=0
 for host in verified:
  if tls_ready(host):
   # host is validated above and SQL-quoted defensively.
   sql("update public.company_domains set status='active' where hostname='"+host.replace("'","''")+"' and status in ('verified','active');");ready+=1
 print(json.dumps({'environment':'test','registered':len(rows),'dnsVerified':len(verified),'httpsReady':ready}))
if __name__=='__main__':
 import fcntl
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 if not args.apply:raise SystemExit('Explicit --apply required; Test only.')
 with open('/run/lock/jbfd-test-domains.lock','w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);reconcile()
