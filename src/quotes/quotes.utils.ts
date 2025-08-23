import { GetQuoteData } from './quotes.interface';

export const orderQuotesByPrice = (quotes: GetQuoteData[]) => {
  return quotes.sort((a, b) => a.total - b.total);
};

/**
 * Add a percentage margin to a quote amount.
 * Example: marginProfitValue = 10, quoteAmount = 100 -> returns 110
 *
 * @param marginProfitValue percentage to add (e.g. 10 for 10%)
 * @param quoteAmount base amount to which the percentage will be added
 * @returns new amount with the percentage added
 * @throws {TypeError} when inputs are not valid numbers
 */
export const addPercentageMarginProfit = (
  marginProfitValue: number,
  quoteAmount: number,
): number => {
  if (
    typeof marginProfitValue !== 'number' ||
    Number.isNaN(marginProfitValue)
  ) {
    throw new TypeError('marginProfitValue must be a valid number');
  }
  if (typeof quoteAmount !== 'number' || Number.isNaN(quoteAmount)) {
    throw new TypeError('quoteAmount must be a valid number');
  }

  return quoteAmount * (1 + marginProfitValue / 100);
};
