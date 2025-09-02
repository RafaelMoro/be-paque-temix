import { GeneralResponse } from '@/global.interface';
import { QUOTE_COURIER, QUOTE_SOURCE } from './quotes.constants';

export type QuoteSource = (typeof QUOTE_SOURCE)[number];

export type QuoteTypeSevice = 'standard' | 'nextDay';

// P of percentage or A for Absolute
export type QuoteAdjustmentMode = 'P' | 'A';

// Source of the profit margin that could be: default (from the global margin profit) | custom (profit margin set with courier and provider)
export type QuoteAdjustmentSourceReference = 'default' | 'custom';

export type QuoteCourier = (typeof QUOTE_COURIER)[number];

export interface GetQuoteData {
  id: string | number;
  service: string;
  total: number;
  // TODO: Change this new props to mandatory once we have finished this feature
  // Base price of the quote
  qBaseRef?: number;
  // Sum of profit margin value and total
  qAdjFactor?: number;
  // Profit margin value
  qAdjBasis?: number;
  // Type of the profit margin that could be: P | A
  qAdjMode?: QuoteAdjustmentMode;
  // Source of the profit margin that could be: default | custom
  qAdjSrcRef?: QuoteAdjustmentSourceReference;
  typeService: QuoteTypeSevice | null;
  courier: QuoteCourier | null;
  source: QuoteSource;
}

export interface GetQuoteDataResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  messages: string[];
  data: {
    quotes: GetQuoteData[];
  };
}

export interface CalculateTotalQuotesResponse {
  quotes: GetQuoteData[];
  messages: string[];
}

export interface ExtApiGetQuoteResponse {
  quotes: GetQuoteData[];
  messages: string[];
}
