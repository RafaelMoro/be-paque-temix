import { GeneralResponse } from '@/global.interface';
import { GetQuoteData } from '@/quotes/quotes.interface';

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
    // Id from the catalog of SAT
    product_id: string;
    product_value: number;
    quantity_products: number;
    content: string;
  };
}

/**
 * Payload needed to create the actual payload to create a guide in Manuable
 */
export interface CreateGuideMnRequest {
  quoteId: string;
  parcel: {
    satProductId: string;
    content: string;
    value: number;
    quantity: number;
  };
  origin: {
    name: string;
    street1: string;
    neighborhood: string;
    external_number: string;
    city: string;
    company: string;
    state: string;
    phone: string;
    email: string;
    country: string;
    reference: string;
  };
  destination: {
    name: string;
    street1: string;
    neighborhood: string;
    external_number: string;
    city: string;
    company: string;
    state: string;
    phone: string;
    email: string;
    country: string;
    reference: string;
  };
}

/**
 * Payload needed to create a guide in Manuable
 */
export interface CreateGuideMnPayload {
  address_from: {
    name: string;
    street1: string;
    neighborhood: string;
    external_number: string;
    city: string;
    company: string;
    state: string;
    phone: string;
    email: string;
    country: string;
    country_code: string;
    reference: string;
  };
  address_to: {
    name: string;
    street1: string;
    neighborhood: string;
    external_number: string;
    city: string;
    company: string;
    state: string;
    phone: string;
    email: string;
    country: string;
    country_code: string;
    reference: string;
  };
  parcel: {
    currency: string;
    // Id from the catalog of SAT
    product_id: string;
    product_value: number;
    quantity_products: number;
    content: string;
  };
  // Optional
  label_format: string;
  // Pass UUID of the quote to choose
  rate_token: string;
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

export interface ManuableGuide {
  token: string;
  tracking_number: string;
  // TODO: Update the type of courier for Mn
  carrier: string;
  // TODO: Update the type of tracking status
  tracking_status: null;
  price: string;
  // TODO: Update the type of waybill
  waybill: null;
  label_url: string;
  cancellable: boolean;
  created_at: string;
  label_status: string;
}

export interface FetchManuableQuotesResponse {
  data: ManuableQuote[];
}

export interface CreateManuableguideResponse {
  data: ManuableGuide;
}

export interface GetManuableQuoteResponse {
  messages: string[];
  quotes: GetQuoteData[];
}

export interface CreateGuideManuableResponse {
  messages: string[];
  guide: ManuableGuide | null;
}

export interface CreateGuideMnDataResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  messages: string[];
  data: {
    guide: ManuableGuide | null;
  };
}
