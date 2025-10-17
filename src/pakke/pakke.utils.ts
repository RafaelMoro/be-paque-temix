import {
  PakkeCourier,
  PakkeGetQuoteResponse,
  PkkCreateGuideRequest,
  PkkExternalCreateGuideRequest,
} from './pakke.interface';
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
    qBaseRef: item.TotalPrice,
    qAdjFactor: 0,
    qAdjBasis: 0,
    qAdjMode: 'P',
    qAdjSrcRef: 'default',
    typeService: getTypeServicePakke(item.typeService),
    courier: getPakkeCourier(item.CourierName),
    source: 'Pkk',
  }));
};

export const convertPkkCreateGuideToExternal = (
  payload: PkkCreateGuideRequest,
): PkkExternalCreateGuideRequest => {
  return {
    AddressFrom: {
      ZipCode: payload.origin.zipcode,
      State: payload.origin.state,
      City: payload.origin.city,
      Neighborhood: payload.origin.neighborhood,
      Address1: payload.origin.street1,
      Address2: payload.origin.street2 || '',
      Residential: payload.origin.isResidential,
    },
    AddressTo: {
      ZipCode: payload.destination.zipcode,
      State: payload.destination.state,
      City: payload.destination.city,
      Neighborhood: payload.destination.neighborhood,
      Address1: payload.destination.street1,
      Address2: payload.destination.street2 || '',
      Residential: payload.destination.isResidential,
    },
    Content: payload.parcel.content,
    Parcel: {
      Length: Number(payload.parcel.length),
      Width: Number(payload.parcel.width),
      Height: Number(payload.parcel.height),
      Weight: Number(payload.parcel.weight),
    },
    Sender: {
      Name: payload.origin.name,
      Email: payload.origin.email,
      Phone1: payload.origin.phone,
      CompanyName: payload.origin.company,
    },
    Recipient: {
      Name: payload.destination.name,
      Email: payload.destination.email,
      Phone1: payload.destination.phone,
      CompanyName: payload.destination.company,
    },
  };
};
