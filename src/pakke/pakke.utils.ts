import { GetQuoteGEDto } from '@/guia-envia/dtos/guia-envia.dtos';
import { PakkeFormattedQuote, PakkeGetQuoteResponse } from './pakke.interface';
import { GetQuotePakkeDto } from './dtos/pakke.dto';

export const convertPayloadToPakkeDto = (
  payload: GetQuoteGEDto,
): GetQuotePakkeDto => {
  const { origen, destino, peso, largo, alto, ancho } = payload;
  return {
    ZipCodeFrom: origen,
    ZipCodeTo: destino,
    Parcel: {
      Weight: peso,
      Width: ancho,
      Height: alto,
      Length: largo,
    },
  };
};

export const formatPakkeQuotes = (
  data: PakkeGetQuoteResponse,
): PakkeFormattedQuote[] => {
  return (data?.Pakke ?? []).map((item) => ({
    id: `${item.CourierCode}-${item.CourierName}-${item.CourierServiceId}`,
    servicio: `${item.CourierName} ${item.CourierServiceName}`,
    total: item.TotalPrice,
    source: 'Pkk',
  }));
};
