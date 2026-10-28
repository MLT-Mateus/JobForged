"""Canonical deployment identities. Never infer an environment from credentials."""
from dataclasses import dataclass
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import copy
import ipaddress

@dataclass(frozen=True)
class Environment:
    name: str

    def __post_init__(self):
        if self.name not in ('test', 'live'):
            raise ValueError('Explicit test or live environment required')

    @property
    def prefix(self): return 'supabase' if self.name == 'test' else 'supabase-live'
    @property
    def database(self): return self.prefix + '-db'
    @property
    def auth(self): return self.prefix + '-auth'
    @property
    def envoy(self): return self.prefix + '-envoy'
    @property
    def storage(self): return self.prefix + '-storage'
    @property
    def app(self): return 'jbfd-' + self.name + '-app-1'
    @property
    def gateway(self): return 'jbfd-' + self.name + '-security-gateway'
    @property
    def ingress(self): return 'jbfd-' + self.name + '-ingress'
    @property
    def provider_network(self): return 'supabase_default' if self.name == 'test' else 'supabase-live_default'
    @property
    def stack(self): return Path('/opt/jbfd/' + self.prefix)
    @property
    def app_env(self): return Path('/opt/jbfd/' + self.name + '/.env')
    @property
    def hostname(self): return 'test.jobforged.com' if self.name == 'test' else 'jobforged.com'
    @property
    def override(self): return 'docker-compose.override.yml' if self.name == 'test' else 'docker-compose.live.override.yml'
    @property
    def peer(self): return Environment('live' if self.name == 'test' else 'test')

def private_file(path):
    path = Path(path)
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077 or info.st_uid != 0:
        raise ValueError('Root-owned private regular evidence file required')
    return path

