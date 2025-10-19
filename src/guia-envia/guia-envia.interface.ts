import { GeneralResponse } from '@/global.interface';

/**
 * Represents a quote object as returned by the Guia Envia API.
 */
export interface GEQuote {
  id: string;
  servicio: string;
  total: number;
}

export interface GEFormattedQuote extends GEQuote {
  source: 'GE';
}

export interface GetNeighborhoodInfoPayload {
  zipcode: string;
}

export interface NeighborhoodGE {
  colonia: string;
  cp: string;
  estado: string;
  ciudad: string;
}

export interface Neighborhood {
  neighborhood: string;
  zipcode: string;
  state: string;
  city: string;
}

export interface GetAddressInfoResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    neighborhoods: Neighborhood[];
  };
}
