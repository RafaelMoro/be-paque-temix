import {
  T1Courier,
  T1GetQuoteResponse,
  T1CreateGuideRequest,
  T1ExternalCreateGuideRequest,
} from './t1.interface';
import { GetQuoteT1Dto } from './dtos/t1.dtos';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import {
  GetQuoteData,
  QuoteCourier,
  QuoteTypeSevice,
} from '@/quotes/quotes.interface';

const NEXT_DAY_REGEX = /d[íi]a siguiente|mismo d[íi]a|express/i;
const STANDARD_REGEX = /est[áa]ndar|2 dias/i;

export const getTypeServiceT1 = (
  tipo_servicio: string,
): QuoteTypeSevice | null => {
  const serviceLowerCase = tipo_servicio.toLowerCase();

  if (NEXT_DAY_REGEX.test(serviceLowerCase)) return 'nextDay';
  if (STANDARD_REGEX.test(serviceLowerCase)) return 'standard';
  return null;
};

export const getT1Courier = (clave: T1Courier): QuoteCourier | null => {
  switch (clave) {
    case 'EXPRESS':
      return 'Paquetexpress';
    case 'DHL':
      return 'DHL';
    case 'FEDEX':
      return 'Fedex';
    case 'UPS':
      return 'UPS';
    case '99MIN':
      return 'NextDay';
    case 'AMPM':
      return 'AMPM';
    default:
      return null;
  }
};

export const formatT1QuoteData = (data: T1GetQuoteResponse): GetQuoteData[] => {
  return data?.result.map((item) => ({
    id: item.id,
    service: Object.keys(item.cotizacion.servicios)[0], // Assuming you want the first service
    total:
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .costo_total,
    qBaseRef:
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .costo_total,
    qAdjFactor: 0,
    qAdjBasis: 0,
    qAdjMode: 'P',
    qAdjSrcRef: 'default',
    typeService: getTypeServiceT1(
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .tipo_servicio,
    ),
    courier: getT1Courier(item.clave),
    source: 'TONE',
  }));
};

/**
 * Formats the payload for T1 quote request.
 */
export const formatPayloadT1 = ({
  payload,
  storeId,
}: {
  payload: GetQuoteDto;
  storeId: string;
}): GetQuoteT1Dto => {
  const {
    originPostalCode,
    destinationPostalCode,
    weight,
    length,
    height,
    width,
  } = payload;
  return {
    codigo_postal_origen: originPostalCode,
    codigo_postal_destino: destinationPostalCode,
    peso: weight,
    largo: length,
    alto: height,
    ancho: width,
    dias_embarque: 0, // Default value, can be changed as needed
    seguro: false, // Default value, can be changed as needed
    valor_paquete: 0, // Default value, can be changed as needed
    tipo_paquete: 0, // Default value, can be changed as needed
    comercio_id: storeId, // This should be set dynamically based on your application logic
  };
};

export const formatPayloadCreateGuideT1 = ({
  payload,
  quoteToken,
  storeId,
}: {
  payload: T1CreateGuideRequest;
  quoteToken: string;
  storeId: string;
}): T1ExternalCreateGuideRequest => {
  return {
    contenido: payload.parcel.content.substring(0, 25), // Max 25 characters

    // Origin fields
    nombre_origen: payload.origin.name.substring(0, 25), // Max 25 characters
    apellidos_origen: payload.origin.lastName.substring(0, 25), // Max 25 characters
    email_origen: payload.origin.email.substring(0, 35), // Max 35 characters
    calle_origen: payload.origin.street1.substring(0, 35), // Max 35 characters
    numero_origen: payload.origin.external_number.substring(0, 15), // Max 15 characters
    colonia_origen: payload.origin.neighborhood.substring(0, 35), // Max 35 characters
    telefono_origen: payload.origin.phone.substring(0, 10), // Max 10 characters
    estado_origen: payload.origin.state.substring(0, 35), // Max 35 characters
    municipio_origen: payload.origin.town.substring(0, 35), // Max 35 characters
    referencias_origen: payload.origin.reference.substring(0, 35), // Max 35 characters

    // Destination fields
    nombre_destino: payload.destination.name.substring(0, 25), // Max 25 characters
    apellidos_destino: payload.destination.lastName.substring(0, 25), // Max 25 characters
    email_destino: payload.destination.email.substring(0, 35), // Max 35 characters
    calle_destino: payload.destination.street1.substring(0, 35), // Max 35 characters
    numero_destino: payload.destination.external_number.substring(0, 15), // Max 15 characters
    colonia_destino: payload.destination.neighborhood.substring(0, 35), // Max 35 characters
    telefono_destino: payload.destination.phone.substring(0, 10), // Max 10 characters
    estado_destino: payload.destination.state.substring(0, 35), // Max 35 characters
    municipio_destino: payload.destination.town.substring(0, 35), // Max 35 characters
    referencias_destino: payload.destination.reference.substring(0, 35), // Max 35 characters

    // Rest fields
    generar_recoleccion: false, // Default value - can be made configurable
    tiene_notificacion: true, // Default value - can be made configurable
    origen_guia: 't1envios',
    comercio_id: storeId,
    token_quote: quoteToken,
  };
};
