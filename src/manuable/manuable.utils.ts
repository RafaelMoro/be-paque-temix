import { ManuableFormattedQuote, ManuableQuote } from './manuable.interface';

export const formatManuableQuote = (
  quotes: ManuableQuote[],
): ManuableFormattedQuote[] => {
  return quotes.map((quote) => ({
    id: quote.uuid,
    servicio: quote.carrier,
    total: quote.total_amount,
    source: 'Mn',
  }));
};
