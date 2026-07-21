import { MAX_SAFE_MONEY_CENTS } from './balance.constants';
import { fromMoneyCents, toMoneyCents } from './balance.utils';

describe('money conversion', () => {
  it.each([
    [0.01, 1],
    [1.15, 115],
    [19.487, 1948],
    [1.15e2, 11500],
    [1e-2, 1],
    [100000, 10000000],
  ])('converts %p to %p cents without rounding', (amount, cents) => {
    expect(toMoneyCents(amount)).toBe(cents);
  });

  it('converts cents to the API decimal amount', () => {
    expect(fromMoneyCents(1948)).toBe(19.48);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.009, 1e-3])(
    'rejects invalid amount %p',
    (amount) => {
      expect(() => toMoneyCents(amount)).toThrow(RangeError);
    },
  );

  it('rejects an amount whose cents exceed the safe integer range', () => {
    expect(() => toMoneyCents(MAX_SAFE_MONEY_CENTS)).toThrow(RangeError);
  });
});
