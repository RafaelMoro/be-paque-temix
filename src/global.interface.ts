import { ProviderSource, QuoteCourier } from './quotes/quotes.interface';

export interface GeneralResponse {
  version: string;
  data: unknown;
  message: string | null;
  error: string | object;
}

export interface GlobalCreateGuideResponse {
  trackingNumber: string;
  shipmentNumber?: string | null;
  source: ProviderSource;
  carrier: string | null;
  price: string | null;
  guideLink: string | null;
  labelUrl: string | null;
  file: string | null;
}

export interface AddressGuide {
  name: string;
  alias: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface GetGuideResponse extends GlobalCreateGuideResponse {
  status: string;
  order?: string | null; // Used in TONE with the order number
  guide?: string | null; // Used in TONE with the guide number
  trackingLink?: string | null; // Used in TONE as "link_rastreo"
  shippingLink?: string | null; // Used in TONE as "link_documento"
  courier: QuoteCourier | null;
  origin: AddressGuide | null; // Having null value for TONE and Pkk
  destination: AddressGuide | null; // Having it null for Pkk
}
