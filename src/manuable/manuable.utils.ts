import {
  ManuableFormattedQuote,
  ManuablePayload,
  ManuableQuote,
} from './manuable.interface';
import { GetQuoteDto } from '@/app.dto';

export const formatManuableQuote = (
  quotes: ManuableQuote[],
): ManuableFormattedQuote[] => {
  return quotes.map((quote) => ({
    id: quote.uuid,
    servicio: quote.carrier,
    total: quote.total_amount,
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
      height: Number(height),
      length: Number(length),
      width: Number(width),
      weight: Number(weight),
      product_id: '1', // This should be set based on your application logic
      product_value: 1, // Default value, can be changed as needed
      quantity_products: 1, // Default value, can be changed as needed
      content: 'Kraft', // This should be set based on your application logic
    },
  };
};
