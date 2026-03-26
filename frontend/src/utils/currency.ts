export const DEFAULT_CURRENCY = 'MXN';

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale = 'es-MX',
) {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch (e) {
    const symbol = currency === 'MXN' ? 'MX$' : '$';
    return `${symbol}${n.toFixed(2)}`;
  }
}

export default formatCurrency;
