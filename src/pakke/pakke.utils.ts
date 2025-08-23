import { PakkeCourier, PakkeGetQuoteResponse } from './pakke.interface';
import { GetQuotePakkeDto } from './dtos/pakke.dto';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import {
  GetQuoteData,
  QuoteCourier,
  QuoteTypeSevice,
} from '@/quotes/quotes.interface';

export const getTypeServicePakke = (
  service: string,
): QuoteTypeSevice | null => {
  if (service === 'nextDay') return 'nextDay';
  if (service === 'standard') return 'standard';
  return null;
};

export const getPakkeCourier = (
  courierName: PakkeCourier,
): QuoteCourier | null => {
  switch (courierName) {
    case 'Estafeta':
      return 'Estafeta';
    case 'AMPM':
      return 'AMPM';
    case 'DHL':
      return 'DHL';
    case 'FedEx':
      return 'Fedex';
    case 'Paquete Express':
      return 'Paquetexpress';
    case 'Tres Guerras Logistics':
      return 'Tres guerras';
    default:
      return null;
  }
};

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
    typeService: getTypeServicePakke(item.typeService),
    courier: getPakkeCourier(item.CourierName),
    source: 'Pkk',
  }));
};
