import {
  GetQuoteData,
  QuoteCourier,
  QuoteTypeSevice,
} from '@/quotes/quotes.interface';
import {
  ManuablePayload,
  ManuableQuote,
  MnCarrier,
  TypeServiceMn,
} from './manuable.interface';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';

export const getTypeServiceMn = (
  service: TypeServiceMn,
): QuoteTypeSevice | null => {
  if (service === 'express') return 'nextDay';
  if (service === 'standard') return 'standard';
  return null;
};

export const getPakkeCourier = (carrier: MnCarrier): QuoteCourier | null => {
  switch (carrier) {
    case 'FEDEX':
      return 'Fedex';
    case 'DHL':
      return 'DHL';
    default:
      return null;
  }
};

export const formatManuableQuote = (
  quotes: ManuableQuote[],
): GetQuoteData[] => {
  return quotes.map((quote) => ({
    id: quote.uuid,
    service: quote.carrier,
    total: Number(quote.total_amount),
    typeService: getTypeServiceMn(quote.service),
    courier: getPakkeCourier(quote.carrier),
    source: 'Mn',
  }));
};

export const formatPayloadManuable = (
  payload: GetQuoteDto,
): ManuablePayload => {
  const {
    originPostalCode,
    destinationPostalCode,
    weight,
    length,
    height,
    width,
  } = payload;

  return {
    address_from: {
      country_code: 'MX', // Assuming Mexico as default
      zip_code: originPostalCode,
    },
    address_to: {
      country_code: 'MX', // Assuming Mexico as default
      zip_code: destinationPostalCode,
    },
    parcel: {
      currency: 'MXN', // Assuming Mexican Peso as default
      distance_unit: 'CM',
      mass_unit: 'KG',
      height: height,
      length: length,
      width: width,
      weight: weight,
      product_id: '1', // This should be set based on your application logic
      product_value: 1, // Default value, can be changed as needed
      quantity_products: 1, // Default value, can be changed as needed
      content: 'Kraft', // This should be set based on your application logic
    },
  };
};
