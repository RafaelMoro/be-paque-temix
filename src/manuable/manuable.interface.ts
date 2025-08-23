import { GetQuoteData } from '@/global.interface';

export type TypeServiceMn = 'standard' | 'express';

export type MnCarrier = 'FEDEX' | 'DHL';

export interface GetManuableSessionResponse {
  id: string;
  token: string;
  email: string;
}

export interface ManuablePayload {
  address_from: {
    country_code: string;
    zip_code: string;
  };
  address_to: {
    country_code: string;
    zip_code: string;
  };
  parcel: {
    currency: string;
    distance_unit: string;
    mass_unit: string;
    height: number;
    length: number;
    width: number;
    weight: number;
    product_id: string;
    product_value: number;
    quantity_products: number;
    content: string;
  };
}

export interface ManuableQuote {
  service: TypeServiceMn;
  currency: string;
  uuid: string;
  additional_fees: never[];
  zone: number;
  total_amount: string;
  carrier: MnCarrier;
  cancellable: boolean;
  shipping_type: string;
  lead_time: string;
}

export interface FetchManuableQuotesResponse {
  data: ManuableQuote[];
}

export interface GetManuableQuoteResponse {
  messages: string[];
  quotes: GetQuoteData[];
}
