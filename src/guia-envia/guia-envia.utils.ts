import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GEQuote } from './guia-envia.interface';
import { GetQuoteGEDto } from './dtos/guia-envia.dtos';
import {
  GetQuoteData,
  QuoteCourier,
  QuoteTypeSevice,
} from '@/quotes/quotes.interface';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';

const NEXT_DAY_REGEX = /expres/i;
const STANDARD_REGEX = /terrestre/i;
const EXCLUDE_REGEX = /paquetexpres/i;

export const getTypeServiceGe = (service: string): QuoteTypeSevice | null => {
  const serviceLowerCase = service.toLowerCase();

  if (EXCLUDE_REGEX.test(serviceLowerCase)) return null;
  if (NEXT_DAY_REGEX.test(serviceLowerCase)) return 'nextDay';
  if (STANDARD_REGEX.test(serviceLowerCase)) return 'standard';
  return null;
};

export const getGeCourier = (service: string): QuoteCourier | null => {
  const serviceLowerCase = service.toLowerCase();

  if (serviceLowerCase.includes('estafeta')) return 'Estafeta';
  if (serviceLowerCase.includes('dhl')) return 'DHL';
  if (serviceLowerCase.includes('ups')) return 'UPS';
  if (serviceLowerCase.includes('fedex')) return 'Fedex';

  return null;
};

export const formatQuotesGE = (quotes: GEQuote[]): GetQuoteData[] =>
  quotes.map((quote) => ({
    id: quote.id,
    service: quote.servicio,
    total: quote.total,
    typeService: getTypeServiceGe(quote.servicio),
    courier: getGeCourier(quote.servicio),
    source: 'GE',
  }));

export const calculateQuotesTotalWithDefaultProfitMargin = (
  quotes: GetQuoteData[],
  config: GlobalConfigsDoc,
): GetQuoteData[] => {
  const defaultProfitMargin = config?.globalMarginProfit;
  const isPercentage = defaultProfitMargin.type === 'percentage';
  return quotes.map((quote) => ({
    ...quote,
    total: isPercentage
      ? quote.total + (quote.total * defaultProfitMargin.value) / 100
      : quote.total + defaultProfitMargin.value,
  }));
};

export const calculateSingleQuoteTotalWithDefaultProfitMargin = (
  quote: GetQuoteData,
  config: GlobalConfigsDoc,
) => {
  const defaultProfitMargin = config?.globalMarginProfit;
  const isPercentage = defaultProfitMargin.type === 'percentage';
  return {
    ...quote,
    total: isPercentage
      ? quote.total + (quote.total * defaultProfitMargin.value) / 100
      : quote.total + defaultProfitMargin.value,
  };
};

export const calculateTotalQuotesGE = (
  quotes: GetQuoteData[],
  config: GlobalConfigsDoc,
) => {
  // Find if the provider with GE exists
  const providerGE = config.providers.find(
    (provider) => provider.name === 'GE',
  );

  // If it does not exist, then return the quotes with the default profit margin
  if (!providerGE) {
    const updatedQuotes = calculateQuotesTotalWithDefaultProfitMargin(
      quotes,
      config,
    );
    return updatedQuotes;
  }

  const couriers = providerGE?.couriers;
  const updatedQuotes = quotes.map((quote) => {
    // Check if the courier matches with the one in the config
    const courier = couriers?.find((c) => c.name === quote.courier);

    // If it does not exist, return the quote with the default profit margin
    if (!courier) {
      const updatedQuote = calculateSingleQuoteTotalWithDefaultProfitMargin(
        quote,
        config,
      );
      return updatedQuote;
    }

    const isPercentage = courier?.profitMargin.type === 'percentage';
    return {
      ...quote,
      total: isPercentage
        ? quote.total + (quote.total * courier.profitMargin.value) / 100
        : quote.total + courier?.profitMargin.value,
    };
  });
  return updatedQuotes;
};

export const formatPayloadGE = (payload: GetQuoteDto): GetQuoteGEDto => {
  return {
    origen: payload.originPostalCode,
    destino: payload.destinationPostalCode,
    peso: String(payload.weight),
    largo: String(payload.length),
    alto: String(payload.height),
    ancho: String(payload.width),
  };
};
