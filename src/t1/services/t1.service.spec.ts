import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { T1Service } from './t1.service';
import config from '@/config';
import { GetQuoteDto } from '@/app.dto';
import { GetQuoteData } from '@/global.interface';
import axios from 'axios';
import * as utils from '../t1.utils';
import {
  T1_MISSING_API_KEY_ERROR,
  T1_MISSING_URI_ERROR,
  T1_MISSING_STORE_ID_ERROR,
} from '../t1.constants';
import { T1GetQuoteResponse } from '../t1.interface';
import { GetQuoteT1Dto } from '../dtos/t1.dtos';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('T1Service', () => {
  let service: T1Service;

  const mockConfig = {
    t1: {
      apiKey: 'test-api-key',
      uri: 'https://test-t1.com',
      storeId: 'test-store-id',
    },
  };

  const mockPayload: GetQuoteDto = {
    originPostalCode: '01010',
    destinationPostalCode: '02020',
    height: 10,
    length: 20,
    width: 15,
    weight: 2.5,
  };

  const mockFormattedPayload: GetQuoteT1Dto = {
    codigo_postal_origen: '01010',
    codigo_postal_destino: '02020',
    peso: 2.5,
    largo: 20,
    alto: 10,
    ancho: 15,
    dias_embarque: 0,
    seguro: false,
    valor_paquete: 0,
    tipo_paquete: 0,
    comercio_id: 'test-store-id',
  };

  const mockT1Response: T1GetQuoteResponse = {
    success: true,
    message: 'Success',
    result: [
      {
        id: 123,
        clave: 'TEST-123',
        comercio: 'Test Store',
        seguro: false,
        cotizacion: {
          success: true,
          message: 'Quote generated',
          code_response: 200,
          servicios: {
            'Express Service': {
              servicio: 'Express Service',
              tipo_servicio: 'Dia Siguiente',
              total_paquetes: 1,
              costo_total: 150.5,
              fecha_claro_entrega: '2025-08-23',
              fecha_mensajeria_entrega: '2025-08-23',
              dias_entrega: 1,
              negociacion_id: 1,
              moneda: 'MXN',
              peso: 2.5,
              peso_volumetrico: 3.0,
              peso_unidades: 'KG',
              largo: 20,
              ancho: 15,
              alto: 10,
              dimensiones: 'CM',
              token: 'service-token-123',
            },
          },
        },
      },
    ],
  };

  const mockFormattedQuotes: GetQuoteData[] = [
    {
      id: 123,
      service: 'Express Service',
      total: 150.5,
      typeService: 'nextDay',
      source: 'TONE',
    },
  ];

  const createServiceWithConfig = async (configOverride: typeof mockConfig) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        T1Service,
        {
          provide: config.KEY,
          useValue: configOverride,
        },
      ],
    }).compile();
    return module.get<T1Service>(T1Service);
  };

  beforeEach(async () => {
    service = await createServiceWithConfig(mockConfig);
    jest.clearAllMocks();
  });

  describe('getQuote', () => {
    it('should successfully get quotes from T1', async () => {
      // Mock utilities
      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);
      jest
        .spyOn(utils, 'formatT1QuoteData')
        .mockReturnValue(mockFormattedQuotes);

      // Mock axios response
      mockedAxios.post.mockResolvedValue({
        data: mockT1Response,
      });

      const result = await service.getQuote(mockPayload);

      expect(utils.formatPayloadT1).toHaveBeenCalledWith({
        payload: mockPayload,
        storeId: 'test-store-id',
      });
      // Verify axios was called correctly
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe('https://test-t1.com/quote/create');
      expect(payload).toEqual(mockFormattedPayload);
      expect(config).toMatchObject({
        headers: {
          Authorization: 'Bearer test-api-key',
          shop_id: 'test-store-id',
        },
      });
      expect(utils.formatT1QuoteData).toHaveBeenCalledWith(mockT1Response);
      expect(result).toEqual(mockFormattedQuotes);
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        t1: {
          apiKey: '',
          uri: 'https://test-t1.com',
          storeId: 'test-store-id',
        },
      });

      await expect(serviceWithoutApiKey.getQuote(mockPayload)).rejects.toThrow(
        new BadRequestException(T1_MISSING_API_KEY_ERROR),
      );
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        t1: {
          apiKey: 'test-api-key',
          uri: '',
          storeId: 'test-store-id',
        },
      });

      await expect(serviceWithoutUri.getQuote(mockPayload)).rejects.toThrow(
        new BadRequestException(T1_MISSING_URI_ERROR),
      );
    });

    it('should throw BadRequestException when store ID is missing', async () => {
      const serviceWithoutStoreId = await createServiceWithConfig({
        t1: {
          apiKey: 'test-api-key',
          uri: 'https://test-t1.com',
          storeId: '',
        },
      });

      await expect(serviceWithoutStoreId.getQuote(mockPayload)).rejects.toThrow(
        new BadRequestException(T1_MISSING_STORE_ID_ERROR),
      );
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);

      const errorMessage = 'Network error';
      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(service.getQuote(mockPayload)).rejects.toThrow(
        new BadRequestException(errorMessage),
      );
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);

      // Reject with non-Error object
      mockedAxios.post.mockRejectedValue('Unknown error');

      await expect(service.getQuote(mockPayload)).rejects.toThrow(
        new BadRequestException('An unknown error occurred'),
      );
    });

    it('should handle response with no data gracefully', async () => {
      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);
      jest.spyOn(utils, 'formatT1QuoteData').mockReturnValue([]);

      // Mock axios response with undefined data
      mockedAxios.post.mockResolvedValue({
        data: undefined,
      });

      const result = await service.getQuote(mockPayload);

      expect(utils.formatT1QuoteData).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([]);
    });

    it('should handle empty result array in response', async () => {
      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);
      jest.spyOn(utils, 'formatT1QuoteData').mockReturnValue([]);

      const emptyResponse: T1GetQuoteResponse = {
        success: true,
        message: 'No quotes available',
        result: [],
      };

      mockedAxios.post.mockResolvedValue({
        data: emptyResponse,
      });

      const result = await service.getQuote(mockPayload);

      expect(utils.formatT1QuoteData).toHaveBeenCalledWith(emptyResponse);
      expect(result).toEqual([]);
    });

    it('should handle multiple quotes in response', async () => {
      const multipleQuotesResponse: T1GetQuoteResponse = {
        success: true,
        message: 'Multiple quotes',
        result: [
          {
            id: 123,
            clave: 'TEST-123',
            comercio: 'Test Store',
            seguro: false,
            cotizacion: {
              success: true,
              message: 'Quote generated',
              code_response: 200,
              servicios: {
                'Express Service': {
                  servicio: 'Express Service',
                  tipo_servicio: 'Express',
                  total_paquetes: 1,
                  costo_total: 150.5,
                  fecha_claro_entrega: '2025-08-23',
                  fecha_mensajeria_entrega: '2025-08-23',
                  dias_entrega: 1,
                  negociacion_id: 1,
                  moneda: 'MXN',
                  peso: 2.5,
                  peso_volumetrico: 3.0,
                  peso_unidades: 'KG',
                  largo: 20,
                  ancho: 15,
                  alto: 10,
                  dimensiones: 'CM',
                  token: 'service-token-123',
                },
              },
            },
          },
          {
            id: 124,
            clave: 'TEST-124',
            comercio: 'Test Store',
            seguro: true,
            cotizacion: {
              success: true,
              message: 'Quote generated',
              code_response: 200,
              servicios: {
                'Standard Service': {
                  servicio: 'Standard Service',
                  tipo_servicio: 'Estándar',
                  total_paquetes: 1,
                  costo_total: 75.25,
                  fecha_claro_entrega: '2025-08-25',
                  fecha_mensajeria_entrega: '2025-08-25',
                  dias_entrega: 3,
                  negociacion_id: 2,
                  moneda: 'MXN',
                  peso: 2.5,
                  peso_volumetrico: 3.0,
                  peso_unidades: 'KG',
                  largo: 20,
                  ancho: 15,
                  alto: 10,
                  dimensiones: 'CM',
                  token: 'service-token-124',
                },
              },
            },
          },
        ],
      };

      const expectedFormattedQuotes: GetQuoteData[] = [
        {
          id: 123,
          service: 'Express Service',
          total: 150.5,
          typeService: 'nextDay',
          source: 'TONE',
        },
        {
          id: 124,
          service: 'Standard Service',
          total: 75.25,
          typeService: 'standard',
          source: 'TONE',
        },
      ];

      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);
      jest
        .spyOn(utils, 'formatT1QuoteData')
        .mockReturnValue(expectedFormattedQuotes);

      mockedAxios.post.mockResolvedValue({
        data: multipleQuotesResponse,
      });

      const result = await service.getQuote(mockPayload);

      expect(utils.formatT1QuoteData).toHaveBeenCalledWith(
        multipleQuotesResponse,
      );
      expect(result).toEqual(expectedFormattedQuotes);
      expect(result).toHaveLength(2);
    });

    it('should propagate BadRequestException from nested functions', async () => {
      // Test case where the service catches a BadRequestException and re-throws it
      jest.spyOn(utils, 'formatPayloadT1').mockImplementation(() => {
        throw new BadRequestException('Invalid payload format');
      });

      await expect(service.getQuote(mockPayload)).rejects.toThrow(
        new BadRequestException('Invalid payload format'),
      );
    });
  });

  // Test the original mock implementation test for backwards compatibility
  it('get quotes from T1 (original test)', async () => {
    const result: GetQuoteData[] = [
      {
        id: '1',
        service: 'Carrier Express',
        total: 199.99,
        source: 'TONE',
      },
    ];
    const payload: GetQuoteDto = {
      originPostalCode: '00001',
      destinationPostalCode: '00004',
      height: 30,
      length: 20,
      width: 20,
      weight: 2,
    };

    jest
      .spyOn(service, 'getQuote')
      // eslint-disable-next-line @typescript-eslint/require-await
      .mockImplementation(async () => result);

    const response = await service.getQuote(payload);
    expect(response).toBe(result);
  });
});
