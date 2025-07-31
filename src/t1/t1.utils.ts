import { T1FormattedQuote, T1GetQuoteResponse } from './t1.interface';

export const formatT1QuoteData = (
  data: T1GetQuoteResponse,
): T1FormattedQuote[] => {
  return data?.result.map((item) => ({
    id: item.id,
    servicio: Object.keys(item.cotizacion.servicios)[0], // Assuming you want the first service
    total:
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .costo_total,
    source: 'T1',
  }));
};
