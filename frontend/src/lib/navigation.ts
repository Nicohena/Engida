export function getSafeReturnPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const target = new URL(value, 'https://engida.invalid');
    return target.origin === 'https://engida.invalid'
      ? `${target.pathname}${target.search}${target.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
