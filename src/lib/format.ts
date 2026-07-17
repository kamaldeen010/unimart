/**
 * Defensive formatting + WhatsApp helpers.
 * Every function is crash-proof against missing / mistyped DB fields.
 */

export function toStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  try {
    return String(value);
  } catch {
    return '';
  }
}

export function toNum(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function formatNaira(value: unknown): string {
  const n = toNum(value);
  if (!Number.isFinite(n)) return '₦0';
  return '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export function formatNairaSigned(value: unknown): string {
  const n = toNum(value);
  const abs = '₦' + Math.abs(n).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  return (n < 0 ? '-' : '+') + abs;
}

export function formatDate(value: unknown): string {
  const s = toStr(value);
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Convert a Nigerian phone number to international format for wa.me links.
 * - Strip all non-numeric characters
 * - Remove leading '0'
 * - If it doesn't already start with '234', prepend '234'
 */
export function toWhatsAppNumber(rawPhone: unknown): string {
  let s = toStr(rawPhone).replace(/[^0-9]/g, '');
  if (!s) return '';
  if (s.startsWith('234')) return s;
  if (s.startsWith('0')) s = s.slice(1);
  if (s.startsWith('+')) s = s.slice(1);
  return '234' + s;
}

/**
 * Build a pre-filled WhatsApp link with the exact required message.
 */
export function buildWhatsAppLink(rawPhone: unknown, vendorName: unknown, productTitle: unknown, price: unknown): string {
  const num = toWhatsAppNumber(rawPhone);
  if (!num) return '';
  const name = toStr(vendorName) || 'Vendor';
  const title = toStr(productTitle) || 'this item';
  const priceStr = formatNaira(price);
  const message = `Hello ${name}, I'm interested in your '${title}' listed on Unimart for ${priceStr}!`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function truncate(text: unknown, max = 60): string {
  const s = toStr(text);
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}
