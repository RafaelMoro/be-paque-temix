import { PakkeFormattedQuote, PakkeGetQuoteResponse } from './pakke.interface';

export const formatPakkeQuotes = (
  data: PakkeGetQuoteResponse,
): PakkeFormattedQuote[] => {
  return (data?.Pakke ?? []).map((item) => ({
    id: `${item.CourierCode}-${item.CourierName}-${item.CourierServiceId}`,
    servicio: `${item.CourierName} ${item.CourierServiceName}`,
    total: item.TotalPrice,
    source: 'Pkk',
  }));
};
