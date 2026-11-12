"use client";

import { useEffect, useMemo, useState } from 'react';
import { ActionButton, AppToast, EditorSection, StatusBadge, RadioField, TextField, SelectField } from '../ui';
import {apiResponse,readApi} from '@/app/lib/api-response';
import { validCompanyHostname, type CompanyDomain } from '@/app/lib/company-domain';

import {domainProviders} from './domain-providers';

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

export function CompanyDomainEditor({ editable,companyId }: { editable: boolean;companyId:string }) {
  const storageKey='jbfd-domain-kind:'+companyId;
  const [data, setData] = useState<CompanyDomain>({ status: 'none', version: 0 });
  const [hostname, setHostname] = useState('');
  const [zone, setZone] = useState('');
  const [kind, setKind] = useState<DomainKind>('');
  const [provider, setProvider] = useState('');
  const providerGuide = domainProviders.find(item=>item.value===provider);
  const [busy, setBusy] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [diagnosis, setDiagnosis] = useState<CheckResult | null>(null);
  const [copied, setCopied] = useState('');

  async function request(body?: object) {
    if(!body)return readApi<DomainResponse>('/api/company/domain','Não foi possível consultar o domínio.');
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
      if(result.kind&&result.zone){setKind(result.kind);setZone(result.zone);}
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o domínio.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    readApi<DomainResponse>('/api/company/domain','Não foi possível carregar o domínio.',controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setData(result);
        setHostname(result.hostname || '');
        let remembered: string|null=null;
        try { remembered=window.localStorage.getItem(storageKey); } catch { /* storage can be disabled */ }
        const selected=result.kind??(remembered==='root'||remembered==='subdomain'?remembered:'');
        setKind(selected);
        setZone(result.zone??(selected==='root'?result.hostname||'':''));
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o domínio.');
      })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [storageKey]);

  const safeHost = cleanHostname(hostname);
  const safeZone = cleanHostname(zone);
  const proofRecord = data.record || (data.hostname ? `_jobforged.${data.hostname}` : '');
  const rootRelative = safeHost === safeZone;
  const zoneMatches = kind === 'root'
    ? rootRelative
    : kind === 'subdomain' && safeHost.endsWith(`.${safeZone}`) && safeHost !== safeZone;
  const proofRelative = relativeName(proofRecord, safeZone);
  const routeRelative = relativeName(safeHost, safeZone);
  const shownStatus = data.hostname === safeHost ? data.status : 'none';
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
        let remembered: string|null=null;
        try { remembered=window.localStorage.getItem(storageKey); } catch { /* storage can be disabled */ }
        const selected=result.kind??(remembered==='root'||remembered==='subdomain'?remembered:'');
        setKind(selected);
        setZone(result.zone??(selected==='root'?result.hostname||'':''));
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
    try { window.localStorage.setItem(storageKey,next); } catch { /* storage can be disabled */ }
    setDiagnosis(null);
    const host = cleanHostname(hostname);
    if (next === 'root') setZone(host);
    else setZone('');
  }

  const statusText: Record<CompanyDomain['status'], string> = {
    none: 'Ainda não configurado', pending: 'Aguardando DNS', verified: 'Preparando HTTPS',
    active: 'Ativo', disabled: 'Desconectado',
  };

  return (
    <EditorSection title="Domínio próprio" description="Conecte o endereço da página de vagas em quatro etapas. Você informa o endereço aqui, adiciona dois registros no painel DNS e volta para confirmar.">
      <fieldset className="appearance-domain-kind">
        <legend>1. Escolha o tipo de endereço</legend>
        <RadioField name="company-domain-kind" label="Domínio principal (ex.: suaempresa.com.br)" checked={kind==='root'} onChange={()=>setDomainKind('root')} disabled={!editable||busy}/>
        <RadioField name="company-domain-kind" label="Subdomínio (ex.: vagas.suaempresa.com.br)" checked={kind==='subdomain'} onChange={()=>setDomainKind('subdomain')} disabled={!editable||busy}/>
        <small>Escolha o tipo antes de vincular. Subdomínio é recomendado para manter o site principal.</small>
        {kind === 'root' && <small className="appearance-domain-warning">A raiz aponta o site principal para a JobForged. Se quer preservar seu site atual, escolha um subdomínio.</small>}
      </fieldset>

      {kind && <section className="appearance-domain-stage" aria-label="Endereço da página"><h3>2. Informe o endereço</h3>      <TextField
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
        }}
        helpText="Exemplo: suaempresa.com.br ou vagas.suaempresa.com.br. Não inclua https:// nem caminhos."
        disabled={!editable || busy}
      />

      {kind === 'subdomain' && <TextField label="Domínio principal no painel DNS" placeholder="Digite o domínio..." maxLength={253} value={zone} error={zoneError} onChange={event=>{setZone(cleanHostname(event.target.value));setDiagnosis(null)}} helpText={`Para ${safeHost||'vagas.suaempresa.com.br'}, informe o domínio principal (ex.: suaempresa.com.br).`} disabled={!editable||busy}/>}

