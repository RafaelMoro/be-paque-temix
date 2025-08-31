import { GeneralResponse } from '@/global.interface';

export type TypeProfitMargin = 'percentage' | 'absolute';

export interface ProfitMargin {
  value: number;
  type: TypeProfitMargin;
}

export interface CourierGlobalConfig {
  name: string;
  profitMargin: ProfitMargin;
}

export interface ProviderGlobalConfig {
  name: string;
  couriers: CourierGlobalConfig[];
}

export interface ProfitMarginResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    providers: ProviderGlobalConfig[];
  };
}
