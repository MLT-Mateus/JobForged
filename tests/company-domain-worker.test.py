import importlib.util,unittest
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
if __name__=='__main__':unittest.main()
