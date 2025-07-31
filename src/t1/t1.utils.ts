import { GetQuoteGEDto } from '@/guia-envia/dtos/guia-envia.dtos';
import { T1FormattedQuote, T1GetQuoteResponse } from './t1.interface';
import { GetQuoteT1Dto } from './dtos/t1.dtos';

export const formatT1QuoteData = (
  data: T1GetQuoteResponse,
): T1FormattedQuote[] => {
  return data?.result.map((item) => ({
    id: item.id,
    servicio: Object.keys(item.cotizacion.servicios)[0], // Assuming you want the first service
    total:
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .costo_total,
    source: 'T1',
  }));
};

export const formatPayload = ({
  payload,
  storeId,
}: {
  payload: GetQuoteGEDto;
  storeId: string;
}): GetQuoteT1Dto => {
  const { origen, destino, peso, largo, alto, ancho } = payload;
  return {
    codigo_postal_origen: origen,
    codigo_postal_destino: destino,
    peso: Number(peso),
    largo: Number(largo),
    alto: Number(alto),
    ancho: Number(ancho),
    dias_embarque: 0, // Default value, can be changed as needed
    seguro: false, // Default value, can be changed as needed
    valor_paquete: 0, // Default value, can be changed as needed
    tipo_paquete: 0, // Default value, can be changed as needed
    comercio_id: storeId, // This should be set dynamically based on your application logic
  };
};
