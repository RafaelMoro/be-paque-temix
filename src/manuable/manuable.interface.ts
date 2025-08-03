export interface GetManuableSessionResponse {
  id: string;
  token: string;
  email: string;
}

export interface ManuableQuote {
  service: string;
  currency: string;
  uuid: string;
  additional_fees: never[];
  zone: number;
  total_amount: string;
  carrier: string;
  cancellable: boolean;
  shipping_type: string;
  lead_time: string;
}

export interface FetchManuableQuotesResponse {
  data: ManuableQuote[];
}

// TODO: Change this to english
export interface ManuableFormattedQuote {
  id: string;
  servicio: string;
  total: string;
  source: 'Mn';
}

export interface GetManuableQuoteResponse {
  message: string;
  quotes: ManuableFormattedQuote[];
}
