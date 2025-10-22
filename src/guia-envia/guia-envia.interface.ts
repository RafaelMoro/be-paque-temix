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

export interface ExtCreateAddressPayload {
  cp: string;
  colonia: string;
  ciudad: string;
  estado: string;
  otros_campos: string;
}

export interface CreateAddressPayload {
  zipcode: string;
  neighborhood: string;
  city: string;
  state: string;
  otherFields: string;
}

export interface ExtCreateAddressResponse {
  cp: string;
  ciudad: string;
  estado: string;
  colonia: string;
  nombre: string;
  email: string;
  telefono: string;
  empresa: string;
  rfc: string;
  calle: string;
  numero: string;
  referencia: string;
  alias: string;
  users: string;
  createdAt: string;
  updatedAt: string;
  id: string;
}
