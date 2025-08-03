import { GetQuoteGEDto } from '@/guia-envia/dtos/guia-envia.dtos';
import {
  ManuableFormattedQuote,
  ManuablePayload,
  ManuableQuote,
} from './manuable.interface';

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

export const formatPayload = (payload: GetQuoteGEDto): ManuablePayload => {
  const { origen, destino, peso, largo, alto, ancho } = payload;

  return {
    address_from: {
      country_code: 'MX', // Assuming Mexico as default
      zip_code: origen,
    },
    address_to: {
      country_code: 'MX', // Assuming Mexico as default
      zip_code: destino,
    },
    parcel: {
      currency: 'MXN', // Assuming Mexican Peso as default
      distance_unit: 'CM',
      mass_unit: 'KG',
      height: Number(alto),
      length: Number(largo),
      width: Number(ancho),
      weight: Number(peso),
      product_id: '1', // This should be set based on your application logic
      product_value: 1, // Default value, can be changed as needed
      quantity_products: 1, // Default value, can be changed as needed
      content: 'Kraft', // This should be set based on your application logic
    },
  };
};
