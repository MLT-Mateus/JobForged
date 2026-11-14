/** A single mailbox, never a display-name, address list, header or fallback inbox. */
export function emailRecipient(value: unknown): string | null {
  if (typeof value !== 'string' || /[\r\n\u0000-\u001f\u007f]/.test(value)) return null;
  const email=value.trim().toLowerCase();
  if (email.length>254 || !/^[^\s@,;<>"\\]+@[^\s@,;<>"\\]+\.[^\s@,;<>"\\]+$/.test(email)) return null;
  const [local,domain]=email.split('@');
  if(local.length>64 || local.startsWith('.') || local.endsWith('.') || local.includes('..'))return null;
  if(domain.split('.').some(label=>!label || label.length>63 || label.startsWith('-') || label.endsWith('-')))return null;
  return email;
}
