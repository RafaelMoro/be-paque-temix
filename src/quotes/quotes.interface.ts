import { GeneralResponse } from '@/global.interface';

export type QuoteSource = 'Pkk' | 'GE' | 'TONE' | 'Mn';

export type QuoteTypeSevice = 'standard' | 'nextDay';

export type QuoteCourier =
  | 'Estafeta'
  | 'DHL'
  | 'UPS'
  | 'Fedex'
  | 'Paquetexpress'
  | 'AMPM'
  // Corresponding to 99 or 99MIN
  | 'NextDay'
  | 'Tres guerras';

export interface GetQuoteData {
  id: string | number;
  service: string;
  total: number;
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
