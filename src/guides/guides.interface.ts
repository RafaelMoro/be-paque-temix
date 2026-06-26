import { GeneralResponse, GetGuideResponse } from '@/global.interface';

export interface GetGuidesDataResponse extends Omit<
  GeneralResponse,
  'data' | 'error'
> {
  error: null;
  messages: string[];
  data: {
    guides: GetGuideResponse[];
  };
}

export interface GetGuideDataResponse extends Omit<
  GeneralResponse,
  'data' | 'error'
> {
  error: null;
  messages: string[];
  data: {
    guide: GetGuideResponse;
  };
}

export interface ProviderResult {
  success: boolean;
  externalId?: string;
  labelUrl?: string;
  error?: string;
  errorCode?: string;
  response?: Record<string, unknown>;
}

export interface RetryPayload {
  provider: 'GE' | 'TONE' | 'Pkk' | 'Mn';
  quoteId: string;
  origin: {
    alias?: string;
    name?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    company?: string;
    street1?: string;
    street2?: string;
    isResidential?: boolean;
    external_number?: string;
    neighborhood?: string;
    city?: string;
    town?: string;
    state?: string;
    zipcode?: string;
    country?: string;
    reference?: string;
  };
  destination: {
    alias?: string;
    name?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    company?: string;
    street1?: string;
    street2?: string;
    isResidential?: boolean;
    external_number?: string;
    neighborhood?: string;
    city?: string;
    town?: string;
    state?: string;
    zipcode?: string;
    country?: string;
    reference?: string;
  };
  parcel: {
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
    content?: string;
    satProductId?: string;
    value?: number;
    quantity?: number;
  };
  notifyMe: boolean;
}

export interface FormattedGuideData {
  kraftId: string;
  externalId?: string;
  status: string;
  provider: string;
  isProviderTrackingSynced: boolean;
  labelUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  failureInfo?: {
    errorDetails: string;
    errorCode: string;
    timestamp: Date;
  };
}
