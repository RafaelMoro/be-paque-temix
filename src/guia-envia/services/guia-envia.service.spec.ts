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
  GET_NEIGHBORHOOD_ENDPOINT_GE,
  CREATE_ADDRESS_ENDPOINT_GE,
  GET_SERVICES_ENDPOINT_GE,
} from '../guia-envia.constants';
import {
  GEQuote,
  NeighborhoodGE,
  GetNeighborhoodInfoPayload,
  Neighborhood,
  CreateAddressPayload,
  ExtAddressGEResponse,
  CreateAddressResponseGE,
  GetServiceGEResponse,
} from '../guia-envia.interface';
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

  describe('getAddressInfo', () => {
    const mockNeighborhoodPayload: GetNeighborhoodInfoPayload = {
      zipcode: '72000',
    };

    const mockNeighborhoodGEResponse: NeighborhoodGE[] = [
      {
        colonia: 'Centro',
        cp: '72000',
        estado: 'Puebla',
        ciudad: 'Heroica Puebla de Zaragoza',
      },
      {
        colonia: 'El Carmen',
        cp: '72000',
        estado: 'Puebla',
        ciudad: 'Heroica Puebla de Zaragoza',
      },
    ];

    const mockFormattedNeighborhoods: Neighborhood[] = [
      {
        neighborhood: 'Centro',
        zipcode: '72000',
        state: 'Puebla',
        city: 'Heroica Puebla de Zaragoza',
      },
      {
        neighborhood: 'El Carmen',
        zipcode: '72000',
        state: 'Puebla',
        city: 'Heroica Puebla de Zaragoza',
      },
    ];

    const mockConfigWithVersion = {
      ...mockConfig,
      version: '1.0.0',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully get address information from Guia Envia', async () => {
      // Create service with version in config
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      // Mock formatNeighborhoodGE utility
      jest
        .spyOn(utils, 'formatNeighborhoodGE')
        .mockReturnValue(mockFormattedNeighborhoods);

      // Mock axios response
      mockedAxios.get.mockResolvedValue({
        data: mockNeighborhoodGEResponse,
      });

      const result = await serviceWithVersion.getAddressInfo(
        mockNeighborhoodPayload,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      const [url, config] = mockedAxios.get.mock.calls[0];
      expect(url).toBe(
        `https://test-guia-envia.com${GET_NEIGHBORHOOD_ENDPOINT_GE}72000`,
      );
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-ge-api-key',
        },
      });
      expect(utils.formatNeighborhoodGE).toHaveBeenCalledWith(
        mockNeighborhoodGEResponse,
      );
      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          neighborhoods: mockFormattedNeighborhoods,
        },
      });
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        ...mockConfigWithVersion,
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
      });

      await expect(
        serviceWithoutApiKey.getAddressInfo(mockNeighborhoodPayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        ...mockConfigWithVersion,
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: '',
        },
      });

      await expect(
        serviceWithoutUri.getAddressInfo(mockNeighborhoodPayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when API key is null', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        ...mockConfigWithVersion,
        guiaEnvia: {
          apiKey: null as unknown as string,
          uri: 'https://test-guia-envia.com',
        },
      });

      await expect(
        serviceWithNullApiKey.getAddressInfo(mockNeighborhoodPayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URI is null', async () => {
      const serviceWithNullUri = await createServiceWithConfig({
        ...mockConfigWithVersion,
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: null as unknown as string,
        },
      });

      await expect(
        serviceWithNullUri.getAddressInfo(mockNeighborhoodPayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const errorMessage = 'Network error';

      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(
        serviceWithVersion.getAddressInfo(mockNeighborhoodPayload),
      ).rejects.toThrow(new BadRequestException(errorMessage));
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      // Reject with non-Error object
      mockedAxios.get.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error',
      });

      await expect(
        serviceWithVersion.getAddressInfo(mockNeighborhoodPayload),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });

    it('should handle response with empty neighborhoods array', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest.spyOn(utils, 'formatNeighborhoodGE').mockReturnValue([]);

      mockedAxios.get.mockResolvedValue({
        data: [],
      });

      const result = await serviceWithVersion.getAddressInfo(
        mockNeighborhoodPayload,
      );

      expect(utils.formatNeighborhoodGE).toHaveBeenCalledWith([]);
      expect(result.data.neighborhoods).toEqual([]);
      expect(result.version).toBe('1.0.0');
      expect(result.message).toBe(null);
      expect(result.error).toBe(null);
    });

    it('should handle response with undefined data', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest.spyOn(utils, 'formatNeighborhoodGE').mockReturnValue([]);

      mockedAxios.get.mockResolvedValue({
        data: undefined,
      });

      const result = await serviceWithVersion.getAddressInfo(
        mockNeighborhoodPayload,
      );

      expect(utils.formatNeighborhoodGE).toHaveBeenCalledWith(undefined);
      expect(result.data.neighborhoods).toEqual([]);
      expect(result.version).toBe('1.0.0');
      expect(result.message).toBe(null);
      expect(result.error).toBe(null);
    });

    it('should handle single neighborhood in response', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const singleNeighborhoodGE: NeighborhoodGE[] = [
        {
          colonia: 'Zona Dorada',
          cp: '72000',
          estado: 'Puebla',
          ciudad: 'Heroica Puebla de Zaragoza',
        },
      ];

      const expectedSingleNeighborhood: Neighborhood[] = [
        {
          neighborhood: 'Zona Dorada',
          zipcode: '72000',
          state: 'Puebla',
          city: 'Heroica Puebla de Zaragoza',
        },
      ];

      jest
        .spyOn(utils, 'formatNeighborhoodGE')
        .mockReturnValue(expectedSingleNeighborhood);

      mockedAxios.get.mockResolvedValue({
        data: singleNeighborhoodGE,
      });

      const result = await serviceWithVersion.getAddressInfo(
        mockNeighborhoodPayload,
      );

      expect(utils.formatNeighborhoodGE).toHaveBeenCalledWith(
        singleNeighborhoodGE,
      );
      expect(result.data.neighborhoods).toEqual(expectedSingleNeighborhood);
      expect(result.data.neighborhoods).toHaveLength(1);
      expect(result.version).toBe('1.0.0');
    });

    it('should construct correct URL with zipcode parameter', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const customZipcode = '12345';
      const customPayload: GetNeighborhoodInfoPayload = {
        zipcode: customZipcode,
      };

      jest.spyOn(utils, 'formatNeighborhoodGE').mockReturnValue([]);

      mockedAxios.get.mockResolvedValue({
        data: [],
      });

      await serviceWithVersion.getAddressInfo(customPayload);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://test-guia-envia.com${GET_NEIGHBORHOOD_ENDPOINT_GE}${customZipcode}`,
        {
          headers: {
            Authorization: 'test-ge-api-key',
          },
        },
      );
    });

    it('should propagate BadRequestException from utils', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      mockedAxios.get.mockResolvedValue({
        data: mockNeighborhoodGEResponse,
      });

      jest.spyOn(utils, 'formatNeighborhoodGE').mockImplementation(() => {
        throw new BadRequestException('Invalid neighborhood data structure');
      });

      await expect(
        serviceWithVersion.getAddressInfo(mockNeighborhoodPayload),
      ).rejects.toThrow(
        new BadRequestException('Invalid neighborhood data structure'),
      );
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithInvalidConfig = await createServiceWithConfig({
        ...mockConfigWithVersion,
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
      });

      const formatSpy = jest.spyOn(utils, 'formatNeighborhoodGE');

      await expect(
        serviceWithInvalidConfig.getAddressInfo(mockNeighborhoodPayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // Verify that validation happens before API call and utility function call
      expect(formatSpy).not.toHaveBeenCalled();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('createAddress', () => {
    const mockCreateAddressPayload: CreateAddressPayload = {
      zipcode: '72000',
      neighborhood: 'Centro',
      city: 'Heroica Puebla de Zaragoza',
      state: 'Puebla',
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      phone: '+52 222 123 4567',
      company: 'Empresa SA de CV',
      rfc: 'XAXX010101000',
      street: 'Avenida Juárez',
      number: '123',
      reference: 'Entre calle A y calle B, edificio azul',
      alias: 'Casa Principal',
    };

    const mockExtCreateAddressResponse: ExtAddressGEResponse = {
      cp: '72000',
      colonia: 'Centro',
      ciudad: 'Heroica Puebla de Zaragoza',
      estado: 'Puebla',
      nombre: 'Juan Pérez',
      email: 'juan.perez@example.com',
      telefono: '+52 222 123 4567',
      empresa: 'Empresa SA de CV',
      rfc: 'XAXX010101000',
      calle: 'Avenida Juárez',
      numero: '123',
      referencia: 'Entre calle A y calle B, edificio azul',
      alias: 'Casa Principal',
      users: 'user123',
      createdAt: '2023-10-22T12:00:00Z',
      updatedAt: '2023-10-22T12:00:00Z',
      id: 'address-123',
    };

    const mockFormattedCreateAddressResponse: CreateAddressResponseGE = {
      zipcode: '72000',
      neighborhood: 'Centro',
      city: 'Heroica Puebla de Zaragoza',
      state: 'Puebla',
      street: 'Avenida Juárez',
      number: '123',
      reference: 'Entre calle A y calle B, edificio azul',
      alias: 'Casa Principal',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully create address with Guia Envia', async () => {
      // Mock utilities
      jest.spyOn(utils, 'formatCreateAddressPayloadGE').mockReturnValue({
        cp: '72000',
        colonia: 'Centro',
        ciudad: 'Heroica Puebla de Zaragoza',
        estado: 'Puebla',
        nombre: 'Juan Pérez',
        email: 'juan.perez@example.com',
        telefono: '+52 222 123 4567',
        empresa: 'Empresa SA de CV',
        rfc: 'XAXX010101000',
        calle: 'Avenida Juárez',
        numero: '123',
        referencia: 'Entre calle A y calle B, edificio azul',
        alias: 'Casa Principal',
      });

      jest
        .spyOn(utils, 'formatCreateAddressResponseGE')
        .mockReturnValue(mockFormattedCreateAddressResponse);

      // Mock axios response
      mockedAxios.post.mockResolvedValue({
        data: mockExtCreateAddressResponse,
      });

      const result = await service.createAddress(mockCreateAddressPayload);

      expect(utils.formatCreateAddressPayloadGE).toHaveBeenCalledWith(
        mockCreateAddressPayload,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, , config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe(
        `https://test-guia-envia.com${CREATE_ADDRESS_ENDPOINT_GE}`,
      );
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-ge-api-key',
        },
      });
      expect(utils.formatCreateAddressResponseGE).toHaveBeenCalledWith(
        mockExtCreateAddressResponse,
      );
      expect(result).toEqual(mockFormattedCreateAddressResponse);
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
      });

      await expect(
        serviceWithoutApiKey.createAddress(mockCreateAddressPayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: '',
        },
      });

      await expect(
        serviceWithoutUri.createAddress(mockCreateAddressPayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      jest.spyOn(utils, 'formatCreateAddressPayloadGE').mockReturnValue({
        cp: '72000',
        colonia: 'Centro',
        ciudad: 'Heroica Puebla de Zaragoza',
        estado: 'Puebla',
        nombre: 'Juan Pérez',
        email: 'juan.perez@example.com',
        telefono: '+52 222 123 4567',
        empresa: 'Empresa SA de CV',
        rfc: 'XAXX010101000',
        calle: 'Avenida Juárez',
        numero: '123',
        referencia: 'Entre calle A y calle B, edificio azul',
        alias: 'Casa Principal',
      });

      const errorMessage = 'Network error';
      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.createAddress(mockCreateAddressPayload),
      ).rejects.toThrow(new BadRequestException(errorMessage));
    });

    it('should handle axios error correctly', async () => {
      jest.spyOn(utils, 'formatCreateAddressPayloadGE').mockReturnValue({
        cp: '72000',
        colonia: 'Centro',
        ciudad: 'Heroica Puebla de Zaragoza',
        estado: 'Puebla',
        nombre: 'Juan Pérez',
        email: 'juan.perez@example.com',
        telefono: '+52 222 123 4567',
        empresa: 'Empresa SA de CV',
        rfc: 'XAXX010101000',
        calle: 'Avenida Juárez',
        numero: '123',
        referencia: 'Entre calle A y calle B, edificio azul',
        alias: 'Casa Principal',
      });

      const axiosError = {
        isAxiosError: true,
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          data: { error: 'Invalid address data' },
        },
      };

      // Mock axios.isAxiosError to return true
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(
        service.createAddress(mockCreateAddressPayload),
      ).rejects.toThrow(
        new BadRequestException('Request failed with status code 400'),
      );
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      jest.spyOn(utils, 'formatCreateAddressPayloadGE').mockReturnValue({
        cp: '72000',
        colonia: 'Centro',
        ciudad: 'Heroica Puebla de Zaragoza',
        estado: 'Puebla',
        nombre: 'Juan Pérez',
        email: 'juan.perez@example.com',
        telefono: '+52 222 123 4567',
        empresa: 'Empresa SA de CV',
        rfc: 'XAXX010101000',
        calle: 'Avenida Juárez',
        numero: '123',
        referencia: 'Entre calle A y calle B, edificio azul',
        alias: 'Casa Principal',
      });

      // Mock axios.isAxiosError to return false
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);

      // Reject with non-Error object
      mockedAxios.post.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error',
      });

      await expect(
        service.createAddress(mockCreateAddressPayload),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithInvalidConfig = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
      });

      const formatSpy = jest.spyOn(utils, 'formatCreateAddressPayloadGE');

      await expect(
        serviceWithInvalidConfig.createAddress(mockCreateAddressPayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // Verify that validation happens before payload transformation
      expect(formatSpy).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('listServicesGe', () => {
    const mockServicesResponse: GetServiceGEResponse[] = [
      {
        id: '1',
        nombre: 'Paquete Express',
      },
      {
        id: '2',
        nombre: 'DHL',
      },
      {
        id: '3',
        nombre: 'FedEx',
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully get services from Guia Envia', async () => {
      // Mock axios response
      mockedAxios.get.mockResolvedValue({
        data: mockServicesResponse,
      });

      const result = await service.listServicesGe();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      const [url, config] = mockedAxios.get.mock.calls[0];
      expect(url).toBe(
        `https://test-guia-envia.com${GET_SERVICES_ENDPOINT_GE}`,
      );
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-ge-api-key',
        },
      });
      expect(result).toEqual(mockServicesResponse);
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
      });

      await expect(serviceWithoutApiKey.listServicesGe()).rejects.toThrow(
        new BadRequestException(GE_MISSING_API_KEY_ERROR),
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: '',
        },
      });

      await expect(serviceWithoutUri.listServicesGe()).rejects.toThrow(
        new BadRequestException(GE_MISSING_URI_ERROR),
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when API key is null', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: null as unknown as string,
          uri: 'https://test-guia-envia.com',
        },
      });

      await expect(serviceWithNullApiKey.listServicesGe()).rejects.toThrow(
        new BadRequestException(GE_MISSING_API_KEY_ERROR),
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URI is null', async () => {
      const serviceWithNullUri = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: null as unknown as string,
        },
      });

      await expect(serviceWithNullUri.listServicesGe()).rejects.toThrow(
        new BadRequestException(GE_MISSING_URI_ERROR),
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      const errorMessage = 'Network error';

      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(service.listServicesGe()).rejects.toThrow(
        new BadRequestException(errorMessage),
      );
    });

    it('should throw BadRequestException when axios throws axios error', async () => {
      const errorResponse = { message: 'Service unavailable' };

      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { data: errorResponse },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(service.listServicesGe()).rejects.toThrow(
        new BadRequestException(errorResponse),
      );
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      // Reject with non-Error object and mock isAxiosError to return false
      mockedAxios.get.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error',
      });
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(service.listServicesGe()).rejects.toThrow(
        new BadRequestException('An unknown error occurred'),
      );
    });

    it('should handle response with empty services array', async () => {
      const emptyServices: GetServiceGEResponse[] = [];

      mockedAxios.get.mockResolvedValue({
        data: emptyServices,
      });

      const result = await service.listServicesGe();

      expect(result).toEqual(emptyServices);
      expect(result).toHaveLength(0);
    });

    it('should handle response with undefined data', async () => {
      mockedAxios.get.mockResolvedValue({
        data: undefined,
      });

      const result = await service.listServicesGe();

      expect(result).toBeUndefined();
    });

    it('should handle single service in response', async () => {
      const singleService: GetServiceGEResponse[] = [
        {
          id: 'single-service',
          nombre: 'Estafeta Express',
        },
      ];

      mockedAxios.get.mockResolvedValue({
        data: singleService,
      });

      const result = await service.listServicesGe();

      expect(result).toEqual(singleService);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('single-service');
      expect(result[0].nombre).toBe('Estafeta Express');
    });

    it('should construct correct URL with services endpoint', async () => {
      mockedAxios.get.mockResolvedValue({
        data: mockServicesResponse,
      });

      await service.listServicesGe();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://test-guia-envia.com${GET_SERVICES_ENDPOINT_GE}`,
        expect.objectContaining({
          headers: {
            Authorization: 'test-ge-api-key',
          },
        }),
      );
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithInvalidConfig = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
      });

      // Mock isAxiosError to return false to prevent it from interfering
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(serviceWithInvalidConfig.listServicesGe()).rejects.toThrow(
        new BadRequestException(GE_MISSING_API_KEY_ERROR),
      );

      // Verify that validation happens before API call
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});
