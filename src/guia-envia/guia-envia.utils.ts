import { GetQuoteDto } from '@/app.dto';
import { GEFormattedQuote, GEQuote } from './guia-envia.interface';
import { GetQuoteGEDto } from './dtos/guia-envia.dtos';

export const formatQuotesGE = (quotes: GEQuote[]): GEFormattedQuote[] =>
  quotes.map((quote) => ({ ...quote, source: 'GE' }));

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
