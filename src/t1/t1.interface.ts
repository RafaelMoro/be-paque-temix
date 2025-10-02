export type T1Courier = 'EXPRESS' | 'DHL' | 'FEDEX' | 'UPS' | '99MIN' | 'AMPM';

export interface ShippingService {
  servicio: string;
  tipo_servicio: string;
  total_paquetes: number;
  costo_total: number;
  fecha_claro_entrega: string;
  fecha_mensajeria_entrega: string;
  dias_entrega: number;
  negociacion_id: number;
  moneda: string;
  peso: number;
  peso_volumetrico: number;
  peso_unidades: string;
  largo: number;
  ancho: number;
  alto: number;
  dimensiones: string;
  token: string;
}

export interface T1QuoteServices {
  [serviceName: string]: ShippingService;
}

export interface T1QuoteInfo {
  success: boolean;
  message: string;
  code_response: number;
  servicios: T1QuoteServices;
}

export interface T1QuoteResult {
  id: number;
  clave: T1Courier;
  comercio: string;
  seguro: boolean;
  cotizacion: T1QuoteInfo;
}

export interface T1GetQuoteResponse {
  success: boolean;
  message: string;
  result: T1QuoteResult[];
}

export interface T1ExternalCreateGuideRequest {
  contenido: string; // Max 25 characters
  // Origin
  nombre_origen: string; // Max 25 characters
  apellidos_origen: string; // Max 25 characters
  email_origen: string; // Max 35 characters
  calle_origen: string; // Max 35 characters
  numero_origen: string; // Max 15 characters
  colonia_origen: string; // Max 35 characters
  telefono_origen: string; // Max 10 characters
  estado_origen: string; // Max 35 characters
  municipio_origen: string; // Max 35 characters
  referencias_origen: string; // Max 35 characters

  // Destination
  nombre_destino: string; // Max 25 characters
  apellidos_destino: string; // Max 25 characters
  email_destino: string; // Max 35 characters
  calle_destino: string; // Max 35 characters
  numero_destino: string; // Max 15 characters
  colonia_destino: string; // Max 35 characters
  telefono_destino: string; // Max 10 characters
  estado_destino: string; // Max 35 characters
  municipio_destino: string; // Max 35 characters
  referencias_destino: string; // Max 35 characters

  // Rest
  generar_recoleccion: boolean;
  tiene_notificacion: boolean;
  origen_guia: string;
  comercio_id: string;
  token_quote: string;
}

export interface T1CreateGuideRequest {
  parcel: {
    content: string;
  };
  origin: {
    name: string;
    lastName: string;
    street1: string;
    neighborhood: string;
    external_number: string;
    town: string; // (Municipio)
    state: string;
    phone: string;
    email: string;
    reference: string;
  };
  destination: {
    name: string;
    lastName: string;
    street1: string;
    neighborhood: string;
    external_number: string;
    town: string; // (Municipio)
    state: string;
    phone: string;
    email: string;
    reference: string;
  };
}
