import importlib.util,unittest,json,io
from contextlib import redirect_stdout
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('domains',Path(__file__).parents[1]/'scripts/security/reconcile-test-domains.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class DomainTest(unittest.TestCase):
 def test_exact_ownership_and_target(self):
  row={'hostname':'careers.example.com','verification_token':'a'*64}
  def dns(host,kind):return {'A':[module.TARGET],'AAAA':[],'TXT':['jobforged-verification='+'a'*64]}[kind]
  with patch.object(module,'records',side_effect=dns):self.assertTrue(module.valid_proof(row))
  with patch.object(module,'records',return_value=['203.0.113.1']):self.assertFalse(module.valid_proof(row))
  self.assertFalse(module.valid_proof({'hostname':'jobforged.com','verification_token':'x'}))
 def test_test_routes_keep_api_gateway(self):
  labels=module.labels_for(['careers.example.com'],'jbfd-test-ingress')
  self.assertIn('jbfd-test-security-api@docker',labels.values());self.assertNotIn('jbfd-live',str(labels))
 def test_candidate_requires_https_and_version_guard(self):
  candidate={'company_id':'61000000-0000-4000-8000-000000000011','hostname':'new.example.invalid','verification_token':'a'*64,'version':4,'operational_status':'active'}
  for ready in [False,True]:
   statements=[]
   def query(statement):
    statements.append(statement)
    if statement.startswith('select'):
     if 'from public.company_domains d' in statement:return '[]'
     if 'from app_private.company_domain_requests d' in statement:return json.dumps([candidate])
     return json.dumps([candidate['hostname']])
    return ''
   def command(args,input=None):
    if args[:2]==['docker','inspect']:
     if args[2]==module.NAME:return json.dumps([{'Config':{'Labels':module.labels_for([candidate['hostname']],'jbfd-test-ingress')}}])
     return json.dumps([{'Config':{'Labels':{'traefik.docker.network':'jbfd-test-ingress'},'Image':'ghcr.io/mlt-mateus/jobforged:'+'a'*40}}])
    raise AssertionError('Unexpected route/container mutation')
   with patch.object(module,'sql',side_effect=query),patch.object(module,'run',side_effect=command),patch.object(module.subprocess,'run',return_value=SimpleNamespace(returncode=0)),patch.object(module,'valid_proof',return_value=True),patch.object(module,'tls_ready',return_value=ready),redirect_stdout(io.StringIO()):module.reconcile()
   activation=[s for s in statements if s.startswith('do $$')]
   self.assertEqual(len(activation),int(ready))
   if ready:
    self.assertIn('version=4',activation[0]);self.assertIn('current_v,0)<>r.current_version',activation[0]);self.assertIn('for update',activation[0])
if __name__=='__main__':unittest.main()
