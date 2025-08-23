import { GeneralResponse } from '@/global.interface';

export type TypeProfitMargin = 'percentage' | 'absolute';

export interface ManageProfitMarginData {
  value: number;
  type: TypeProfitMargin;
}

export interface ManageProfitMarginResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    profitMargin: ManageProfitMarginData;
  };
}
