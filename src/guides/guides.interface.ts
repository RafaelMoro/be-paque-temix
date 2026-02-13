import { GeneralResponse, GetGuideResponse } from '@/global.interface';

export interface GetQuoteDataResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  messages: string[];
  data: {
    guides: GetGuideResponse[];
  };
}
