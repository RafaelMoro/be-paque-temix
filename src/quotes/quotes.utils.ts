import { ProfitMargin } from '@/global-configs/global-configs.interface';
import { GetQuoteData } from './quotes.interface';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';

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

  const result = quoteAmount * (1 + marginProfitValue / 100);
  return Math.round(result * 100) / 100;
};

/**
 * Add an absolute margin value to a quote amount.
 * Example: marginProfitValue = 15, quoteAmount = 100 -> returns 115
 *
 * @param marginProfitValue absolute value to add (e.g. 15)
 * @param quoteAmount base amount to which the absolute value will be added
 * @returns new amount with the absolute value added
 * @throws {TypeError} when inputs are not valid numbers
 */
export const addAbsoluteMarginProfit = (
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

  const result = quoteAmount + marginProfitValue;
  return Math.round(result * 100) / 100;
};

/**
 * Calculate quote totals applying the configured profit margin.
 * If `globalConfigDoc` is null or missing profitMargin, returns the quotes unchanged.
 *
 * @param quotes array of quotes to calculate
 * @param globalConfigDoc global config document that may contain profitMargin
 * @returns new array of quotes with updated totals
 */
export const calculateQuotesValue = (
  quotes: GetQuoteData[],
  globalConfigDoc: GlobalConfigsDoc | null,
  messages: string[],
): GetQuoteData[] => {
  if (!globalConfigDoc) {
    messages.push('Profit margin not applied: global configuration not found');
    return quotes;
  }

  const profitMargin = globalConfigDoc.globalMarginProfit;
  if (!profitMargin || typeof profitMargin.value !== 'number') {
    messages.push('Profit margin not applied: profitMargin missing or invalid');
    return quotes;
  }

  const { value: marginValue, type } = profitMargin;

  // push a single message indicating margin was applied
  messages.push('Profit margin applied');

  return quotes.map((quote) => {
    const newTotal =
      type === 'percentage'
        ? addPercentageMarginProfit(marginValue, quote.total)
        : addAbsoluteMarginProfit(marginValue, quote.total);
    return {
      ...quote,
      total: newTotal,
    } as GetQuoteData;
  });
};

const calculateQuoteDefaultMargin = (
  quote: GetQuoteData,
  margin: ProfitMargin,
) => {
  const isPercentage = margin.type === 'percentage';
  const qAdjMode = isPercentage ? ('P' as const) : ('A' as const);
  const qAdjFactor = isPercentage
    ? (quote.total * margin.value) / 100
    : margin.value;

  return {
    ...quote,
    qAdjMode,
    qBaseRef: quote.total,
    qAdjFactor,
    qAdjBasis: margin.value,
    qAdjSrcRef: 'default' as const,
    total: quote.total + qAdjFactor,
  };
};

export const calculateQuotesTotalWithDefaultProfitMargin = (
  quotes: GetQuoteData[],
  config: GlobalConfigsDoc,
): GetQuoteData[] => {
  const defaultProfitMargin = config?.globalMarginProfit;

  return quotes.map((quote) =>
    calculateQuoteDefaultMargin(quote, defaultProfitMargin),
  );
};

export const calculateSingleQuoteTotalWithDefaultProfitMargin = (
  quote: GetQuoteData,
  config: GlobalConfigsDoc,
) => {
  const defaultProfitMargin = config?.globalMarginProfit;
  const calcultatedQuote = calculateQuoteDefaultMargin(
    quote,
    defaultProfitMargin,
  );
  return calcultatedQuote;
};
