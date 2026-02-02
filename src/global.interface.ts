import { ProviderSource } from './quotes/quotes.interface';

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
