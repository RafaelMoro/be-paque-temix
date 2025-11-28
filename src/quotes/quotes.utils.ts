import { ProfitMargin } from '@/global-configs/global-configs.interface';
import {
  CalculateTotalQuotesResponse,
  GetQuoteData,
  ProviderSource,
} from './quotes.interface';
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
 * @param quote quotes to calculate
 * @param margin the profitMargin config
 * @param isDefault whether the margin is the default one
 * @returns new array of quotes with updated totals
 */
export const calculateQuoteMargin = ({
  quote,
  margin,
  isDefault,
}: {
  quote: GetQuoteData;
  margin: ProfitMargin;
  isDefault: boolean;
}) => {
  const isPercentage = margin.type === 'percentage';
  const qAdjMode = isPercentage ? ('P' as const) : ('A' as const);
  const qAdjSrcRef = isDefault ? ('default' as const) : ('custom' as const);
  const qAdjFactor = isPercentage
    ? (quote.total * margin.value) / 100
    : margin.value;

  return {
    ...quote,
    qAdjMode,
    qBaseRef: quote.total,
    qAdjFactor,
    qAdjBasis: margin.value,
    qAdjSrcRef,
    total: quote.total + qAdjFactor,
  };
};

export const calculateTotalQuotes = ({
  quotes,
  provider,
  providerNotFoundMessage,
  config,
  messages,
}: {
  quotes: GetQuoteData[];
  config: GlobalConfigsDoc;
  provider: ProviderSource;
  providerNotFoundMessage: string;
  messages: string[];
}): CalculateTotalQuotesResponse => {
  // Find if the provider with GE exists
  const providerFound = config.providers.find((prov) => prov.name === provider);

  // If it does not exist, then return the quotes with the default profit margin
  if (!providerFound) {
    messages.push(providerNotFoundMessage);
    const updatedQuotes = quotes.map((quote) =>
      calculateQuoteMargin({
        quote,
        margin: config.globalMarginProfit,
        isDefault: true,
      }),
    );
    return {
      quotes: updatedQuotes,
      messages,
    };
  }

  const couriers = providerFound?.couriers;
  const updatedQuotes = quotes.map((quote) => {
    // Check if the courier matches with the one in the config
    const courier = couriers?.find((c) => c.name === quote.courier);

    // If it does not exist, return the quote with the default profit margin
    if (!courier) {
      // NOTE: I'm not logging if the courier was not found as the courier is either type QuoteTypeSevice or null.
      // the couriers that are new, will not be detected on this flow.
      return calculateQuoteMargin({
        quote,
        margin: config.globalMarginProfit,
        isDefault: true,
      });
    }

    return calculateQuoteMargin({
      quote,
      margin: courier.profitMargin,
      isDefault: false,
    });
  });
  return {
    quotes: updatedQuotes,
    messages,
  };
};
