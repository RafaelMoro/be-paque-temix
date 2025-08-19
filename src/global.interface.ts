export interface GeneralResponse {
  version: string;
  data: unknown;
  message: string | null;
  error: string | object;
}

export type QuoteSource = 'Pkk' | 'GE' | 'TONE' | 'Mn';

export type QuoteTypeSevice = 'standard' | 'nextDay';

export interface GetQuoteData {
  id: string | number;
  service: string;
  total: number;
  // TODO: Change this mandatory
  typeService?: QuoteTypeSevice | null;
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
