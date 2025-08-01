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
  clave: string;
  comercio: string;
  seguro: boolean;
  cotizacion: T1QuoteInfo;
}

export interface T1GetQuoteResponse {
  success: boolean;
  message: string;
  result: T1QuoteResult[];
}

// TODO: Change this to english
export interface T1FormattedQuote {
  id: number;
  servicio: string;
  total: number;
  source: 'T1';
}
