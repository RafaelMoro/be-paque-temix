import { QuoteTypeSevice } from './global.interface';

export const getTypeService = (service: string): QuoteTypeSevice => {
  if (service === 'nextDay') return 'nextDay';
  return 'standard';
};
