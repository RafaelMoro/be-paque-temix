import {
  MAX_SAFE_MONEY_CENTS,
  MSG_BALANCE_INVALID_AMOUNT,
} from './balance.constants';

function expandDecimal(value: number): string {
  const [coefficient, exponentValue] = value
    .toString()
    .toLowerCase()
    .split('e');

  if (exponentValue === undefined) return coefficient;

  const exponent = Number(exponentValue);
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = `${whole}${fraction}`;
  const decimalIndex = whole.length + exponent;

  if (decimalIndex <= 0) return `0.${'0'.repeat(-decimalIndex)}${digits}`;
  if (decimalIndex >= digits.length)
    return `${digits}${'0'.repeat(decimalIndex - digits.length)}`;

  return `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

export function toMoneyCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(MSG_BALANCE_INVALID_AMOUNT);
  }

  const [whole, fraction = ''] = expandDecimal(value).split('.');
  const cents = BigInt(`${whole}${`${fraction}00`.slice(0, 2)}`);

  if (cents < 1n || cents > BigInt(MAX_SAFE_MONEY_CENTS)) {
    throw new RangeError(MSG_BALANCE_INVALID_AMOUNT);
  }

  return Number(cents);
}

export function fromMoneyCents(value: number): number {
  return value / 100;
}
