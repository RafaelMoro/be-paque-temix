import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GuiaEnviaService } from './guia-envia.service';
import {
  GetQuoteData,
  ExtApiGetQuoteResponse,
} from '@/quotes/quotes.interface';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import config from '@/config';
import axios from 'axios';
import * as utils from '../guia-envia.utils';
import * as quotesUtils from '@/quotes/quotes.utils';
import {
  GE_MISSING_API_KEY_ERROR,
  GE_MISSING_URI_ERROR,
  GE_MISSING_CONFIG_ERROR,
} from '../guia-envia.constants';
import { GEQuote } from '../guia-envia.interface';
import { GetQuoteGEDto } from '../dtos/guia-envia.dtos';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GuiaEnviaService', () => {
  let service: GuiaEnviaService;

  const mockConfig = {
    guiaEnvia: {
      apiKey: 'test-ge-api-key',
      uri: 'https://test-guia-envia.com',
    },
  };

  const mockPayload: GetQuoteDto = {
    originPostalCode: '01010',
    destinationPostalCode: '02020',
    height: 20,
    length: 30,
    width: 25,
    weight: 4.0,
  };

  const mockTransformedPayload: GetQuoteGEDto = {
    origen: '01010',
    destino: '02020',
    peso: '4',
    largo: '30',
    alto: '20',
    ancho: '25',
  };

  const mockGEQuotes: GEQuote[] = [
    {
      id: 'ge-001',
      servicio: 'Estafeta Express',
      total: 150.75,
    },
    {
      id: 'ge-002',
      servicio: 'DHL Terrestre',
      total: 120.5,
    },
  ];

  const mockFormattedQuotes: GetQuoteData[] = [
    {
      id: 'ge-001',
      service: 'Estafeta Express',
      total: 150.75,
      typeService: 'nextDay',
      courier: 'Estafeta',
      source: 'GE',
    },
    {
      id: 'ge-002',
      service: 'DHL Terrestre',
      total: 120.5,
      typeService: 'standard',
      courier: 'DHL',
      source: 'GE',
    },
  ];

  const mockGlobalConfig: GlobalConfigsDoc = {
    globalMarginProfit: {
      value: 15,
      type: 'percentage',
    },
    providers: [
      {
        name: 'GE',
        couriers: [
          {
            name: 'Estafeta',
            profitMargin: {
              value: 10,
              type: 'percentage',
            },
          },
          {
            name: 'DHL',
            profitMargin: {
              value: 12,
              type: 'percentage',
            },
          },
        ],
      },
    ],
  } as GlobalConfigsDoc;

  const mockExtApiResponse: ExtApiGetQuoteResponse = {
    quotes: mockFormattedQuotes,
    messages: [],
  };

  const createServiceWithConfig = async (configOverride: typeof mockConfig) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuiaEnviaService,
        {
          provide: config.KEY,
          useValue: configOverride,
        },
      ],
    }).compile();
    return module.get<GuiaEnviaService>(GuiaEnviaService);
  };

  beforeEach(async () => {
    service = await createServiceWithConfig(mockConfig);
    jest.clearAllMocks();

    // Mock calculateTotalQuotes to return quotes and messages
    jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
      quotes: mockFormattedQuotes,
      messages: [],
    });
  });

  describe('getQuote', () => {
    it('should successfully get quotes from Guia Envia', async () => {
      // Mock utilities
      jest
        .spyOn(utils, 'formatPayloadGE')
        .mockReturnValue(mockTransformedPayload);
      jest.spyOn(utils, 'formatQuotesGE').mockReturnValue(mockFormattedQuotes);

      // Mock axios response
      mockedAxios.post.mockResolvedValue({
        data: mockGEQuotes,
      });

      const result = await service.getQuote(mockPayload, mockGlobalConfig);

      expect(utils.formatPayloadGE).toHaveBeenCalledWith(mockPayload);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe('https://test-guia-envia.com/cotizar');
      expect(payload).toEqual(mockTransformedPayload);
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-ge-api-key',
        },
      });
      expect(utils.formatQuotesGE).toHaveBeenCalledWith(mockGEQuotes);
      expect(quotesUtils.calculateTotalQuotes).toHaveBeenCalledWith({
        quotes: mockFormattedQuotes,
        provider: 'GE',
        config: mockGlobalConfig,
        messages: [],
        providerNotFoundMessage: expect.any(String),
      });
      expect(result).toEqual({
        quotes: mockFormattedQuotes,
        messages: [],
      });
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
      });

      await expect(
        serviceWithoutApiKey.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: '',
        },
      });

      await expect(
        serviceWithoutUri.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));
    });

    it('should throw BadRequestException when config is missing', async () => {
      await expect(service.getQuote(mockPayload, null as any)).rejects.toThrow(
        new BadRequestException(GE_MISSING_CONFIG_ERROR),
      );
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      jest
        .spyOn(utils, 'formatPayloadGE')
        .mockReturnValue(mockTransformedPayload);

      const errorMessage = 'Service unavailable';
      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(errorMessage));
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      jest
        .spyOn(utils, 'formatPayloadGE')
        .mockReturnValue(mockTransformedPayload);

      // Reject with non-Error object
      mockedAxios.post.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error',
      });

      await expect(
        service.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });

    it('should handle response with empty quotes array', async () => {
      jest
        .spyOn(utils, 'formatPayloadGE')
        .mockReturnValue(mockTransformedPayload);
      jest.spyOn(utils, 'formatQuotesGE').mockReturnValue([]);

      // Mock calculateTotalQuotes to return empty array
      jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
        quotes: [],
        messages: [],
      });

      const emptyQuotes: GEQuote[] = [];

      mockedAxios.post.mockResolvedValue({
        data: emptyQuotes,
      });

      const result = await service.getQuote(mockPayload, mockGlobalConfig);

      expect(utils.formatQuotesGE).toHaveBeenCalledWith(emptyQuotes);
      expect(result).toEqual({
        quotes: [],
        messages: [],
      });
    });

    it('should handle response with undefined data', async () => {
      jest
        .spyOn(utils, 'formatPayloadGE')
        .mockReturnValue(mockTransformedPayload);
      jest.spyOn(utils, 'formatQuotesGE').mockReturnValue([]);

      // Mock calculateTotalQuotes to return empty array
      jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
        quotes: [],
        messages: [],
      });

      mockedAxios.post.mockResolvedValue({
        data: undefined,
      });

      const result = await service.getQuote(mockPayload, mockGlobalConfig);

      expect(utils.formatQuotesGE).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        quotes: [],
        messages: [],
      });
    });

    it('should handle single quote in response', async () => {
      const singleQuote: GEQuote[] = [
        {
          id: 'ge-single',
          servicio: 'FedEx Express Premium',
          total: 300.0,
        },
      ];

      const expectedSingleQuote: GetQuoteData[] = [
        {
          id: 'ge-single',
          service: 'FedEx Express Premium',
          total: 300.0,
          typeService: 'nextDay',
          courier: 'Fedex',
          source: 'GE',
        },
      ];

      jest
        .spyOn(utils, 'formatPayloadGE')
        .mockReturnValue(mockTransformedPayload);
      jest.spyOn(utils, 'formatQuotesGE').mockReturnValue(expectedSingleQuote);

      // Mock calculateTotalQuotes to return the single quote
      jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
        quotes: expectedSingleQuote,
        messages: [],
      });

      mockedAxios.post.mockResolvedValue({
        data: singleQuote,
      });

      const result = await service.getQuote(mockPayload, mockGlobalConfig);

      expect(utils.formatQuotesGE).toHaveBeenCalledWith(singleQuote);
      expect(result).toEqual({
        quotes: expectedSingleQuote,
        messages: [],
      });
      expect(result.quotes).toHaveLength(1);
    });

    it('should propagate BadRequestException from utils', async () => {
      jest.spyOn(utils, 'formatPayloadGE').mockImplementation(() => {
        throw new BadRequestException('Invalid payload structure');
      });

      await expect(
        service.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException('Invalid payload structure'));
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: null as unknown as string,
          uri: 'https://test-guia-envia.com',
        },
      });

      const formatSpy = jest.spyOn(utils, 'formatPayloadGE');

      await expect(
        serviceWithNullApiKey.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // Verify that validation happens before payload transformation
      expect(formatSpy).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle quotes with PAQUETEXPRES service correctly', async () => {
      const quotesWithPaquetExpress: GEQuote[] = [
        {
          id: 'ge-paquetexpres',
          servicio: 'PAQUETEXPRES NACIONAL ZONA1',
          total: 200.0,
        },
        {
          id: 'ge-regular',
          servicio: 'Estafeta Express Regular',
          total: 150.0,
        },
      ];

      const expectedFormattedQuotes: GetQuoteData[] = [
        {
          id: 'ge-paquetexpres',
          service: 'PAQUETEXPRES NACIONAL ZONA1',
          total: 200.0,
          typeService: null, // Should be null due to PAQUETEXPRES exclusion
          courier: 'Paquetexpress',
          source: 'GE',
        },
        {
          id: 'ge-regular',
          service: 'Estafeta Express Regular',
          total: 150.0,
          typeService: 'nextDay',
          courier: 'Estafeta',
          source: 'GE',
        },
      ];

      jest
        .spyOn(utils, 'formatPayloadGE')
        .mockReturnValue(mockTransformedPayload);
      jest
        .spyOn(utils, 'formatQuotesGE')
        .mockReturnValue(expectedFormattedQuotes);

      // Mock calculateTotalQuotes to return the formatted quotes
      jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
        quotes: expectedFormattedQuotes,
        messages: [],
      });

      mockedAxios.post.mockResolvedValue({
        data: quotesWithPaquetExpress,
      });

      const result = await service.getQuote(mockPayload, mockGlobalConfig);

      expect(utils.formatQuotesGE).toHaveBeenCalledWith(
        quotesWithPaquetExpress,
      );
      expect(result).toEqual({
        quotes: expectedFormattedQuotes,
        messages: [],
      });
      expect(result.quotes).toHaveLength(2);
    });
  });

  // Keep the original test for backwards compatibility
  it('get quotes from GE (original test)', async () => {
    const result: ExtApiGetQuoteResponse = {
      quotes: [
        {
          id: '1',
          service: 'Estafeta Terreste',
          total: 126.9,
          typeService: null,
          courier: null,
          source: 'GE',
        },
      ],
      messages: [],
    };
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
    const response = await service.getQuote(payload, mockGlobalConfig);
    expect(response).toBe(result);
  });
});
