import {
  GeneralResponse,
  GetGuideResponse,
  GlobalCreateGuideResponse,
} from '@/global.interface';
import { GuideDataDto } from './dtos/guides-db-responses.dto';

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
  guide?: GlobalCreateGuideResponse | null;
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
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    content?: string;
    satProductId?: string;
    value?: number;
    quantity?: number;
  };
  notifyMe: boolean;
}

// ponytail: DTOs are the source of truth for response shape. When a service
// needs a type for data construction, derive it from the DTO via type alias
// (e.g. `export type FormattedGuideData = GuideDataDto;`) so adding/removing
// fields in the DTO doesn't require keeping a parallel interface in sync.
// Same pattern as `export type GuideDoc = Guide;` in guide.entity.ts.
export type FormattedGuideData = GuideDataDto;
