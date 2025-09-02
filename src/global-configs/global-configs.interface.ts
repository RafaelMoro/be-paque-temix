import { GeneralResponse } from '@/global.interface';
import { PROFIT_MARGIN_TYPE } from './global-configs.constants';

export type TypeProfitMargin = (typeof PROFIT_MARGIN_TYPE)[number];

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

export interface GlobalProfitMarginResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    globalMarginProfit: ProfitMargin;
  };
}
