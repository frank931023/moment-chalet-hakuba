/**
 * Format an amount as TWD with comma separators.
 * e.g. formatCurrency(12000) → "TWD 12,000"
 */
export function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  return `TWD ${formatted}`
}