</section>}
      <div className="appearance-domain-status" aria-live="polite">
        <span>Status do vínculo</span>
        <StatusBadge tone={shownStatus === 'active' ? 'positive' : 'info'}>{statusText[shownStatus]}</StatusBadge>
      </div>

      <p className="appearance-domain-next" role="status">{!linkedAddress?'Confira o endereço e selecione Vincular endereço para gerar os registros.':data.status==='active'?'Endereço ativo. Você já pode abrir a página da empresa.':data.status==='verified'?'DNS confirmado. O HTTPS será preparado automaticamente; consulte o status em até 5 minutos.':'Endereço vinculado. Escolha quem gerencia seu DNS e siga as instruções abaixo.'}</p>
      <div className="appearance-domain-actions">
        <ActionButton disabled={!canRegister} onClick={() => void perform({ operation: 'register', hostname: safeHost, kind, zone: safeZone, version: data.version }, 'save')}>
          {linkedAddress?'Endereço vinculado':'Vincular endereço'}
        </ActionButton>

        <ActionButton variant="quiet" disabled={busy} onClick={() => void refresh()}>
          Consultar status
        </ActionButton>
        {linkedAddress&&data.status==='active'&&<a className="jf-action jf-action--secondary" href="/api/company/portal/open" target="_blank" rel="noopener noreferrer">Abrir página da empresa</a>}
      </div>

      {linkedAddress && kind && zoneMatches && (
        <div className="appearance-domain-instructions">
          <div className="appearance-domain-steps">
            <h3>3. Adicione os registros no seu DNS</h3>
            <p>O DNS pode estar em uma empresa diferente daquela onde você comprou o domínio ou hospeda o site. Se ele está na Cloudflare, escolha Cloudflare, mesmo que o domínio tenha sido comprado em outro lugar.</p>
            <SelectField label="Quem gerencia o DNS deste domínio?" value={provider} placeholder="Selecione o provedor..." onValueChange={setProvider} options={domainProviders.map(item=>({value:item.value,label:item.label}))}/>
            {providerGuide&&<><p>{providerGuide.steps}</p><p>{providerGuide.note}</p>{providerGuide.url&&<a className="jf-text-link" href={providerGuide.url} target="_blank" rel="noopener noreferrer">Abrir guia oficial de {providerGuide.label}</a>}</>}
          </div>

          {providerGuide&&<>
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
            <p><b>Como preencher:</b> copie o Tipo, o Nome e o Valor de cada cartão. Se o painel completa o nome com o domínio principal, use o nome curto mostrado. Se pedir o endereço completo, use o endereço completo do cartão. Para a raiz, use @ ou deixe em branco, conforme o painel indicar.</p>
            <p>Mantenha o TTL padrão. Salve cada registro. Não altere os registros de e-mail nem outros endereços. Se já existir um apontamento para este mesmo nome, confira-o antes de substituir; não crie destinos conflitantes.</p>
            <p>Usar o domínio principal muda o destino do site atual. Para manter esse site, conecte um subdomínio, como vagas.suaempresa.com.br.</p>
          </div>
          <section className="appearance-domain-stage" aria-label="Verificação do domínio">
            <h3>4. Confirme a configuração</h3>
            <p>Depois de salvar os dois registros no provedor, volte aqui e teste. Se ainda não forem encontrados, aguarde a atualização do DNS e tente novamente; ela pode levar até 24 horas.</p>
            <ActionButton variant="secondary" disabled={!editable||busy||!records.length} onClick={()=>void perform({operation:'check'},'check')}>{checking?'Testando DNS…':'Testar DNS agora'}</ActionButton>
          </section></>}

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
