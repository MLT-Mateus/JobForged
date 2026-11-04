"use client";

import { useEffect, useMemo, useState } from 'react';
import { ActionButton, AppToast, EditorSection, StatusBadge, TextField } from '../ui';
import {apiResponse} from '@/app/lib/api-response';
import { validCompanyHostname, type CompanyDomain } from '@/app/lib/company-domain';

type DomainKind = 'root' | 'subdomain' | '';
type CheckResult = {
  checkedAt: string;
  ownershipVerified: boolean;
  addressVerified: boolean;
  ipv6Conflict: boolean;
  ready: boolean;
  ipv4: string[];
  ipv6: string[];
  cnames: string[];
  expectedIpv4: string;
};
type DomainResponse = CompanyDomain & { message?: string; diagnosis?: CheckResult; domain?: CompanyDomain };

function cleanHostname(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

function relativeName(name: string, zone: string) {
  if (!zone) return name;
  if (name === zone) return '@';
  return name.endsWith(`.${zone}`) ? name.slice(0, -(zone.length + 1)) : null;
}

export function CompanyDomainEditor({ editable }: { editable: boolean }) {
  const [data, setData] = useState<CompanyDomain>({ status: 'none', version: 0 });
  const [hostname, setHostname] = useState('');
  const [zone, setZone] = useState('');
  const [kind, setKind] = useState<DomainKind>('');
  const [busy, setBusy] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [diagnosis, setDiagnosis] = useState<CheckResult | null>(null);
  const [copied, setCopied] = useState('');

  async function request(body?: object) {
    const response = await fetch('/api/company/domain', {
      cache: 'no-store',
      credentials: 'same-origin',
      ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    const result = await apiResponse<DomainResponse>(response,'Não foi possível consultar o domínio.');
    return result;
  }

  async function refresh() {
    setBusy(true);
    setError('');
    try {
      const result = await request();
      setData(result);
      if (result.hostname) setHostname(result.hostname);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o domínio.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/company/domain', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then(async response => {
        const result = await apiResponse<DomainResponse>(response,'Não foi possível carregar o domínio.');
        if (controller.signal.aborted) return;
        setData(result);
        setHostname(result.hostname || '');
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o domínio.');
      })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);

  const safeHost = cleanHostname(hostname);
  const safeZone = cleanHostname(zone);
  const proofRecord = data.record || (data.hostname ? `_jobforged.${data.hostname}` : '');
  const rootRelative = safeHost === safeZone;
  const zoneMatches = kind === 'root'
    ? rootRelative
    : kind === 'subdomain' && safeHost.endsWith(`.${safeZone}`) && safeHost !== safeZone;
  const proofRelative = relativeName(proofRecord, safeZone);
  const routeRelative = relativeName(safeHost, safeZone);
  const linkedAddress = data.hostname === safeHost && !['none','disabled'].includes(data.status);
  const hostnameError = safeHost && !validCompanyHostname(safeHost) ? 'Use apenas o domínio ou subdomínio, sem https://, espaços ou caminhos.' : undefined;
  const zoneError = kind && safeZone && !zoneMatches ? (kind === 'root' ? 'Use o mesmo domínio informado acima.' : `Use a zona principal do provedor: o endereço deve terminar em .${safeZone}.`) : undefined;
  const canRegister = editable && !busy && kind !== '' && validCompanyHostname(safeHost)
    && validCompanyHostname(safeZone) && zoneMatches && (data.hostname !== safeHost || data.status === 'disabled');

  const records = useMemo(() => {
    if (!safeHost || !safeZone || !zoneMatches || !kind || !linkedAddress) return [];
    return [
      { type: 'TXT', name: proofRelative || proofRecord, value: data.proof || 'Aparece após vincular o domínio', purpose: 'Confirma que o domínio pertence à sua empresa.' },
      kind === 'root'
        ? { type: 'A', name: '@', value: '187.77.229.27', purpose: 'Aponta o domínio principal para a JobForged.' }
        : { type: 'CNAME', name: routeRelative || safeHost, value: data.targetHost || 'test.jobforged.com', purpose: 'Aponta o subdomínio para a JobForged.' },
    ];
  }, [data.proof, data.targetHost, kind, linkedAddress, proofRecord, proofRelative, routeRelative, safeHost, safeZone, zoneMatches]);

  async function perform(body: object, mode: 'save' | 'check' | 'disconnect') {
    setBusy(true);
    setChecking(mode === 'check');
    setError('');
    if (mode !== 'check') setDiagnosis(null);
    try {
      const result = await request(body);
      if (mode === 'check') {
        if (result.domain) setData(result.domain);
        setDiagnosis(result.diagnosis || null);
      } else {
        setData(result);
        setHostname(result.hostname || '');
        setDiagnosis(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
      setChecking(false);
    }
  }

  async function copy(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Não foi possível copiar. Selecione o valor e copie manualmente.');
    }
  }

  function setDomainKind(next: DomainKind) {
    setKind(next);
    setDiagnosis(null);
    const host = cleanHostname(hostname);
    if (next === 'root') setZone(host);
    else if (host.includes('.')) setZone(host.split('.').slice(1).join('.'));
  }

  const statusText: Record<CompanyDomain['status'], string> = {
    none: 'Ainda não configurado', pending: 'Aguardando DNS', verified: 'Preparando HTTPS',
    active: 'Ativo', disabled: 'Desconectado',
  };

  return (
    <EditorSection title="Domínio próprio" description="Use o endereço da sua empresa. Primeiro vincule-o aqui; depois crie os registros indicados no provedor do domínio.">
      <TextField
        label="Endereço que será usado"
        placeholder="Digite o domínio..."
        maxLength={253}
        error={hostnameError}
        value={hostname}
        onChange={event => {
          const value = cleanHostname(event.target.value);
          setHostname(value);
          setDiagnosis(null);
          if (kind === 'root') setZone(value);
          if (kind === 'subdomain' && value.includes('.')) setZone(value.split('.').slice(1).join('.'));
        }}
        helpText="Exemplo: suaempresa.com.br ou vagas.suaempresa.com.br. Não inclua https:// nem caminhos."
        disabled={!editable || busy}
      />

      <fieldset className="appearance-domain-kind">
        <legend>Qual endereço você vai conectar?</legend>
        <label><input type="radio" name="company-domain-kind" checked={kind === 'root'} onChange={() => setDomainKind('root')} disabled={!editable||busy} /> Domínio principal (ex.: suaempresa.com.br)</label>
        <label><input type="radio" name="company-domain-kind" checked={kind === 'subdomain'} onChange={() => setDomainKind('subdomain')} disabled={!editable||busy} /> Subdomínio (ex.: vagas.suaempresa.com.br)</label>
        <small>Escolha o tipo antes de vincular. Subdomínio é recomendado para manter o site principal.</small>
        {kind === 'root' && <small className="appearance-domain-warning">A raiz aponta o site principal para a JobForged. Se quer preservar seu site atual, escolha um subdomínio.</small>}
      </fieldset>

      {kind && <TextField label="Domínio aberto no provedor DNS" placeholder="Digite o domínio..." maxLength={253} value={zone} error={zoneError} onChange={event=>{setZone(cleanHostname(event.target.value));setDiagnosis(null)}} helpText={kind==='root'?'Use o mesmo endereço acima.':`Para ${safeHost||'vagas.suaempresa.com.br'}, informe o domínio principal (ex.: suaempresa.com.br).`} disabled={!editable||busy}/>}
      {safeHost && !kind && <p className="appearance-domain-note">Escolha domínio principal ou subdomínio para continuar.</p>}

      <div className="appearance-domain-status" aria-live="polite">
        <span>Status do vínculo</span>
        <StatusBadge tone={data.status === 'active' ? 'positive' : 'info'}>{statusText[data.status]}</StatusBadge>
      </div>

      <p className="appearance-domain-next" role="status">{!linkedAddress?'1. Confira o endereço e o tipo. Depois selecione Vincular endereço.':data.status==='active'?'Endereço ativo. Você já pode abrir a página da empresa.':data.status==='verified'?'DNS confirmado. O HTTPS será preparado automaticamente; consulte o status em até 5 minutos.':'2. Cadastre os dois registros abaixo no provedor. Depois selecione Testar DNS agora.'}</p>
      <div className="appearance-domain-actions">
        <ActionButton disabled={!canRegister} onClick={() => void perform({ operation: 'register', hostname: safeHost, version: data.version }, 'save')}>
          {linkedAddress?'Endereço vinculado':'Vincular endereço'}
        </ActionButton>
        <ActionButton variant="secondary" disabled={!editable || busy || !linkedAddress} onClick={() => void perform({ operation: 'check' }, 'check')}>
          {checking ? 'Testando DNS…' : 'Testar DNS agora'}
        </ActionButton>
        <ActionButton variant="quiet" disabled={busy} onClick={() => void refresh()}>
          Consultar status
        </ActionButton>
        {linkedAddress&&data.status==='active'&&<a className="jf-action jf-action--secondary" href={`https://${data.hostname}`} target="_blank" rel="noopener noreferrer">Abrir página da empresa</a>}
      </div>

      {linkedAddress && (
        <div className="appearance-domain-instructions">
          <div className="appearance-domain-steps">
            <strong>Configure em 3 passos</strong>
            <ol>
              <li>Vincule o endereço nesta tela.</li>
              <li>Na Hostinger, abra <b>Domínios</b>, selecione a zona e entre em <b>DNS / Nameservers</b>.</li>
              <li>Crie os 2 registros abaixo. Depois volte e selecione <b>Testar DNS agora</b>.</li>
            </ol>
          </div>

          <div className="appearance-domain-records" aria-label="Registros DNS necessários">
            {records.map((record,index)=><section className="appearance-domain-record" key={record.type} aria-label={`Registro ${record.type}`}>
              <header><strong>{index+1}. {record.type==='TXT'?'Confirmar propriedade':'Apontar endereço'}</strong><StatusBadge tone="info">{record.type}</StatusBadge></header>
              <p>{record.purpose}</p>
              <div className="appearance-domain-record-field"><strong>Tipo</strong><span>{record.type}</span></div>
              <div className="appearance-domain-record-field"><strong>Nome no provedor</strong><code>{record.name}</code><ActionButton variant="secondary" onClick={()=>void copy(record.name,`${index}-name`)}>{copied===`${index}-name`?'Nome copiado':'Copiar nome'}</ActionButton><small>Endereço completo: {index===0?proofRecord:safeHost}</small></div>
              <div className="appearance-domain-record-field"><strong>{record.type==='TXT'?'Valor TXT':'Destino'}</strong><code>{record.value}</code><ActionButton variant="secondary" onClick={()=>void copy(record.value,`${index}-value`)}>{copied===`${index}-value`?'Valor copiado':'Copiar valor'}</ActionButton></div>
              <small>TTL: mantenha o padrão do provedor.</small>
            </section>)}
            {!records.length && <p className="appearance-domain-note">Escolha o tipo de endereço e confira o domínio do provedor acima para ver os dois registros.</p>}
          </div>

          <div className="appearance-domain-help">
            <p><b>Hostinger:</b> em cada registro, selecione o <b>Tipo</b> e copie <b>Nome</b> e <b>Valor / destino</b>; deixe o TTL padrão. O provedor completa o Nome com o domínio da zona; não cole esse domínio novamente.</p>
            <p><b>São dois registros DNS:</b> o TXT confirma o domínio; A (raiz) ou CNAME (subdomínio) faz o apontamento. O terceiro passo é testar aqui. Se os nameservers apontarem a outro provedor, crie os registros lá.</p>
            <p>Não altere registros do site/e-mail. Edite um registro existente para o mesmo nome; não duplique. Na raiz, o A pode substituir o destino do site principal.</p>
          </div>

          {diagnosis && (
            <div className={`appearance-domain-diagnosis${diagnosis.ready ? ' is-ready' : ''}`} role="status" aria-live="polite">
              <strong>{diagnosis.ready ? 'DNS configurado corretamente' : 'Ainda falta ajustar o DNS'}</strong>
              <ul>
                <li>{diagnosis.ownershipVerified ? '✓' : '•'} TXT de confirmação {diagnosis.ownershipVerified ? 'encontrado' : `não encontrado em ${proofRecord}`}</li>
                <li>{diagnosis.addressVerified ? '✓' : '•'} Apontamento {diagnosis.addressVerified ? 'correto' : `deve resolver para ${diagnosis.expectedIpv4}`}</li>
                {diagnosis.ipv6Conflict && <li>Há um registro AAAA/IPv6 conflitante. Remova-o somente deste endereço se não for usado pelo seu provedor.</li>}
                {!diagnosis.addressVerified && diagnosis.ipv4.length > 0 && <li>IPv4 encontrado: {diagnosis.ipv4.join(', ')}</li>}
                {diagnosis.cnames.length > 0 && <li>CNAME encontrado: {diagnosis.cnames.join(', ')}</li>}
              </ul>
              <small>Consulta direta aos DNS públicos em {new Date(diagnosis.checkedAt).toLocaleTimeString('pt-BR')}.</small>
              {diagnosis.ready && data.status !== 'active' && <p>Os registros estão prontos. A JobForged ativará o endereço e o HTTPS automaticamente após a próxima conferência, em até 5 minutos.</p>}
              {diagnosis.ready && <p>Se este teste passar e o endereço ainda não abrir no seu computador, ele pode estar usando uma resposta DNS antiga. Aguarde a propagação (pode levar até 24 horas) e teste novamente.</p>}
            </div>
          )}

          <p className="appearance-domain-note">A verificação automática também ocorre a cada 5 minutos. O endereço público abre somente a página da empresa; login e dados de conta permanecem protegidos na JobForged.</p>
          <ActionButton variant="danger" disabled={!editable || busy} onClick={() => void perform({ operation: 'disconnect', version: data.version }, 'disconnect')}>Desconectar domínio</ActionButton>
        </div>
      )}

      {error && <AppToast notice={{ kind: 'danger', title: 'Domínio', text: error }} onClose={() => setError('')} />}
    </EditorSection>
  );
}