def verified_backup(environment, folder, now=None):
    """Same backup contract in both environments; never accept the peer's receipt."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    folder = Path(folder)
    if folder.parent != Path('/opt/jbfd/backups/security') or not re.fullmatch(environment.name + r'-\d{8}T\d{6}Z', folder.name):
        raise ValueError('Backup belongs to a different environment or root')
    stamp = datetime.datetime.strptime(folder.name, environment.name + '-%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc)
    if not datetime.timedelta(0) <= now - stamp <= datetime.timedelta(hours=2):
        raise ValueError('Recent backup required')
    recovery = private_file(folder / 'recovery.json')
    evidence = json.loads(recovery.read_text())
    receipt = json.loads(private_file(folder / 'offsite-receipt.json').read_text())
    if evidence.get('environment') != environment.name or evidence.get('counts_match') is not True or evidence.get('network') != 'none' or evidence.get('ports') != []:
        raise ValueError('Isolated restoration evidence required')
    if receipt.get('backup') != folder.name or receipt.get('recovery_sha256') != hashlib.sha256(recovery.read_bytes()).hexdigest() or not re.fullmatch('[a-f0-9]{64}', receipt.get('encrypted_sha256', '')):
        raise ValueError('Encrypted offsite receipt does not match restoration')
    expected = {'postgres.sql.gz', 'storage.tar.gz', 'objects.private.json', 'infrastructure-audit.jsonl'}
    if set(evidence.get('checksums', {})) != expected:
        raise ValueError('Complete database and file evidence required')
    for name, digest in evidence['checksums'].items():
        with private_file(folder / name).open('rb') as stream:
            if hashlib.file_digest(stream, 'sha256').hexdigest() != digest:
                raise ValueError('Backup integrity failed')
    return folder

def authorize_live(environment, revision, authorization, require_backup=True):
    """Operational approval guard, not a substitute for GitHub environment approval.

    Root supplies this record only AFTER the human approves the exact release.
    Test deploy never creates it and never calls a Live mutator.
    """
    if environment.name == 'test': return
    if not authorization or not re.fullmatch('[a-f0-9]{40}', revision or ''):
        raise ValueError('Live requires an explicit release-specific authorization')
    record = json.loads(private_file(authorization).read_text())
    now = datetime.datetime.now(datetime.timezone.utc)
    issued = datetime.datetime.fromisoformat(record['issued_at'])
    expires = datetime.datetime.fromisoformat(record['expires_at'])
    if record.get('environment') != 'live' or record.get('revision') != revision or record.get('approved') is not True or not isinstance(record.get('approval_reference'), str) or len(record['approval_reference']) < 10:
        raise ValueError('Live approval identity mismatch')
    if not issued <= now < expires or expires - issued > datetime.timedelta(hours=2):
        raise ValueError('Live approval expired or invalid')
    if require_backup: verified_backup(environment, record['backup'])

def auth_policy(password_policy):
    return {
        'GOTRUE_JWT_EXP':'900', 'GOTRUE_PASSWORD_MIN_LENGTH':str(password_policy['minCharacters']),
        'GOTRUE_PASSWORD_REQUIRED_CHARACTERS':':'.join(password_policy[g].replace(':', '\\:') for g in ('lower','upper','digits','symbols')),
        'GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED':'true', 'GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL':'10',
        'GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION':'true',
        'GOTRUE_SESSIONS_TIMEBOX':'720h', 'GOTRUE_SESSIONS_INACTIVITY_TIMEOUT':'24h',
        'GOTRUE_MFA_TOTP_ENROLL_ENABLED':'true', 'GOTRUE_MFA_TOTP_VERIFY_ENABLED':'true',
    }

def authorize_maintenance(environment, scope, revision=None):
    """Standing, narrowly scoped approval installed by an authorized Live deploy.

    This record cannot authorize migrations, accounts, MFA changes or deployment.
    """
    if environment.name=='test':return
    path=private_file('/opt/jbfd/security-work/live-maintenance-approved.json')
    value=json.loads(path.read_text())
    if value.get('environment')!='live' or scope not in value.get('scopes',[]) or not re.fullmatch('[a-f0-9]{40}',value.get('revision','')) or (revision and value['revision']!=revision):
        raise ValueError('Environment-specific maintenance approval required')
    if value.get('scopes')!=['consistent-backup','bounded-orphan-maintenance'] or not value.get('approval_reference'):
        raise ValueError('Unexpected maintenance capability scope')

def gateway_values(environment, revision):
    if not re.fullmatch('[a-f0-9]{40}', revision): raise ValueError('Immutable image revision required')
    root = Path('/opt/jbfd/security-gateway-' + environment.name)
    return {
        'APP_ENV':environment.name, 'APP_ORIGIN':environment.hostname,
        'JBFD_SECURITY_GATEWAY_IMAGE':'ghcr.io/mlt-mateus/jobforged-security-gateway:' + revision,
        'JBFD_SECURITY_GATEWAY_ENV_FILE':str(root / 'gateway.env'),
        'JBFD_GATEWAY_CONTAINER':environment.gateway, 'JBFD_PROVIDER_NETWORK':environment.provider_network,
        'JBFD_INGRESS_NETWORK':environment.ingress, 'JBFD_AUTH_UPSTREAM':'http://' + environment.envoy + ':8000',
        'JBFD_BFF_CONTAINER':environment.app,
    }

def private_studio_override(document, environment, gateway):
    """Preserve the existing TLS, host and BasicAuth; only add a source allowlist."""
    address=ipaddress.ip_address(gateway)
    if address.version!=4 or not address.is_private: raise ValueError('Private local proxy gateway required')
    result=copy.deepcopy(document)
    labels=result['services']['studio']['labels']
    if isinstance(labels,list):labels=dict(value.split('=',1) for value in labels)
    chains=[key for key in labels if key.startswith('traefik.http.routers.') and key.endswith('.middlewares')]
    if len(chains)!=1:raise ValueError('Unique existing Studio middleware chain required')
    chain=chains[0];private='jbfd-'+environment.name+'-studio-private'
    existing=[value for value in labels[chain].split(',') if value!=private]
    if not any(labels.get('traefik.http.middlewares.'+name+'.basicauth.users') or labels.get('traefik.http.middlewares.'+name+'.basicauth.usersfile') for name in existing):
        raise ValueError('Preserved BasicAuth middleware required')
    labels[chain]=','.join([private,*existing])
    labels['traefik.http.middlewares.'+private+'.ipallowlist.sourcerange']='127.0.0.1/32,::1/128,'+gateway+'/32'
    result['services']['studio']['labels']=labels
    return result
