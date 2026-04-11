import {
  PakkeCourier,
  PakkeGetQuoteResponse,
  PkkCreateGuideRequest,
  PkkExternalCreateGuideRequest,
  PakkeExternalCreateGuideResponse,
  PakkeExternalGetBasicGuideInfo,
  PakkeExternalGetGuide,
} from './pakke.interface';
import { GetQuotePakkeDto } from './dtos/pakke.dto';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import {
  GetQuoteData,
  QuoteCourier,
  QuoteTypeSevice,
} from '@/quotes/quotes.interface';
import {
  GlobalCreateGuideResponse,
  GetGuideResponse,
} from '@/global.interface';
import { DEFAULT_COMPANY_NAME } from './pakke.constants';

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
      CompanyName: payload.origin.company ?? DEFAULT_COMPANY_NAME,
    },
    Recipient: {
      Name: payload.destination.name,
      Email: payload.destination.email,
      Phone1: payload.destination.phone,
      CompanyName: payload.destination.company ?? DEFAULT_COMPANY_NAME,
    },
  };
};

export const formatPakkeCreateGuideResponse = (
  response: PakkeExternalCreateGuideResponse,
): GlobalCreateGuideResponse => {
  return {
    trackingNumber: response.TrackingNumber,
    carrier: response.CourierName,
    price: response.TotalAmount.toString(),
    guideLink: null,
    labelUrl: null,
    source: 'Pkk',
    file: response.Label || null,
  };
};

export const formatPakkeGetBasicInfoGuidesResponse = (
  response: PakkeExternalGetBasicGuideInfo,
): GetGuideResponse => {
  return {
    trackingNumber: response.TrackingNumber, // guide number
    shipmentNumber: response.ShipmentId || null,
    source: 'Pkk',
    carrier: null, // not returning carrier
    price: null, // not returning price
    guideLink: null,
    labelUrl: null,
    file: null,
    status: response.TrackingStatus,
    order: null, // only used in TONE
    guide: null, // only used in TONE
    trackingLink: null,
    shippingLink: null,
    courier: null,
    origin: null,
    destination: null, // not returning destination info
  };
};

export const formatPakkeGetGuideDetailResponse = (
  response: PakkeExternalGetGuide,
): GetGuideResponse => {
  // Helper to extract street number from Address2 or default to empty
  const extractStreetNumber = (address2: string) => {
    // If Address2 contains only numbers, it's likely the street number
    const trimmed = address2?.trim() || '';
    return /^\d+$/.test(trimmed) ? trimmed : '';
  };

  // Try to match courier name to QuoteCourier type
  const courierMapping: Record<string, QuoteCourier | null> = {
    Estafeta: 'Estafeta',
    AMPM: 'AMPM',
    DHL: 'DHL',
    FedEx: 'Fedex',
    'Paquete Express': 'Paquetexpress',
    'Tres Guerras Logistics': 'Tres guerras',
  };

  return {
    trackingNumber: response.TrackingNumber,
    shipmentNumber: response.ShipmentId || null,
    source: 'Pkk',
    carrier: response.CourierName || response.CourierCode,
    price: response.TotalAmount?.toString() || null,
    guideLink: null,
    labelUrl: null,
    file: null, // File/label not available in get guide response
    status: response.TrackingStatus || response.Status,
    order: response.ResellerReference || null,
    guide: response.WaybillNumber || response.TrackingNumber,
    trackingLink: null,
    shippingLink: null,
    courier: courierMapping[response.CourierName] || null,
    origin: response.AddressFrom
      ? {
          name: response.Sender?.Name || '',
          alias: '',
          street: response.AddressFrom.Address1 || '',
          streetNumber: extractStreetNumber(response.AddressFrom.Address2),
          neighborhood: response.AddressFrom.Neighborhood || '',
          city: response.AddressFrom.City || '',
          state:
            response.AddressFrom.State || response.AddressFrom.UserState || '',
        }
      : null,
    destination: response.AddressTo
      ? {
          name: response.Recipient?.Name || '',
          alias: '',
          street: response.AddressTo.Address1 || '',
          streetNumber: extractStreetNumber(response.AddressTo.Address2),
          neighborhood: response.AddressTo.Neighborhood || '',
          city: response.AddressTo.City || '',
          state: response.AddressTo.State || response.AddressTo.UserState || '',
        }
      : null,
  };
};
