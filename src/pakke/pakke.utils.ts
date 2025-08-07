import { PakkeFormattedQuote, PakkeGetQuoteResponse } from './pakke.interface';
import { GetQuotePakkeDto } from './dtos/pakke.dto';
import { GetQuoteDto } from '@/app.dto';

export const convertPayloadToPakkeDto = (
  payload: GetQuoteDto,
): GetQuotePakkeDto => {
  const {
    originPostalCode,
    destinationPostalCode,
    weight,
    length,
    height,
    width,
  } = payload;
  return {
    ZipCodeFrom: originPostalCode,
    ZipCodeTo: destinationPostalCode,
    Parcel: {
      Weight: weight,
      Width: width,
      Height: height,
      Length: length,
    },
  };
};

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
