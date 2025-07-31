import { GEFormattedQuote, GEQuote } from './guia-envia.interface';

export const formatQuotes = (quotes: GEQuote[]): GEFormattedQuote[] =>
  quotes.map((quote) => ({ ...quote, source: 'GE' }));
