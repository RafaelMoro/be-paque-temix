import { T1GetQuoteResponse } from './t1.interface';
import { GetQuoteT1Dto } from './dtos/t1.dtos';
import { GetQuoteDto } from '@/app.dto';
import { GetQuoteData, QuoteTypeSevice } from '@/global.interface';

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

export const formatT1QuoteData = (data: T1GetQuoteResponse): GetQuoteData[] => {
  return data?.result.map((item) => ({
    id: item.id,
    service: Object.keys(item.cotizacion.servicios)[0], // Assuming you want the first service
    total:
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .costo_total,
    typeService: getTypeServiceT1(
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .tipo_servicio,
    ),
    source: 'TONE',
  }));
};

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
