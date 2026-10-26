/** Never return to external URLs or carry authentication tokens in the destination. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !/^\/(?:app(?:\/|$)|backoffice(?:\/|$)|home(?:\/|$))/.test(value) || /[\\\u0000-\u001f%]/.test(value)) return null;
  return value.split(/[?#]/)[0];
}
