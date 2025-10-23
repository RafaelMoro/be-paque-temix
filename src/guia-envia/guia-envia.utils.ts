import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import {
  GEQuote,
  NeighborhoodGE,
  Neighborhood,
  CreateAddressPayload,
  ExtCreateAddressPayload,
  ExtAddressGEResponse,
  CreateAddressResponseGE,
  CreateGuideGeRequest,
  ExtCreateGuideGEPayload,
} from './guia-envia.interface';
import { GetQuoteGEDto } from './dtos/guia-envia.dtos';
import {
  GetQuoteData,
  QuoteCourier,
  QuoteTypeSevice,
} from '@/quotes/quotes.interface';

const NEXT_DAY_REGEX = /expres/i;
const STANDARD_REGEX = /terrestre/i;
const EXCLUDE_REGEX = /paquetexpres/i;

export const getTypeServiceGe = (service: string): QuoteTypeSevice | null => {
  const serviceLowerCase = service.toLowerCase();

  if (EXCLUDE_REGEX.test(serviceLowerCase)) return null;
  if (NEXT_DAY_REGEX.test(serviceLowerCase)) return 'nextDay';
  if (STANDARD_REGEX.test(serviceLowerCase)) return 'standard';
  return null;
};

export const getGeCourier = (service: string): QuoteCourier | null => {
  const serviceLowerCase = service.toLowerCase();

  if (serviceLowerCase.includes('estafeta')) return 'Estafeta';
  if (serviceLowerCase.includes('dhl')) return 'DHL';
  if (serviceLowerCase.includes('ups')) return 'UPS';
  if (serviceLowerCase.includes('fedex')) return 'Fedex';

  return null;
};

export const formatQuotesGE = (quotes: GEQuote[]): GetQuoteData[] =>
  quotes.map((quote) => ({
    id: quote.id,
    service: quote.servicio,
    total: quote.total,
    typeService: getTypeServiceGe(quote.servicio),
    courier: getGeCourier(quote.servicio),
    source: 'GE',
  }));

export const formatPayloadGE = (payload: GetQuoteDto): GetQuoteGEDto => {
  return {
    origen: payload.originPostalCode,
    destino: payload.destinationPostalCode,
    peso: String(payload.weight),
    largo: String(payload.length),
    alto: String(payload.height),
    ancho: String(payload.width),
  };
};

export const formatNeighborhoodGE = (
  neighborhoods: NeighborhoodGE[],
): Neighborhood[] => {
  return neighborhoods.map((neighborhood) => ({
    neighborhood: neighborhood.colonia,
    zipcode: neighborhood.cp,
    state: neighborhood.estado,
    city: neighborhood.ciudad,
  }));
};

export const formatCreateAddressPayloadGE = (
  payload: CreateAddressPayload,
): ExtCreateAddressPayload => {
  return {
    cp: payload.zipcode,
    colonia: payload.neighborhood,
    ciudad: payload.city,
    estado: payload.state,
    nombre: payload.name,
    email: payload.email,
    telefono: payload.phone,
    empresa: payload.company,
    rfc: payload.rfc,
    calle: payload.street,
    numero: payload.number,
    referencia: payload.reference,
    alias: payload.alias,
  };
};

export const formatCreateAddressResponseGE = (
  response: ExtAddressGEResponse,
): CreateAddressResponseGE => {
  return {
    zipcode: response.cp,
    neighborhood: response.colonia,
    city: response.ciudad,
    state: response.estado,
    street: response.calle,
    number: response.numero,
    reference: response.referencia,
    alias: response.alias,
  };
};

export const formatCreateGuidePayloadGE = (
  payload: CreateGuideGeRequest,
): ExtCreateGuideGEPayload => {
  return {
    origen_alias: payload.origin.alias,
    destino_alias: payload.destination.alias,
    peso: payload.parcel.weight,
    largo: payload.parcel.length,
    alto: payload.parcel.height,
    ancho: payload.parcel.width,
    sat_id: payload.parcel.satProductId,
    contenido: payload.parcel.content,
    servicio_id: payload.quoteId,
  };
};
