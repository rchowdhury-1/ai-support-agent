/**
 * Display formatting. The v2 dashboard contract (extracted from the deployed
 * frontend) carries presentation strings in API payloads — formatted in one
 * place here so the mock→fetch swap stays mechanical. British English, GBP.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function relTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} h ago`;
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)} d ago`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'V';
  return parts
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

export function thousands(n: number): string {
  return n.toLocaleString('en-GB');
}

/** Model costs accrue in USD; the operator dashboard displays GBP. */
const USD_TO_GBP = Number(process.env.USD_TO_GBP || 0.79);

export function usdToGbp(usd: number): number {
  return usd * USD_TO_GBP;
}

export function gbp(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

export function pence(p: number): string {
  return p % 100 === 0 ? `£${p / 100}` : `£${(p / 100).toFixed(2)}`;
}

export function tokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function bytesShort(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

export function monthKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS_FULL[Number(m) - 1]} ${y}`;
}

export function dayMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}
