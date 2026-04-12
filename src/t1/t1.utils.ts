import {
  T1Courier,
  T1GetQuoteResponse,
  T1CreateGuideRequest,
  T1ExternalCreateGuideRequest,
  T1ExternalCreateGuideResponse,
  T1GetGuideResponse,
} from './t1.interface';
import { GetQuoteT1Dto } from './dtos/t1.dtos';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import {
  GetQuoteData,
  QuoteCourier,
  QuoteTypeSevice,
} from '@/quotes/quotes.interface';
import {
  GlobalCreateGuideResponse,
  GetGuideResponse,
  AddressGuide,
} from '@/global.interface';

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
    id: item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
      .token,
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
  notifyMe = false,
}: {
  payload: T1CreateGuideRequest;
  quoteToken: string;
  storeId: string;
  notifyMe?: boolean;
}): T1ExternalCreateGuideRequest => {
  return {
    contenido: payload.parcel.content, // Max 25 characters

    // Origin fields
    nombre_origen: payload.origin.name, // Max 25 characters
    apellidos_origen: payload.origin.lastName, // Max 25 characters
    email_origen: payload.origin.email, // Max 35 characters
    calle_origen: payload.origin.street1, // Max 35 characters
    numero_origen: payload.origin.external_number, // Max 15 characters
    colonia_origen: payload.origin.neighborhood, // Max 35 characters
    telefono_origen: payload.origin.phone, // Max 10 characters
    estado_origen: payload.origin.state, // Max 35 characters
    municipio_origen: payload.origin.town, // Max 35 characters
    referencias_origen: payload.origin.reference, // Max 35 characters

    // Destination fields
    nombre_destino: payload.destination.name, // Max 25 characters
    apellidos_destino: payload.destination.lastName, // Max 25 characters
    email_destino: payload.destination.email, // Max 35 characters
    calle_destino: payload.destination.street1, // Max 35 characters
    numero_destino: payload.destination.external_number, // Max 15 characters
    colonia_destino: payload.destination.neighborhood, // Max 35 characters
    telefono_destino: payload.destination.phone, // Max 10 characters
    estado_destino: payload.destination.state, // Max 35 characters
    municipio_destino: payload.destination.town, // Max 35 characters
    referencias_destino: payload.destination.reference, // Max 35 characters

    // Rest fields
    generar_recoleccion: false, // Default value - can be made configurable
    tiene_notificacion: notifyMe,
    origen_guia: 't1envios',
    comercio_id: storeId,
    token_quote: quoteToken,
  };
};

/**
 * Transforms T1 external create guide response to standardized global response format
 */
export const formatT1CreateGuideResponse = (
  t1Response: T1ExternalCreateGuideResponse,
): GlobalCreateGuideResponse => {
  return {
    trackingNumber: t1Response.detail.guia,
    carrier: t1Response.detail.paqueteria,
    price: t1Response.detail.costo.toString(),
    guideLink: t1Response.detail.link_guia,
    labelUrl: t1Response.detail.link_guia, // Using the same link for both guide and label
    source: 'TONE',
    file: t1Response.detail.file,
  };
};

/**
 * Maps T1 carrier string name to QuoteCourier enum
 */
const mapT1CarrierNameToCourier = (
  carrierName: string,
): QuoteCourier | null => {
  const normalized = carrierName.toUpperCase();
  if (normalized.includes('FEDEX')) return 'Fedex';
  if (normalized.includes('DHL')) return 'DHL';
  if (normalized.includes('UPS')) return 'UPS';
  if (normalized.includes('EXPRESS')) return 'Paquetexpress';
  if (normalized.includes('99MIN')) return 'NextDay';
  if (normalized.includes('AMPM')) return 'AMPM';
  return null;
};

/**
 * Parses T1 address string into AddressGuide structure
 * T1 provides address as a single string, so we do our best to parse it
 */
const parseT1AddressString = (
  addressString: string,
  name: string,
): AddressGuide => {
  // T1 typically formats addresses but we may need to handle various formats
  // For now, we'll return a basic structure with the full string in the street field
  return {
    name: name || '',
    alias: '',
    street: addressString || '',
    streetNumber: '',
    neighborhood: '',
    city: '',
    state: '',
  };
};

/**
 * Transforms T1 GetGuide response to GetGuideResponse format
 * Handles the transformation of guide data from T1's structure to the standardized format
 */
export const formatT1GetGuideResponse = (
  t1Response: T1GetGuideResponse,
): GetGuideResponse[] => {
  if (!t1Response?.detail?.data || !Array.isArray(t1Response.detail.data)) {
    return [];
  }

  return t1Response.detail.data.map((guideData) => ({
    // Fields from GlobalCreateGuideResponse
    trackingNumber: guideData.guia || '',
    shipmentNumber: guideData.num_orden?.toString() || null,
    source: 'TONE',
    carrier: guideData.mensajeria || '',
    price: guideData.costo_total || '0',
    guideLink: guideData.link_documento || null,
    labelUrl: guideData.link_documento || null,
    file: null,
    content: null,
    startDate: null,

    // Additional fields specific to GetGuideResponse
    status: guideData.estatus_generico || guideData.estatus || '',
    order: guideData.num_orden?.toString() || null,
    guide: guideData.guia || null,
    trackingLink: guideData.link_rastreo || null,
    shippingLink: guideData.link_documento || null,
    courier: mapT1CarrierNameToCourier(guideData.mensajeria),
    origin: null, // T1 does not provide origin information in getGuides response
    destination: parseT1AddressString(
      guideData.direccion_destino,
      guideData.nombre_destino,
    ),
  }));
};
