#!/usr/bin/env python3
"""Root-only Test configuration. Stores a bucket-only JWT, never a service_role key.
No account, platform role, or Live configuration is created or modified.
"""
import base64
import hashlib
import hmac
import json
import os
import shlex
import time

def main():
    if os.geteuid() != 0:
        raise SystemExit('Execute como root na VPS de Test.')
    source = '/opt/jbfd/supabase/.env'
    target = '/opt/jbfd/test/.env'
    for path in (source, target):
        if os.stat(path).st_mode & 0o077:
            raise SystemExit('Configuração Test exige arquivos protegidos.')
    with open(source, encoding='utf-8') as handle:
        settings = dict(line.strip().split('=', 1) for line in handle if '=' in line and not line.lstrip().startswith('#'))
    secret = shlex.split(settings['JWT_SECRET'])[0].encode()
    now = int(time.time())
    claims = {'sub':'00000000-0000-4000-8000-000000000083','role':'authenticated','aud':'authenticated',
              'iss':'supabase','jbfd_branding_storage':'v1','iat':now,'exp':now+365*86400}
    encode = lambda value: base64.urlsafe_b64encode(value).rstrip(b'=')
    message = b'.'.join(encode(json.dumps(value,separators=(',',':')).encode()) for value in ({'alg':'HS256','typ':'JWT'},claims))
    token = (message+b'.'+encode(hmac.new(secret,message,hashlib.sha256).digest())).decode()
    with open(target, encoding='utf-8') as handle:
        lines = [line.rstrip('\n') for line in handle if not line.startswith('SUPABASE_BRANDING_STORAGE_TOKEN=')]
    temporary = target + '.branding.tmp'
    descriptor = os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(descriptor,'w',encoding='utf-8') as handle:
        handle.write('\n'.join(lines)+'\nSUPABASE_BRANDING_STORAGE_TOKEN='+token+'\n')
    os.replace(temporary,target)
    print('Credencial restrita ao bucket configurada em Test; validade de 365 dias. Nenhum segredo exibido.')

if __name__ == '__main__':
    main()
