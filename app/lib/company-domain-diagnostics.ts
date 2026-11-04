const EXPECTED_IPV4 = '187.77.229.27';
const DNS_JSON = 'https://cloudflare-dns.com/dns-query';

type DnsAnswer = { type: number; data: string };

async function queryDns(name: string, type: 'A' | 'AAAA' | 'CNAME' | 'TXT'): Promise<DnsAnswer[]> {
  const url = new URL(DNS_JSON);
  url.searchParams.set('name', name);
  url.searchParams.set('type', type);
  const response = await fetch(url, {
    headers: { accept: 'application/dns-json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('DNS_LOOKUP_UNAVAILABLE');
  const body = await response.json() as { Answer?: DnsAnswer[] };
  return body.Answer ?? [];
}

function txtValue(data: string) {
  return data.replace(/^"|"$/g, '').replace(/"\s+"/g, '');
}

export async function diagnoseCompanyDomain(hostname: string, proof: string) {
  const [addressAnswers, ipv6Answers, cnameAnswers, proofAnswers] = await Promise.all([
    queryDns(hostname, 'A'),
    queryDns(hostname, 'AAAA'),
    queryDns(hostname, 'CNAME'),
    queryDns(`_jobforged.${hostname}`, 'TXT'),
  ]);

  // A DNS-over-HTTPS response may include the CNAME chain and its final A records.
  const ipv4 = [...new Set(addressAnswers.filter(answer => answer.type === 1).map(answer => answer.data))];
  const ipv6 = [...new Set(ipv6Answers.filter(answer => answer.type === 28).map(answer => answer.data))];
  const cnames = [...new Set(cnameAnswers.filter(answer => answer.type === 5).map(answer => answer.data.replace(/\.$/, '').toLowerCase()))];
  const ownershipVerified = proofAnswers.some(answer => answer.type === 16 && txtValue(answer.data) === proof);
  const addressVerified = ipv4.length === 1 && ipv4[0] === EXPECTED_IPV4 && ipv6.length === 0;

  return {
    checkedAt: new Date().toISOString(),
    ownershipVerified,
    addressVerified,
    ipv6Conflict: ipv6.length > 0,
    ready: ownershipVerified && addressVerified,
    ipv4,
    ipv6,
    cnames,
    expectedIpv4: EXPECTED_IPV4,
  };
}
