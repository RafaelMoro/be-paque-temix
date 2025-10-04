export type T1Courier = 'EXPRESS' | 'DHL' | 'FEDEX' | 'UPS' | '99MIN' | 'AMPM';

export interface T1FormattedPayload {
  codigo_postal_origen: string;
  codigo_postal_destino: string;
  peso: number;
  largo: number;
  alto: number;
  ancho: number;
  dias_embarque: number;
  seguro: boolean;
  valor_paquete: number;
  tipo_paquete: number;
  comercio_id: string;
}

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

export interface T1GetTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
}
