export interface GeneralResponse {
  version: string;
  data: unknown;
  message: string | null;
  error: string | object;
}

export type QuoteSource = 'Pkk' | 'GE' | 'TONE' | 'Mn';

export interface GetQuoteData {
  id: string | number;
  service: string;
  total: number;
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
