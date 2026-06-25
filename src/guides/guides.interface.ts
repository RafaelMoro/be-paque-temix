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
