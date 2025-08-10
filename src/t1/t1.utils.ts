import { T1GetQuoteResponse } from './t1.interface';
import { GetQuoteT1Dto } from './dtos/t1.dtos';
import { GetQuoteDto } from '@/app.dto';
import { GetQuoteData } from '@/global.interface';

export const formatT1QuoteData = (data: T1GetQuoteResponse): GetQuoteData[] => {
  return data?.result.map((item) => ({
    id: item.id,
    service: Object.keys(item.cotizacion.servicios)[0], // Assuming you want the first service
    total:
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .costo_total,
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
