/** Presentation and navigation only. Authorization stays in the API and database. */
export function administrativeDate(value?: string | null) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
}
export function administrativePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= 10000 ? page : 1;
}
export function administrativeCompany(value: string | null) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : '';
}
