import {
  CalculateTotalQuotesT1Response,
  T1Courier,
  T1GetQuoteResponse,
} from './t1.interface';
import { GetQuoteT1Dto } from './dtos/t1.dtos';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import {
  GetQuoteData,
  QuoteCourier,
  QuoteTypeSevice,
} from '@/quotes/quotes.interface';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import { calculateQuoteMargin } from '@/quotes/quotes.utils';

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

export const calculateTotalQuotesT1 = ({
  quotes,
  config,
  messages,
}: {
  quotes: GetQuoteData[];
  config: GlobalConfigsDoc;
  messages: string[];
}): CalculateTotalQuotesT1Response => {
  // Find if the provider with GE exists
  const providerT1 = config.providers.find(
    (provider) => provider.name === 'TONE',
  );

  // If it does not exist, then return the quotes with the default profit margin
  if (!providerT1) {
    messages.push('T1 provider not found in global config');
    const updatedQuotes = quotes.map((quote) =>
      calculateQuoteMargin({
        quote,
        margin: config.globalMarginProfit,
        isDefault: true,
      }),
    );
    return {
      quotes: updatedQuotes,
      messages,
    };
  }

  const couriers = providerT1?.couriers;
  const updatedQuotes = quotes.map((quote) => {
    // Check if the courier matches with the one in the config
    const courier = couriers?.find((c) => c.name === quote.courier);

    // If it does not exist, return the quote with the default profit margin
    if (!courier) {
      // NOTE: I'm not logging if the courier was not found as the courier is either type QuoteTypeSevice or null.
      // the couriers that are new, will not be detected on this flow.
      return calculateQuoteMargin({
        quote,
        margin: config.globalMarginProfit,
        isDefault: true,
      });
    }

    return calculateQuoteMargin({
      quote,
      margin: courier.profitMargin,
      isDefault: false,
    });
  });
  return {
    quotes: updatedQuotes,
    messages,
  };
};

export const formatT1QuoteData = (data: T1GetQuoteResponse): GetQuoteData[] => {
  return data?.result.map((item) => ({
    id: item.id,
    service: Object.keys(item.cotizacion.servicios)[0], // Assuming you want the first service
    total:
      item.cotizacion.servicios[Object.keys(item.cotizacion.servicios)[0]]
        .costo_total,
    // TODO: Change this when we set the calculations profit margin it for T1
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
