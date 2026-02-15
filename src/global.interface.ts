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
  carrier: string;
  price: string;
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
  courier: QuoteCourier | null;
  origin: AddressGuide;
  destination: AddressGuide;
}
