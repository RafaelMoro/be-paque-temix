import { GetQuoteDto } from '@/app.dto';
import { GEFormattedQuote, GEQuote } from './guia-envia.interface';
import { GetQuoteGEDto } from './dtos/guia-envia.dtos';

export const formatQuotesGE = (quotes: GEQuote[]): GEFormattedQuote[] =>
  quotes.map((quote) => ({ ...quote, source: 'GE' }));

export const formatPayloadGE = (payload: GetQuoteDto): GetQuoteGEDto => {
  return {
    origen: payload.originPostalCode,
    destino: payload.destinationPostalCode,
    peso: payload.weight,
    largo: payload.length,
    alto: payload.height,
    ancho: payload.width,
  };
};
