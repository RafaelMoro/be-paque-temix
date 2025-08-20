import { GetQuoteDto } from '@/app.dto';
import { GEQuote } from './guia-envia.interface';
import { GetQuoteGEDto } from './dtos/guia-envia.dtos';
import { GetQuoteData, QuoteTypeSevice } from '@/global.interface';

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

export const formatQuotesGE = (quotes: GEQuote[]): GetQuoteData[] =>
  quotes.map((quote) => ({
    id: quote.id,
    service: quote.servicio,
    total: quote.total,
    typeService: getTypeServiceGe(quote.servicio),
    source: 'GE',
  }));

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
