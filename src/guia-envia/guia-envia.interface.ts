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

export interface GetServiceGEResponse {
  id: string;
  nombre: string;
}

//#region Get Neighborhood info GE

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

//#endregion

//#region Create address
export interface ExtCreateAddressPayload {
  cp: string;
  colonia: string;
  ciudad: string;
  estado: string;
  nombre: string;
  email: string;
  telefono: string;
  empresa: string;
  rfc: string;
  calle: string;
  numero: string;
  referencia: string;
  alias: string;
}

export interface CreateAddressPayload {
  zipcode: string;
  neighborhood: string;
  city: string;
  state: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  rfc: string;
  street: string;
  number: string;
  reference: string;
  alias: string;
}

export interface ExtAddressGEResponse {
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

export interface CreateAddressResponseGE {
  zipcode: string;
  neighborhood: string;
  city: string;
  state: string;
  street: string;
  number: string;
  reference: string;
  alias: string;
}

//#endregion

//#region Create guide

export interface ExtCreateGuideGEPayload {
  origen_alias: string;
  destino_alias: string;
  peso: string;
  largo: string;
  alto: string;
  ancho: string;
  sat_id: string;
  contenido: string;
  servicio_id: string;
}

export interface CreateGuideGeRequest {
  quoteId: string;
  parcel: {
    length: string;
    width: string;
    height: string;
    weight: string;
    content: string;
    satProductId: string;
  };
  origin: {
    alias: string;
  };
  destination: {
    alias: string;
  };
}

export interface ExtGEShipment {
  envio_id: string;
  servicio: string;
  costo: string;
  guia: string;
}

export interface ExtGEGuide {
  // Origin zipcode
  origen: string;
  // Destination zipcode
  destino: string;
  // Name of the sender
  remitente: string;
  // Name of the recipient
  destinatario: string;
  numero_guia: string;
  url: string;
}

export interface ExtCreateGuideGEResponse {
  origen: ExtAddressGEResponse;
  destino: ExtAddressGEResponse;
  envio: ExtGEShipment[];
  guias: ExtGEGuide[];
}
