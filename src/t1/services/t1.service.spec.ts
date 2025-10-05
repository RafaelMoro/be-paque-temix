import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';

import { T1Service } from './t1.service';
import config from '@/config';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import {
  GetQuoteData,
  ExtApiGetQuoteResponse,
} from '@/quotes/quotes.interface';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import { TokenManagerService } from '@/token-manager/services/token-manager.service';
import * as utils from '../t1.utils';
import * as quotesUtils from '@/quotes/quotes.utils';
import {
  T1_MISSING_ACCESS_TOKEN,
  T1_MISSING_URI_ERROR,
  T1_MISSING_STORE_ID_ERROR,
  T1_MISSING_PROVIDER_PROFIT_MARGIN,
} from '../t1.constants';
import {
  T1GetQuoteResponse,
  T1CreateGuideRequest,
  T1ExternalCreateGuideResponse,
} from '../t1.interface';
import { GlobalCreateGuideResponse } from '@/global.interface';
import { GetQuoteT1Dto } from '../dtos/t1.dtos';

// Mock axios
jest.mock('axios');

describe('T1Service', () => {
  let service: T1Service;
  let generalInfoDbService: GeneralInfoDbService;
  let tokenManagerService: TokenManagerService;

  const mockConfig = {
    t1: {
      tkUri: 'https://test-t1-token.com/oauth/token',
      tkClientId: 'test-client-id',
      tkClientSecret: 'test-client-secret',
      tkUsername: 'test-username',
      tkPassword: 'test-password',
      uri: 'https://test-t1.com',
      storeId: 'test-store-id',
    },
    environment: 'development',
    version: '1.0.0',
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
        clave: '99MIN',
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
      courier: 'NextDay',
      source: 'TONE',
    },
  ];

  const mockGlobalConfig: GlobalConfigsDoc = {
    globalMarginProfit: {
      value: 15,
      type: 'percentage',
    },
    providers: [
      {
        name: 'TONE',
        couriers: [
          {
            name: 'NextDay',
            profitMargin: {
              value: 10,
              type: 'percentage',
            },
          },
        ],
      },
    ],
  } as GlobalConfigsDoc;

  const createServiceWithConfig = async (configOverride: typeof mockConfig) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        T1Service,
        {
          provide: config.KEY,
          useValue: configOverride,
        },
        {
          provide: GeneralInfoDbService,
          useValue: {
            getToneTk: jest.fn(),
            updateToneToken: jest.fn(),
          },
        },
        {
          provide: TokenManagerService,
          useValue: {
            executeWithTokenManagement: jest.fn(),
          },
        },
      ],
    }).compile();
    return module.get<T1Service>(T1Service);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        T1Service,
        {
          provide: config.KEY,
          useValue: mockConfig,
        },
        {
          provide: GeneralInfoDbService,
          useValue: {
            getToneTk: jest.fn(),
            updateToneToken: jest.fn(),
          },
        },
        {
          provide: TokenManagerService,
          useValue: {
            executeWithTokenManagement: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<T1Service>(T1Service);
    generalInfoDbService =
      module.get<GeneralInfoDbService>(GeneralInfoDbService);
    tokenManagerService = module.get<TokenManagerService>(TokenManagerService);
    jest.clearAllMocks();

    // Mock calculateTotalQuotes to return quotes and messages
    jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
      quotes: mockFormattedQuotes,
      messages: [],
    });
  });

  describe('getQuote', () => {
    it('should successfully get quotes from T1 using TokenManagerService', async () => {
      // Mock TokenManagerService.executeWithTokenManagement to return success
      const mockExecuteWithToken = jest.fn().mockResolvedValueOnce({
        result: mockT1Response,
        messages: [
          'T1: Token valid',
          'T1: quote fetching completed successfully',
        ],
      });
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      // Mock utilities
      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);
      jest
        .spyOn(utils, 'formatT1QuoteData')
        .mockReturnValue(mockFormattedQuotes);

      const result = await service.getQuote(mockPayload, mockGlobalConfig);

      expect(utils.formatPayloadT1).toHaveBeenCalledWith({
        payload: mockPayload,
        storeId: 'test-store-id',
      });
      expect(mockExecuteWithToken).toHaveBeenCalledWith(
        expect.any(Function), // operation function
        'quote fetching',
        false, // isProd (development environment)
        expect.any(Object), // token operations
        'T1',
      );
      expect(utils.formatT1QuoteData).toHaveBeenCalledWith(mockT1Response);
      expect(quotesUtils.calculateTotalQuotes).toHaveBeenCalledWith({
        quotes: mockFormattedQuotes,
        provider: 'TONE',
        config: mockGlobalConfig,
        messages: [
          'T1: Token valid',
          'T1: quote fetching completed successfully',
        ],
        providerNotFoundMessage: T1_MISSING_PROVIDER_PROFIT_MARGIN,
      });
      expect(result).toEqual({
        quotes: mockFormattedQuotes,
        messages: [],
      });
    });

    it('should handle when TokenManagerService returns null result', async () => {
      // Mock TokenManagerService.executeWithTokenManagement to return null
      const mockExecuteWithToken = jest.fn().mockResolvedValueOnce({
        result: null,
        messages: ['T1: Token valid'],
      });
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      // Mock utilities
      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);

      const result = await service.getQuote(mockPayload, mockGlobalConfig);

      expect(result).toEqual({
        quotes: [],
        messages: ['T1: Token valid', 'T1: Failed to fetch quotes'],
      });
    });

    it('should throw BadRequestException when TokenManagerService fails', async () => {
      // Mock TokenManagerService.executeWithTokenManagement to throw error
      const mockExecuteWithToken = jest
        .fn()
        .mockRejectedValueOnce(new Error('Token management failed'));
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      // Mock utilities
      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);

      await expect(
        service.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow('Token management failed');
    });

    it('should throw BadRequestException when token URI is missing', async () => {
      const serviceWithoutTokenUri = await createServiceWithConfig({
        t1: {
          tkUri: '',
          tkClientId: 'test-client-id',
          tkClientSecret: 'test-client-secret',
          tkUsername: 'test-username',
          tkPassword: 'test-password',
          uri: 'https://test-t1.com',
          storeId: 'test-store-id',
        },
        environment: 'development',
        version: '1.0.0',
      });

      // Mock the TokenManagerService to throw the validation error
      const tokenManagerServiceForBadConfig =
        serviceWithoutTokenUri['tokenManagerService'];
      tokenManagerServiceForBadConfig.executeWithTokenManagement = jest
        .fn()
        .mockRejectedValueOnce(
          new BadRequestException('T1 token URI is missing'),
        );

      await expect(
        serviceWithoutTokenUri.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException('T1 token URI is missing'));
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        t1: {
          tkUri: 'https://test-t1-token.com/oauth/token',
          tkClientId: 'test-client-id',
          tkClientSecret: 'test-client-secret',
          tkUsername: 'test-username',
          tkPassword: 'test-password',
          uri: '',
          storeId: 'test-store-id',
        },
        environment: 'development',
        version: '1.0.0',
      });

      // Mock the TokenManagerService to throw the validation error
      const tokenManagerServiceForBadConfig =
        serviceWithoutUri['tokenManagerService'];
      tokenManagerServiceForBadConfig.executeWithTokenManagement = jest
        .fn()
        .mockRejectedValueOnce(new BadRequestException(T1_MISSING_URI_ERROR));

      await expect(
        serviceWithoutUri.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(T1_MISSING_URI_ERROR));
    });

    it('should throw BadRequestException when store ID is missing', async () => {
      const serviceWithoutStoreId = await createServiceWithConfig({
        t1: {
          tkUri: 'https://test-t1-token.com/oauth/token',
          tkClientId: 'test-client-id',
          tkClientSecret: 'test-client-secret',
          tkUsername: 'test-username',
          tkPassword: 'test-password',
          uri: 'https://test-t1.com',
          storeId: '',
        },
        environment: 'development',
        version: '1.0.0',
      });

      // Mock the TokenManagerService to throw the validation error
      const tokenManagerServiceForBadConfig =
        serviceWithoutStoreId['tokenManagerService'];
      tokenManagerServiceForBadConfig.executeWithTokenManagement = jest
        .fn()
        .mockRejectedValueOnce(
          new BadRequestException(T1_MISSING_STORE_ID_ERROR),
        );

      await expect(
        serviceWithoutStoreId.getQuote(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(T1_MISSING_STORE_ID_ERROR));
    });

    it('should handle multiple quotes in response', async () => {
      const multipleQuotesResponse: T1GetQuoteResponse = {
        success: true,
        message: 'Multiple quotes',
        result: [
          {
            id: 123,
            clave: '99MIN',
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
            clave: '99MIN',
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
          courier: 'NextDay',
          source: 'TONE',
        },
        {
          id: 124,
          service: 'Standard Service',
          total: 75.25,
          typeService: 'standard',
          courier: 'NextDay',
          source: 'TONE',
        },
      ];

      // Mock TokenManagerService.executeWithTokenManagement to return success
      const mockExecuteWithToken = jest.fn().mockResolvedValueOnce({
        result: multipleQuotesResponse,
        messages: [
          'T1: Token valid',
          'T1: quote fetching completed successfully',
        ],
      });
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      jest
        .spyOn(utils, 'formatPayloadT1')
        .mockReturnValue(mockFormattedPayload);
      jest
        .spyOn(utils, 'formatT1QuoteData')
        .mockReturnValue(expectedFormattedQuotes);

      // Mock calculateTotalQuotes to return the formatted quotes
      jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
        quotes: expectedFormattedQuotes,
        messages: [],
      });

      const result = await service.getQuote(mockPayload, mockGlobalConfig);

      expect(utils.formatT1QuoteData).toHaveBeenCalledWith(
        multipleQuotesResponse,
      );
      expect(result).toEqual({
        quotes: expectedFormattedQuotes,
        messages: [],
      });
      expect(result.quotes).toHaveLength(2);
    });
  });

  describe('createNewTk', () => {
    it('should successfully create and store a new token', async () => {
      // Mock token operations
      const mockToken = 'new-access-token-123';

      // Mock axios call for token creation
      const mockedAxios = axios as jest.Mocked<typeof axios>;
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: mockToken },
      });

      // Mock generalInfoDbService.updateToneToken
      const updateToneTokenMock = jest.fn().mockResolvedValueOnce(undefined);
      generalInfoDbService.updateToneToken = updateToneTokenMock;

      const result = await service.createNewTk();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const axiosPostMock = mockedAxios.post;
      expect(axiosPostMock).toHaveBeenCalledWith(
        'https://test-t1-token.com/oauth/token',
        {
          grant_type: 'password',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          username: 'test-username',
          password: 'test-password',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 45000,
        },
      );
      expect(updateToneTokenMock).toHaveBeenCalledWith({
        token: mockToken,
        isProd: false, // development environment
      });
      expect(result).toEqual({
        messages: ['Token retrieved successfully', 'Token stored successfully'],
      });
    });

    it('should throw BadRequestException when token creation fails', async () => {
      const mockedAxios = axios as jest.Mocked<typeof axios>;
      mockedAxios.post.mockRejectedValueOnce(
        new Error('Authentication failed'),
      );

      await expect(service.createNewTk()).rejects.toThrow(
        new BadRequestException('Authentication failed'),
      );
    });

    it('should throw BadRequestException when access token is missing from response', async () => {
      const mockedAxios = axios as jest.Mocked<typeof axios>;
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: '' }, // Empty access token
      });

      await expect(service.createNewTk()).rejects.toThrow(
        new BadRequestException(T1_MISSING_ACCESS_TOKEN),
      );
    });
  });

  // Keep the original test for backwards compatibility
  it('get quotes from T1 (original test)', async () => {
    const result: ExtApiGetQuoteResponse = {
      quotes: [
        {
          id: '1',
          service: 'Carrier Express',
          total: 199.99,
          typeService: null,
          courier: null,
          source: 'TONE',
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

  describe('createGuide', () => {
    const mockCreateGuidePayload: T1CreateGuideRequest = {
      parcel: {
        content: 'Test package',
      },
      origin: {
        name: 'Test',
        lastName: 'User',
        street1: 'Test Street 123',
        neighborhood: 'Test Neighborhood',
        external_number: '123',
        town: 'Test Town',
        state: 'Test State',
        phone: '1234567890',
        email: 'test@example.com',
        reference: 'Test Reference',
      },
      destination: {
        name: 'Dest',
        lastName: 'User',
        street1: 'Dest Street 456',
        neighborhood: 'Dest Neighborhood',
        external_number: '456',
        town: 'Dest Town',
        state: 'Dest State',
        phone: '0987654321',
        email: 'dest@example.com',
        reference: 'Dest Reference',
      },
      quoteToken: 'test-quote-token',
      notifyMe: true,
    };

    const mockGuideResponse: T1ExternalCreateGuideResponse = {
      success: true,
      message: 'Guide created successfully',
      location: 'test',
      detail: {
        paquetes: 1,
        num_orden: 'ORD123456',
        paqueteria: 'T1',
        fecha_creacion: '2024-01-01',
        costo: 100.5,
        destino: 'Test Destination',
        guia: 'GUIDE123456',
        file: 'test-file.pdf',
        link_guia: 'https://example.com/guide/123456',
      },
    };

    const expectedFormattedResponse: GlobalCreateGuideResponse = {
      trackingNumber: 'GUIDE123456',
      carrier: 'T1',
      price: '100.5',
      guideLink: 'https://example.com/guide/123456',
      labelUrl: 'https://example.com/guide/123456',
      file: 'test-file.pdf',
    };

    it('should successfully create guide using TokenManagerService', async () => {
      // Mock the TokenManagerService to return successful result
      const mockExecuteWithToken = jest.fn().mockResolvedValueOnce({
        result: mockGuideResponse,
        messages: ['Guide created successfully'],
      });
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      // Mock formatPayloadCreateGuideT1
      const mockFormattedPayload = {
        contenido: 'Test package',
        nombre_origen: 'Test',
        apellidos_origen: 'User',
        // ... other required fields would be here in real implementation
      };

      jest
        .spyOn(utils, 'formatPayloadCreateGuideT1')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockReturnValue(mockFormattedPayload as any);

      // Mock formatT1CreateGuideResponse
      jest
        .spyOn(utils, 'formatT1CreateGuideResponse')
        .mockReturnValue(expectedFormattedResponse);

      const result = await service.createGuide(mockCreateGuidePayload);

      expect(mockExecuteWithToken).toHaveBeenCalledWith(
        expect.any(Function),
        'guide creation',
        false, // isProd
        expect.any(Object), // token operations
        'T1',
      );
      expect(utils.formatPayloadCreateGuideT1).toHaveBeenCalledWith({
        payload: mockCreateGuidePayload,
        storeId: 'test-store-id',
        notifyMe: mockCreateGuidePayload.notifyMe,
        quoteToken: mockCreateGuidePayload.quoteToken,
      });
      expect(utils.formatT1CreateGuideResponse).toHaveBeenCalledWith(
        mockGuideResponse,
      );
      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        messages: ['Guide created successfully'],
        error: null,
        data: {
          guide: expectedFormattedResponse,
        },
      });
    });

    it('should throw BadRequestException when TokenManagerService fails', async () => {
      const mockExecuteWithToken = jest
        .fn()
        .mockRejectedValueOnce(new BadRequestException('Token error'));
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      jest
        .spyOn(utils, 'formatPayloadCreateGuideT1')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockReturnValue({} as unknown as any);

      await expect(service.createGuide(mockCreateGuidePayload)).rejects.toThrow(
        new BadRequestException('Token error'),
      );
    });

    it('should throw BadRequestException when guide creation fails', async () => {
      const mockExecuteWithToken = jest.fn().mockResolvedValueOnce({
        result: null,
        messages: ['Guide creation failed'],
      });
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      jest
        .spyOn(utils, 'formatPayloadCreateGuideT1')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockReturnValue({} as unknown as any);

      await expect(service.createGuide(mockCreateGuidePayload)).rejects.toThrow(
        new BadRequestException('T1: Failed to create guide'),
      );
    });
  });
});
