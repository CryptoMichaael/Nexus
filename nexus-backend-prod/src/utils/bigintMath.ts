/**
 * ✅ BIGINT FINANCIAL PRECISION UTILITIES
 * All financial calculations use BigInt (atomic units)
 * 1 USDT = 1e18 atomic units (wei)
 */

export const USDT_DECIMALS = 18n;
export const USDT_UNIT = 10n ** USDT_DECIMALS; // 1000000000000000000n

/**
 * Convert human-readable USDT to atomic units
 * @example toAtomic("100.5") => 100500000000000000000n
 */
export function toAtomic(usdtAmount: string): bigint {
  if (!usdtAmount || usdtAmount === '0') return 0n;
  
  // Handle scientific notation
  if (usdtAmount.includes('e') || usdtAmount.includes('E')) {
    const num = parseFloat(usdtAmount);
    if (isNaN(num)) throw new Error(`Invalid number format: ${usdtAmount}`);
    usdtAmount = num.toFixed(18);
  }
  
  // Parse "100.50" USDT -> 100500000000000000000n atomic units
  const [whole = '0', decimal = ''] = usdtAmount.split('.');
  const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18);
  
  return BigInt(whole + paddedDecimal);
}

/**
 * Convert atomic units to human-readable USDT string
 * @example fromAtomic(100500000000000000000n) => "100.5"
 */
export function fromAtomic(atomicAmount: bigint): string {
  if (atomicAmount === 0n) return '0';
  
  const str = atomicAmount.toString().padStart(19, '0');
  const whole = str.slice(0, -18) || '0';
  const decimal = str.slice(-18).replace(/0+$/, '') || '0';
  
  return decimal === '0' ? whole : `${whole}.${decimal}`;
}

/**
 * Convert atomic units to human-readable with fixed decimals
 * @example fromAtomicFixed(100500000000000000000n, 2) => "100.50"
 */
export function fromAtomicFixed(atomicAmount: bigint, decimals: number = 2): string {
  if (atomicAmount === 0n) return '0.00';
  
  const str = atomicAmount.toString().padStart(19, '0');
  const whole = str.slice(0, -18) || '0';
  const decimalPart = str.slice(-18);
  
  // Round to specified decimals
  const rounded = decimalPart.slice(0, decimals);
  return `${whole}.${rounded.padEnd(decimals, '0')}`;
}

/**
 * Calculate daily ROI (0.3% = 30 basis points)
 * @param principalAtomic Principal amount in atomic units
 * @param rateBps Rate in basis points (30 = 0.3%)
 */
export function calculateDailyROI(principalAtomic: bigint, rateBps: bigint = 30n): bigint {
  if (principalAtomic <= 0n) return 0n;
  if (rateBps <= 0n) return 0n;
  
  // ROI = (principal * rateBps) / 10000
  return (principalAtomic * rateBps) / 10000n;
}

/**
 * Calculate MLM commission
 * @param amountAtomic Amount in atomic units
 * @param rateBps Commission rate in basis points
 */
export function calculateCommission(amountAtomic: bigint, rateBps: bigint): bigint {
  if (amountAtomic <= 0n) return 0n;
  if (rateBps <= 0n) return 0n;
  
  return (amountAtomic * rateBps) / 10000n;
}

/**
 * Calculate percentage
 * @param amountAtomic Amount in atomic units
 * @param percent Percentage (200 = 200%)
 */
export function calculatePercent(amountAtomic: bigint, percent: bigint): bigint {
  if (amountAtomic <= 0n) return 0n;
  if (percent <= 0n) return 0n;
  
  return (amountAtomic * percent) / 100n;
}

/**
 * Safe addition (with overflow check)
 */
export function safeAdd(a: bigint, b: bigint): bigint {
  const result = a + b;
  if (result < a || result < b) {
    throw new Error('BigInt overflow');
  }
  return result;
}

/**
 * Safe subtraction (with underflow check)
 */
export function safeSub(a: bigint, b: bigint): bigint {
  if (a < b) {
    throw new Error('BigInt underflow: cannot subtract larger value from smaller');
  }
  return a - b;
}

/**
 * Safe multiplication
 */
export function safeMul(a: bigint, b: bigint): bigint {
  const result = a * b;
  if (a !== 0n && result / a !== b) {
    throw new Error('BigInt multiplication overflow');
  }
  return result;
}

/**
 * Parse string/number to BigInt atomic units
 * Handles both string and number inputs
 */
export function parseAtomic(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return toAtomic(value.toString());
  return toAtomic(value);
}

/**
 * Format atomic amount for display with currency symbol
 */
export function formatUSDT(atomicAmount: bigint, decimals: number = 2): string {
  return `${fromAtomicFixed(atomicAmount, decimals)} USDT`;
}

/**
 * Convert database string to BigInt (for query results)
 */
export function dbToBigInt(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;
  return BigInt(value);
}

/**
 * Convert BigInt to database string (for query parameters)
 */
export function bigIntToDb(value: bigint): string {
  return value.toString();
}
