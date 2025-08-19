import { QuoteTypeSevice } from './global.interface';

export const getTypeService = (
  service: string,
): QuoteTypeSevice | undefined => {
  if (service === 'nextDay') return 'nextDay';
  return 'standard';
};
