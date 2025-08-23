import { GetQuoteData } from './quotes.interface';

export const orderQuotesByPrice = (quotes: GetQuoteData[]) => {
  return quotes.sort((a, b) => a.total - b.total);
};
