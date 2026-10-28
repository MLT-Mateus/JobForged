"""Actual Compose merge must never reopen inherited database ports."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts/security'))
import compose_yaml

class ComposeTests(unittest.TestCase):
    def test_tagged_ports_replace_inherited_public_binding(self):
        base='services:\n  pooler:\n    image: fixture.invalid/database:fixed\n    ports: ["5432:5432", "6543:6543"]\n'
        override='services:\n  pooler:\n    ports: !override ["127.0.0.1:5432:5432"]\n'
        document=compose_yaml.load(override)
        document['services']['pooler']['labels']={'jbfd.environment':'live'}
        serialized=compose_yaml.dump(document)
        self.assertIn('!override',serialized)
        self.assertEqual(serialized,compose_yaml.dump(compose_yaml.load(serialized)))
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'base.yml').write_text(base);(root/'override.yml').write_text(serialized)
            import json
            result=subprocess.run(['docker','compose','-f',str(root/'base.yml'),'-f',str(root/'override.yml'),'config','--format','json'],capture_output=True,text=True,check=True)
            ports=json.loads(result.stdout)['services']['pooler']['ports']
            self.assertEqual(len(ports),1);self.assertEqual(ports[0]['host_ip'],'127.0.0.1')

    def test_unsupported_tags_fail_closed(self):
        with self.assertRaises(Exception):compose_yaml.load('ports: !unexpected []')
        with self.assertRaises(Exception):compose_yaml.load('ports: !override unsafe')

if __name__=='__main__':unittest.main()
