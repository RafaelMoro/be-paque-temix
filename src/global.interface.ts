export interface GeneralResponse {
  version: string;
  data: unknown;
  message: string | null;
  error: string | object;
}

export interface GlobalCreateGuideResponse {
  trackingNumber: string;
  carrier: string;
  price: string;
  guideLink: string | null;
  labelUrl: string | null;
  file: string | null;
}
