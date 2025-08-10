import { PakkeGetQuoteResponse } from './pakke.interface';
import { GetQuotePakkeDto } from './dtos/pakke.dto';
import { GetQuoteDto } from '@/app.dto';
import { GetQuoteData } from '@/global.interface';

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
      Weight: String(weight),
      Width: String(width),
      Height: String(height),
      Length: String(length),
    },
  };
};

export const formatPakkeQuotes = (
  data: PakkeGetQuoteResponse,
): GetQuoteData[] => {
  return (data?.Pakke ?? []).map((item) => ({
    id: `${item.CourierCode}-${item.CourierName}-${item.CourierServiceId}`,
    service: `${item.CourierName} ${item.CourierServiceName}`,
    total: item.TotalPrice,
    source: 'Pkk',
  }));
};
