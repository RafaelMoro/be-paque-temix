import { GetQuoteDto } from '@/app.dto';
import { GEQuote } from './guia-envia.interface';
import { GetQuoteGEDto } from './dtos/guia-envia.dtos';
import { GetQuoteData } from '@/global.interface';

export const formatQuotesGE = (quotes: GEQuote[]): GetQuoteData[] =>
  quotes.map((quote) => ({
    id: quote.id,
    service: quote.servicio,
    total: quote.total,
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
