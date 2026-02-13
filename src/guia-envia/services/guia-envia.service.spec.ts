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
  CREATE_GUIDE_ENDPOINT_GE,
  GET_GUIDES_ENDPOINT_GE,
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
  CreateGuideGeRequest,
  ExtCreateGuideGEResponse,
  CreateGuideGEDataResponse,
  ExtGetAllAddressesGEResponse,
  AddressGE,
  EditAddressGEDataResponse,
  ExtGetGuidesGEResponse,
  ExtGetGuideGE,
} from '../guia-envia.interface';
import { GetGuideResponse } from '@/global.interface';
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
        new BadRequestException({ error: 'Invalid address data' }),
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

  describe('deleteGEAddress', () => {
    const mockAddressId = 'address-1';
    const mockGetAllAddressesResponse: ExtGetAllAddressesGEResponse = {
      data: [
        {
          id: 'address-1',
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
        },
        {
          id: 'address-2',
          cp: '94298',
          colonia: 'Las Flores',
          ciudad: 'Boca del Río',
          estado: 'Veracruz',
          nombre: 'María García',
          email: 'maria.garcia@example.com',
          telefono: '+52 229 987 6543',
          empresa: 'Corporativo XYZ',
          rfc: 'MARY010101000',
          calle: 'Calle Principal',
          numero: '456',
          referencia: 'Casa azul',
          alias: 'Oficina Centro',
          users: 'user456',
          createdAt: '2023-10-22T13:00:00Z',
          updatedAt: '2023-10-22T13:00:00Z',
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    const mockConfigWithVersion = {
      ...mockConfig,
      version: '1.0.0',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully delete address by ID from Guia Envia', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      // Mock axios DELETE response
      mockedAxios.delete.mockResolvedValue({
        status: 204,
        data: null,
      });

      const result = await serviceWithVersion.deleteGEAddress(mockAddressId);

      // Verify DELETE was called with correct URL
      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
      const [deleteUrl, deleteConfig] = mockedAxios.delete.mock.calls[0];
      expect(deleteUrl).toBe(
        `https://test-guia-envia.com${CREATE_ADDRESS_ENDPOINT_GE}?id=address-1`,
      );
      expect(deleteConfig).toMatchObject({
        headers: {
          Authorization: 'test-ge-api-key',
        },
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: 'Address deleted successfully',
        error: null,
        data: null,
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
        serviceWithoutApiKey.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      expect(mockedAxios.delete).not.toHaveBeenCalled();
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
        serviceWithoutUri.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      expect(mockedAxios.delete).not.toHaveBeenCalled();
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
        serviceWithNullApiKey.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      expect(mockedAxios.delete).not.toHaveBeenCalled();
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
        serviceWithNullUri.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      expect(mockedAxios.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when delete fails', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const errorMessage = 'Address not found';

      mockedAxios.delete.mockRejectedValue(new Error(errorMessage));

      await expect(
        serviceWithVersion.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException(errorMessage));

      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when axios throws a network error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const errorMessage = 'Network error';

      mockedAxios.delete.mockRejectedValue(new Error(errorMessage));

      await expect(
        serviceWithVersion.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException(errorMessage));

      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when axios throws a server error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const errorMessage = 'Server error';

      mockedAxios.delete.mockRejectedValue(new Error(errorMessage));

      await expect(
        serviceWithVersion.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException(errorMessage));

      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle axios error correctly', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const axiosError = {
        isAxiosError: true,
        response: {
          data: { message: 'Unauthorized' },
        },
        message: 'Request failed with status code 401',
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.delete.mockRejectedValue(axiosError);

      await expect(
        serviceWithVersion.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException({ message: 'Unauthorized' }));

      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle axios forbidden error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const axiosError = {
        isAxiosError: true,
        response: {
          data: { message: 'Forbidden' },
        },
        message: 'Request failed with status code 403',
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.delete.mockRejectedValue(axiosError);

      await expect(
        serviceWithVersion.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException({ message: 'Forbidden' }));

      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      // Reject with non-Error object
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockedAxios.delete.mockRejectedValue({
        response: { status: 500 },
      });

      await expect(
        serviceWithVersion.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));

      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
    });

    it('should successfully delete address with specific ID', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const customId = 'custom-address-id';

      mockedAxios.delete.mockResolvedValue({
        status: 204,
        data: null,
      });

      const result = await serviceWithVersion.deleteGEAddress(customId);

      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
      const [deleteUrl] = mockedAxios.delete.mock.calls[0];
      expect(deleteUrl).toBe(
        `https://test-guia-envia.com${CREATE_ADDRESS_ENDPOINT_GE}?id=${customId}`,
      );
      expect(result).toEqual({
        version: '1.0.0',
        message: 'Address deleted successfully',
        error: null,
        data: null,
      });
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        ...mockConfigWithVersion,
        guiaEnvia: {
          apiKey: null as unknown as string,
          uri: 'https://test-guia-envia.com',
        },
      });

      await expect(
        serviceWithNullApiKey.deleteGEAddress(mockAddressId),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // Verify that validation happens before making any API calls
      expect(mockedAxios.delete).not.toHaveBeenCalled();
    });

    it('should construct correct DELETE URL with id parameter', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      mockedAxios.delete.mockResolvedValue({
        status: 204,
        data: null,
      });

      await serviceWithVersion.deleteGEAddress(mockAddressId);

      const [deleteUrl] = mockedAxios.delete.mock.calls[0];
      expect(deleteUrl).toContain('?id=address-1');
      expect(deleteUrl).toBe(
        `https://test-guia-envia.com${CREATE_ADDRESS_ENDPOINT_GE}?id=address-1`,
      );
    });
  });

  describe('editGEAddress', () => {
    const mockAddressId = 'address-123';
    const mockEditAddressPayload: CreateAddressPayload = {
      zipcode: '72000',
      neighborhood: 'Centro',
      city: 'Heroica Puebla de Zaragoza',
      state: 'Puebla',
      name: 'Juan Pérez Updated',
      email: 'juan.updated@example.com',
      phone: '+52 222 999 8888',
      company: 'Empresa Updated SA de CV',
      rfc: 'XAXX010101000',
      street: 'Avenida Juárez Updated',
      number: '456',
      reference: 'Updated reference',
      alias: 'Casa Principal Updated',
    };

    const mockExtEditAddressResponse: ExtAddressGEResponse = {
      cp: '72000',
      colonia: 'Centro',
      ciudad: 'Heroica Puebla de Zaragoza',
      estado: 'Puebla',
      nombre: 'Juan Pérez Updated',
      email: 'juan.updated@example.com',
      telefono: '+52 222 999 8888',
      empresa: 'Empresa Updated SA de CV',
      rfc: 'XAXX010101000',
      calle: 'Avenida Juárez Updated',
      numero: '456',
      referencia: 'Updated reference',
      alias: 'Casa Principal Updated',
      users: 'user123',
      createdAt: '2023-10-22T12:00:00Z',
      updatedAt: '2023-10-22T14:00:00Z',
      id: mockAddressId,
    };

    const mockFormattedEditAddressResponse: CreateAddressResponseGE = {
      zipcode: '72000',
      neighborhood: 'Centro',
      city: 'Heroica Puebla de Zaragoza',
      state: 'Puebla',
      street: 'Avenida Juárez Updated',
      number: '456',
      reference: 'Updated reference',
      alias: 'Casa Principal Updated',
    };

    const mockConfigWithVersion = {
      ...mockConfig,
      version: '1.0.0',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully edit address by ID in Guia Envia', async () => {
      // Create service with version in config
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      // Mock formatCreateAddressPayloadGE utility
      const mockTransformedPayload = {
        cp: '72000',
        colonia: 'Centro',
        ciudad: 'Heroica Puebla de Zaragoza',
        estado: 'Puebla',
        nombre: 'Juan Pérez Updated',
        email: 'juan.updated@example.com',
        telefono: '+52 222 999 8888',
        empresa: 'Empresa Updated SA de CV',
        rfc: 'XAXX010101000',
        calle: 'Avenida Juárez Updated',
        numero: '456',
        referencia: 'Updated reference',
        alias: 'Casa Principal Updated',
      };

      jest
        .spyOn(utils, 'formatCreateAddressPayloadGE')
        .mockReturnValue(mockTransformedPayload);
      jest
        .spyOn(utils, 'formatCreateAddressResponseGE')
        .mockReturnValue(mockFormattedEditAddressResponse);

      // Mock axios response
      mockedAxios.put.mockResolvedValue({
        data: mockExtEditAddressResponse,
      });

      const result = await serviceWithVersion.editGEAddress({
        id: mockAddressId,
        payload: mockEditAddressPayload as any,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.put).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.put.mock.calls[0];
      expect(url).toBe(
        `https://test-guia-envia.com${CREATE_ADDRESS_ENDPOINT_GE}/${mockAddressId}`,
      );
      expect(payload).toEqual(mockTransformedPayload);
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-ge-api-key',
        },
      });
      expect(utils.formatCreateAddressPayloadGE).toHaveBeenCalledWith(
        mockEditAddressPayload,
      );
      expect(utils.formatCreateAddressResponseGE).toHaveBeenCalledWith(
        mockExtEditAddressResponse,
      );
      expect(result).toEqual({
        version: '1.0.0',
        message: 'Address edited successfully',
        error: null,
        data: mockFormattedEditAddressResponse,
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
        serviceWithoutApiKey.editGEAddress({
          id: mockAddressId,
          payload: mockEditAddressPayload as any,
        }),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.put).not.toHaveBeenCalled();
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
        serviceWithoutUri.editGEAddress({
          id: mockAddressId,
          payload: mockEditAddressPayload as any,
        }),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.put).not.toHaveBeenCalled();
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
        serviceWithNullApiKey.editGEAddress({
          id: mockAddressId,
          payload: mockEditAddressPayload as any,
        }),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.put).not.toHaveBeenCalled();
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
        serviceWithNullUri.editGEAddress({
          id: mockAddressId,
          payload: mockEditAddressPayload as any,
        }),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.put).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest
        .spyOn(utils, 'formatCreateAddressPayloadGE')
        .mockReturnValue({} as any);

      const errorMessage = 'Address not found';
      mockedAxios.put.mockRejectedValue(new Error(errorMessage));

      await expect(
        serviceWithVersion.editGEAddress({
          id: mockAddressId,
          payload: mockEditAddressPayload as any,
        }),
      ).rejects.toThrow(new BadRequestException(errorMessage));
    });

    it('should handle axios error correctly', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest
        .spyOn(utils, 'formatCreateAddressPayloadGE')
        .mockReturnValue({} as any);

      const errorResponse = {
        message: 'Address with id address-123 not found',
        error: 'Not Found',
        statusCode: 404,
      };

      const axiosError = {
        isAxiosError: true,
        response: {
          data: errorResponse,
        },
      };
      mockedAxios.put.mockRejectedValue(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        serviceWithVersion.editGEAddress({
          id: mockAddressId,
          payload: mockEditAddressPayload as any,
        }),
      ).rejects.toThrow(new BadRequestException(errorResponse));
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest
        .spyOn(utils, 'formatCreateAddressPayloadGE')
        .mockReturnValue({} as any);

      // Reject with non-Error object
      mockedAxios.put.mockRejectedValue({
        response: { status: 500 },
      });
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        serviceWithVersion.editGEAddress({
          id: mockAddressId,
          payload: mockEditAddressPayload as any,
        }),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        ...mockConfigWithVersion,
        guiaEnvia: {
          apiKey: null as unknown as string,
          uri: 'https://test-guia-envia.com',
        },
      });

      const formatSpy = jest.spyOn(utils, 'formatCreateAddressPayloadGE');

      await expect(
        serviceWithNullApiKey.editGEAddress({
          id: mockAddressId,
          payload: mockEditAddressPayload as any,
        }),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // Verify that validation happens before payload transformation
      expect(formatSpy).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.put).not.toHaveBeenCalled();
    });

    it('should construct correct PUT URL with address ID', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest
        .spyOn(utils, 'formatCreateAddressPayloadGE')
        .mockReturnValue({} as any);
      jest
        .spyOn(utils, 'formatCreateAddressResponseGE')
        .mockReturnValue(mockFormattedEditAddressResponse);

      mockedAxios.put.mockResolvedValue({
        data: mockExtEditAddressResponse,
      });

      await serviceWithVersion.editGEAddress({
        id: 'specific-address-id-789',
        payload: mockEditAddressPayload as any,
      });

      const [url] = mockedAxios.put.mock.calls[0];
      expect(url).toBe(
        `https://test-guia-envia.com${CREATE_ADDRESS_ENDPOINT_GE}/specific-address-id-789`,
      );
    });

    it('should handle successful edit with all response fields', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const completeResponse: ExtAddressGEResponse = {
        ...mockExtEditAddressResponse,
        nombre: 'Complete Name',
        empresa: 'Complete Company',
      };

      jest
        .spyOn(utils, 'formatCreateAddressPayloadGE')
        .mockReturnValue({} as any);
      jest.spyOn(utils, 'formatCreateAddressResponseGE').mockReturnValue({
        zipcode: '72000',
        neighborhood: 'Centro',
        city: 'Heroica Puebla de Zaragoza',
        state: 'Puebla',
        street: 'Avenida Juárez Updated',
        number: '456',
        reference: 'Updated reference',
        alias: 'Casa Principal Updated',
      });

      mockedAxios.put.mockResolvedValue({
        data: completeResponse,
      });

      const result = await serviceWithVersion.editGEAddress({
        id: mockAddressId,
        payload: mockEditAddressPayload as any,
      });

      expect(result.version).toBe('1.0.0');
      expect(result.message).toBe('Address edited successfully');
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(utils.formatCreateAddressResponseGE).toHaveBeenCalledWith(
        completeResponse,
      );
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

  describe('getAddressesSavedGe', () => {
    const mockGetAllAddressesGEResponse: ExtGetAllAddressesGEResponse = {
      data: [
        {
          id: 'address-1',
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
        },
        {
          id: 'address-2',
          cp: '94298',
          colonia: 'Las Flores',
          ciudad: 'Boca del Río',
          estado: 'Veracruz',
          nombre: 'María García',
          email: 'maria.garcia@example.com',
          telefono: '+52 229 987 6543',
          empresa: 'Corporativo XYZ',
          rfc: 'MARY010101000',
          calle: 'Calle Principal',
          numero: '456',
          referencia: 'Casa azul',
          alias: 'Oficina Centro',
          users: 'user456',
          createdAt: '2023-10-22T13:00:00Z',
          updatedAt: '2023-10-22T13:00:00Z',
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    const mockConfigWithVersion = {
      ...mockConfig,
      version: '1.0.0',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully get address aliases from Guia Envia', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      mockedAxios.get.mockResolvedValue({
        data: mockGetAllAddressesGEResponse,
      });

      const result = await serviceWithVersion.getAddressesSavedGe({
        aliasesOnly: true,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      const [url, config] = mockedAxios.get.mock.calls[0];
      expect(url).toBe('https://test-guia-envia.com/direcciones?limit=100');
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-ge-api-key',
        },
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          aliases: ['Casa Principal', 'Oficina Centro'],
          addresses: [],
          page: 1,
          pages: 1,
        },
      });
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
        version: '1.0.0',
      } as any);

      await expect(
        serviceWithoutApiKey.getAddressesSavedGe({}),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: '',
        },
        version: '1.0.0',
      } as any);

      await expect(serviceWithoutUri.getAddressesSavedGe({})).rejects.toThrow(
        new BadRequestException(GE_MISSING_URI_ERROR),
      );
    });

    it('should throw BadRequestException when API key is null', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: null as unknown as string,
          uri: 'https://test-guia-envia.com',
        },
        version: '1.0.0',
      } as any);

      await expect(
        serviceWithNullApiKey.getAddressesSavedGe({}),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));
    });

    it('should throw BadRequestException when URI is null', async () => {
      const serviceWithNullUri = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: null as unknown as string,
        },
        version: '1.0.0',
      } as any);

      await expect(serviceWithNullUri.getAddressesSavedGe({})).rejects.toThrow(
        new BadRequestException(GE_MISSING_URI_ERROR),
      );
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const errorMessage = 'Service unavailable';
      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(serviceWithVersion.getAddressesSavedGe({})).rejects.toThrow(
        new BadRequestException(errorMessage),
      );
    });

    it('should throw BadRequestException when axios throws axios error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const axiosError = {
        isAxiosError: true,
        response: {
          data: 'API Error Response',
        },
      };

      mockedAxios.get.mockRejectedValue(axiosError);
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      await expect(serviceWithVersion.getAddressesSavedGe({})).rejects.toThrow(
        new BadRequestException('API Error Response'),
      );
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      // Reject with non-Error object and ensure isAxiosError returns false
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
      mockedAxios.get.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error',
      });

      await expect(serviceWithVersion.getAddressesSavedGe({})).rejects.toThrow(
        new BadRequestException('An unknown error occurred'),
      );
    });

    it('should handle response with empty addresses array', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const emptyResponse: ExtGetAllAddressesGEResponse = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockedAxios.get.mockResolvedValue({
        data: emptyResponse,
      });

      const result = await serviceWithVersion.getAddressesSavedGe({
        aliasesOnly: true,
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          aliases: [],
          addresses: [],
          page: 1,
          pages: 0,
        },
      });
    });

    it('should handle response with undefined data', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      mockedAxios.get.mockResolvedValue({
        data: undefined,
      });

      const result = await serviceWithVersion.getAddressesSavedGe({
        aliasesOnly: true,
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          aliases: [],
          addresses: [],
          page: 1,
          pages: 1,
        },
      });
    });

    it('should handle response with null data property', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const responseWithNullData = {
        data: null,
      };

      mockedAxios.get.mockResolvedValue({
        data: responseWithNullData,
      });

      const result = await serviceWithVersion.getAddressesSavedGe({
        aliasesOnly: true,
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          aliases: [],
          addresses: [],
          page: 1,
          pages: 1,
        },
      });
    });

    it('should handle single address in response', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const singleAddressResponse: ExtGetAllAddressesGEResponse = {
        data: [
          {
            id: 'address-single',
            cp: '72000',
            colonia: 'Centro',
            ciudad: 'Heroica Puebla de Zaragoza',
            estado: 'Puebla',
            nombre: 'Single User',
            email: 'single@example.com',
            telefono: '+52 222 111 1111',
            empresa: 'Single Corp',
            rfc: 'SING010101000',
            calle: 'Single Street',
            numero: '1',
            referencia: 'Single reference',
            alias: 'Single Address',
            users: 'user1',
            createdAt: '2023-10-22T12:00:00Z',
            updatedAt: '2023-10-22T12:00:00Z',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockedAxios.get.mockResolvedValue({
        data: singleAddressResponse,
      });

      const result = await serviceWithVersion.getAddressesSavedGe({
        aliasesOnly: true,
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          aliases: ['Single Address'],
          addresses: [],
          page: 1,
          pages: 1,
        },
      });
      expect(result.data.aliases).toHaveLength(1);
    });

    it('should construct correct URL with addresses endpoint', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      mockedAxios.get.mockResolvedValue({
        data: mockGetAllAddressesGEResponse,
      });

      await serviceWithVersion.getAddressesSavedGe({});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-guia-envia.com/direcciones?limit=100',
        {
          headers: {
            Authorization: 'test-ge-api-key',
          },
        },
      );
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
        version: '1.0.0',
      } as any);

      await expect(
        serviceWithoutApiKey.getAddressesSavedGe({}),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // Verify that validation happens before API call
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle addresses with missing alias gracefully', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const responseWithMissingAlias: ExtGetAllAddressesGEResponse = {
        data: [
          {
            id: 'address-1',
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
            alias: 'Valid Alias',
            users: 'user123',
            createdAt: '2023-10-22T12:00:00Z',
            updatedAt: '2023-10-22T12:00:00Z',
          },
          {
            id: 'address-2',
            cp: '94298',
            colonia: 'Las Flores',
            ciudad: 'Boca del Río',
            estado: 'Veracruz',
            nombre: 'María García',
            email: 'maria.garcia@example.com',
            telefono: '+52 229 987 6543',
            empresa: 'Corporativo XYZ',
            rfc: 'MARY010101000',
            calle: 'Calle Principal',
            numero: '456',
            referencia: 'Casa azul',
            alias: undefined as unknown as string, // Missing alias
            users: 'user456',
            createdAt: '2023-10-22T13:00:00Z',
            updatedAt: '2023-10-22T13:00:00Z',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockedAxios.get.mockResolvedValue({
        data: responseWithMissingAlias,
      });

      const result = await serviceWithVersion.getAddressesSavedGe({
        aliasesOnly: true,
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          aliases: ['Valid Alias', undefined],
          addresses: [],
          page: 1,
          pages: 1,
        },
      });
    });

    it('should construct correct URL with page parameter when provided', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      mockedAxios.get.mockResolvedValue({
        data: mockGetAllAddressesGEResponse,
      });

      await serviceWithVersion.getAddressesSavedGe({ page: '2' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-guia-envia.com/direcciones?limit=100&page=2',
        {
          headers: {
            Authorization: 'test-ge-api-key',
          },
        },
      );
    });

    it('should construct correct URL without page parameter when not provided', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      mockedAxios.get.mockResolvedValue({
        data: mockGetAllAddressesGEResponse,
      });

      await serviceWithVersion.getAddressesSavedGe({});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-guia-envia.com/direcciones?limit=100',
        {
          headers: {
            Authorization: 'test-ge-api-key',
          },
        },
      );
    });

    it('should successfully get address aliases with specific page number', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const page2Response: ExtGetAllAddressesGEResponse = {
        data: [
          {
            id: 'address-3',
            cp: '03100',
            colonia: 'Del Valle',
            ciudad: 'Ciudad de México',
            estado: 'CDMX',
            nombre: 'Pedro López',
            email: 'pedro.lopez@example.com',
            telefono: '+52 555 123 4567',
            empresa: 'Tech Corp',
            rfc: 'LOPE010101000',
            calle: 'Avenida Insurgentes',
            numero: '789',
            referencia: 'Torre empresarial',
            alias: 'Oficina CDMX',
            users: 'user789',
            createdAt: '2023-10-22T14:00:00Z',
            updatedAt: '2023-10-22T14:00:00Z',
          },
        ],
        meta: {
          page: 2,
          limit: 10,
          total: 3,
          pages: 2,
          hasNext: false,
          hasPrev: true,
        },
      };

      mockedAxios.get.mockResolvedValue({
        data: page2Response,
      });

      const result = await serviceWithVersion.getAddressesSavedGe({
        page: '2',
        aliasesOnly: true,
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          aliases: ['Oficina CDMX'],
          addresses: [],
          page: 2,
          pages: 2,
        },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-guia-envia.com/direcciones?limit=100&page=2',
        {
          headers: {
            Authorization: 'test-ge-api-key',
          },
        },
      );
    });

    it('should handle page parameter with undefined value', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      mockedAxios.get.mockResolvedValue({
        data: mockGetAllAddressesGEResponse,
      });

      await serviceWithVersion.getAddressesSavedGe({});

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-guia-envia.com/direcciones?limit=100',
        {
          headers: {
            Authorization: 'test-ge-api-key',
          },
        },
      );
    });
  });

  describe('createGuideGe', () => {
    const mockCreateGuidePayload: CreateGuideGeRequest = {
      quoteId: 'quote-123',
      parcel: {
        length: '30',
        width: '20',
        height: '10',
        weight: '5.0',
        content: 'Electronics',
        satProductId: '43211508',
      },
      origin: {
        alias: 'warehouse-1',
      },
      destination: {
        alias: 'customer-address',
      },
    };

    const mockExtCreateGuideResponse: ExtCreateGuideGEResponse = {
      origen: {
        cp: '72000',
        colonia: 'Centro',
        ciudad: 'Heroica Puebla de Zaragoza',
        estado: 'Puebla',
        nombre: 'Warehouse Manager',
        email: 'warehouse@example.com',
        telefono: '+52 222 123 4567',
        empresa: 'Warehouse SA de CV',
        rfc: 'WARE010101000',
        calle: 'Avenida Industrial',
        numero: '100',
        referencia: 'Warehouse Complex',
        alias: 'warehouse-1',
        users: 'user123',
        createdAt: '2023-10-22T12:00:00Z',
        updatedAt: '2023-10-22T12:00:00Z',
        id: 'address-origin-123',
      },
      destino: {
        cp: '94298',
        colonia: 'Las Flores',
        ciudad: 'Boca del Río',
        estado: 'Veracruz',
        nombre: 'Customer Name',
        email: 'customer@example.com',
        telefono: '+52 229 987 6543',
        empresa: 'Customer Corp',
        rfc: 'CUST010101000',
        calle: 'Calle Principal',
        numero: '456',
        referencia: 'Casa azul',
        alias: 'customer-address',
        users: 'user456',
        createdAt: '2023-10-22T13:00:00Z',
        updatedAt: '2023-10-22T13:00:00Z',
        id: 'address-dest-456',
      },
      envio: [
        {
          envio_id: 'shipment-789',
          servicio: 'Estafeta Express',
          costo: '350.50',
          guia: 'EST123456789',
        },
      ],
      guias: [
        {
          origen: '72000',
          destino: '94298',
          remitente: 'Warehouse Manager',
          destinatario: 'Customer Name',
          numero_guia: 'EST123456789',
          url: 'https://app.guiaenvia.com/guia/EST123456789',
        },
      ],
    };

    const mockFormattedGuideResponse = {
      trackingNumber: 'EST123456789',
      carrier: 'Guia Envia',
      price: '350.50',
      guideLink: 'https://app.guiaenvia.com/guia/EST123456789',
      labelUrl: 'https://app.guiaenvia.com/guia/EST123456789',
      file: null,
      source: 'GE' as const,
    };

    const mockConfigWithVersion = {
      ...mockConfig,
      version: '1.0.0',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully create guide with Guia Envia', async () => {
      // Create service with version in config
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      // Mock utility functions
      jest.spyOn(utils, 'formatCreateGuidePayloadGE').mockReturnValue({
        origen_alias: 'warehouse-1',
        destino_alias: 'customer-address',
        peso: '5.0',
        largo: '30',
        alto: '10',
        ancho: '20',
        sat_id: '43211508',
        contenido: 'Electronics',
        servicio_id: 'quote-123',
      });

      jest
        .spyOn(utils, 'formatCreateGuideResponseGE')
        .mockReturnValue(mockFormattedGuideResponse);

      // Mock axios response
      mockedAxios.post.mockResolvedValue({
        data: mockExtCreateGuideResponse,
      });

      const result = await serviceWithVersion.createGuideGe(
        mockCreateGuidePayload,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, , config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe(
        `https://test-guia-envia.com${CREATE_GUIDE_ENDPOINT_GE}`,
      );
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-ge-api-key',
        },
      });
      expect(utils.formatCreateGuidePayloadGE).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );
      expect(utils.formatCreateGuideResponseGE).toHaveBeenCalledWith(
        mockExtCreateGuideResponse,
      );
      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          guide: mockFormattedGuideResponse,
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
        serviceWithoutApiKey.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
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
        serviceWithoutUri.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
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
        serviceWithNullApiKey.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
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
        serviceWithNullUri.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_URI_ERROR));

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const errorMessage = 'Network error';

      jest.spyOn(utils, 'formatCreateGuidePayloadGE').mockReturnValue({
        origen_alias: 'warehouse-1',
        destino_alias: 'customer-address',
        peso: '5.0',
        largo: '30',
        alto: '10',
        ancho: '20',
        sat_id: '43211508',
        contenido: 'Electronics',
        servicio_id: 'quote-123',
      });

      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(
        serviceWithVersion.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(errorMessage));
    });

    it('should throw BadRequestException when axios throws axios error', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );
      const errorResponse = { message: 'Service unavailable' };

      jest.spyOn(utils, 'formatCreateGuidePayloadGE').mockReturnValue({
        origen_alias: 'warehouse-1',
        destino_alias: 'customer-address',
        peso: '5.0',
        largo: '30',
        alto: '10',
        ancho: '20',
        sat_id: '43211508',
        contenido: 'Electronics',
        servicio_id: 'quote-123',
      });

      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        response: { data: errorResponse },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        serviceWithVersion.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(errorResponse));
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest.spyOn(utils, 'formatCreateGuidePayloadGE').mockReturnValue({
        origen_alias: 'warehouse-1',
        destino_alias: 'customer-address',
        peso: '5.0',
        largo: '30',
        alto: '10',
        ancho: '20',
        sat_id: '43211508',
        contenido: 'Electronics',
        servicio_id: 'quote-123',
      });

      // Reject with non-Error object and mock isAxiosError to return false
      mockedAxios.post.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error',
      });
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        serviceWithVersion.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });

    it('should handle response with undefined data', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest.spyOn(utils, 'formatCreateGuidePayloadGE').mockReturnValue({
        origen_alias: 'warehouse-1',
        destino_alias: 'customer-address',
        peso: '5.0',
        largo: '30',
        alto: '10',
        ancho: '20',
        sat_id: '43211508',
        contenido: 'Electronics',
        servicio_id: 'quote-123',
      });

      jest
        .spyOn(utils, 'formatCreateGuideResponseGE')
        .mockReturnValue(null as any);

      mockedAxios.post.mockResolvedValue({
        data: undefined,
      });

      const result = await serviceWithVersion.createGuideGe(
        mockCreateGuidePayload,
      );

      expect(utils.formatCreateGuideResponseGE).toHaveBeenCalledWith(undefined);
      expect(result.data.guide).toBe(null);
      expect(result.version).toBe('1.0.0');
      expect(result.message).toBe(null);
      expect(result.error).toBe(null);
    });

    it('should construct correct URL with create guide endpoint', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest.spyOn(utils, 'formatCreateGuidePayloadGE').mockReturnValue({
        origen_alias: 'warehouse-1',
        destino_alias: 'customer-address',
        peso: '5.0',
        largo: '30',
        alto: '10',
        ancho: '20',
        sat_id: '43211508',
        contenido: 'Electronics',
        servicio_id: 'quote-123',
      });

      jest
        .spyOn(utils, 'formatCreateGuideResponseGE')
        .mockReturnValue(mockFormattedGuideResponse);

      mockedAxios.post.mockResolvedValue({
        data: mockExtCreateGuideResponse,
      });

      await serviceWithVersion.createGuideGe(mockCreateGuidePayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://test-guia-envia.com${CREATE_GUIDE_ENDPOINT_GE}`,
        expect.any(Object),
        expect.objectContaining({
          headers: {
            Authorization: 'test-ge-api-key',
          },
        }),
      );
    });

    it('should propagate BadRequestException from utils', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      jest.spyOn(utils, 'formatCreateGuidePayloadGE').mockImplementation(() => {
        throw new BadRequestException('Invalid guide payload structure');
      });

      await expect(
        serviceWithVersion.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(
        new BadRequestException('Invalid guide payload structure'),
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

      const formatSpy = jest.spyOn(utils, 'formatCreateGuidePayloadGE');

      // Mock isAxiosError to return false to prevent it from interfering
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(
        serviceWithInvalidConfig.createGuideGe(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(GE_MISSING_API_KEY_ERROR));

      // Verify that validation happens before payload transformation
      expect(formatSpy).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle successful guide creation with all fields populated', async () => {
      const serviceWithVersion = await createServiceWithConfig(
        mockConfigWithVersion,
      );

      const completeFormattedResponse = {
        trackingNumber: 'EST987654321',
        carrier: 'Guia Envia',
        price: '425.75',
        guideLink: 'https://app.guiaenvia.com/guia/EST987654321',
        labelUrl: 'https://app.guiaenvia.com/label/EST987654321.pdf',
        file: 'base64-encoded-file-content',
        source: 'GE' as const,
      };

      jest.spyOn(utils, 'formatCreateGuidePayloadGE').mockReturnValue({
        origen_alias: 'warehouse-1',
        destino_alias: 'customer-address',
        peso: '5.0',
        largo: '30',
        alto: '10',
        ancho: '20',
        sat_id: '43211508',
        contenido: 'Electronics',
        servicio_id: 'quote-123',
      });

      jest
        .spyOn(utils, 'formatCreateGuideResponseGE')
        .mockReturnValue(completeFormattedResponse);

      mockedAxios.post.mockResolvedValue({
        data: mockExtCreateGuideResponse,
      });

      const result = await serviceWithVersion.createGuideGe(
        mockCreateGuidePayload,
      );

      expect(result.data.guide).toEqual(completeFormattedResponse);
      expect(result.data.guide!.trackingNumber).toBe('EST987654321');
      expect(result.data.guide!.carrier).toBe('Guia Envia');
      expect(result.data.guide!.price).toBe('425.75');
      expect(result.data.guide!.guideLink).toBe(
        'https://app.guiaenvia.com/guia/EST987654321',
      );
      expect(result.data.guide!.labelUrl).toBe(
        'https://app.guiaenvia.com/label/EST987654321.pdf',
      );
      expect(result.data.guide!.file).toBe('base64-encoded-file-content');
    });
  });

  describe('getGuides', () => {
    const mockExtGetGuidesGEResponse: ExtGetGuidesGEResponse = {
      data: [
        {
          id: 'guide-1',
          origen: {
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
            referencia: 'Entre calle A y calle B',
            alias: 'Casa Principal',
          },
          destino: {
            cp: '94298',
            colonia: 'Las Flores',
            ciudad: 'Boca del Río',
            estado: 'Veracruz',
            nombre: 'María García',
            email: 'maria.garcia@example.com',
            telefono: '+52 229 987 6543',
            empresa: 'Corporativo XYZ',
            rfc: 'MARY010101000',
            calle: 'Calle Principal',
            numero: '456',
            referencia: 'Casa azul',
            alias: 'Oficina Centro',
          },
          estado: 'completo',
          resumen: {
            total_solicitadas: 1,
            exitosas: 1,
            fallidas: 0,
            costo_total: 156.13,
            fecha_procesamiento: '2026-02-02T17:49:03.813Z',
            tiempo_procesamiento: 19573,
          },
          createdAt: '2026-02-02T17:49:03.813Z',
          updatedAt: '2026-02-02T17:49:03.813Z',
          guias: [
            {
              numero_guia: 'GE123456789',
              url: 'https://app.guiaenvia.com/label/GE123456789.pdf',
              shipment_id: 'shipment-001',
              parcel_id: 'parcel-001',
            },
          ],
          envio: [
            {
              indice: 0,
              envio_id: 'shipment-001',
              servicio: 'Estafeta Express',
              costo: '156.13',
              guia: 'GE123456789',
              estado: 'generado',
              url_etiqueta: 'https://app.guiaenvia.com/label/GE123456789.pdf',
              fecha_generacion: '2026-02-02T17:49:03.813Z',
            },
          ],
        },
        {
          id: 'guide-2',
          origen: {
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
            referencia: 'Entre calle A y calle B',
            alias: 'Casa Principal',
          },
          destino: {
            cp: '03100',
            colonia: 'Del Valle',
            ciudad: 'Ciudad de México',
            estado: 'CDMX',
            nombre: 'Carlos López',
            email: 'carlos.lopez@example.com',
            telefono: '+52 55 1234 5678',
            empresa: 'Tech Corp',
            rfc: 'CARL010101000',
            calle: 'Av. Universidad',
            numero: '789',
            referencia: 'Edificio moderno',
            alias: 'Oficina CDMX',
          },
          estado: 'completo',
          resumen: {
            total_solicitadas: 1,
            exitosas: 1,
            fallidas: 0,
            costo_total: 120.5,
            fecha_procesamiento: '2026-02-03T10:30:00.000Z',
            tiempo_procesamiento: 15000,
          },
          createdAt: '2026-02-03T10:30:00.000Z',
          updatedAt: '2026-02-03T10:30:00.000Z',
          guias: [
            {
              numero_guia: 'DHL987654321',
              url: 'https://app.guiaenvia.com/label/DHL987654321.pdf',
              shipment_id: 'shipment-002',
              parcel_id: 'parcel-002',
            },
          ],
          envio: [
            {
              indice: 0,
              envio_id: 'shipment-002',
              servicio: 'DHL Terrestre',
              costo: '120.5',
              guia: 'DHL987654321',
              estado: 'generado',
              url_etiqueta: 'https://app.guiaenvia.com/label/DHL987654321.pdf',
              fecha_generacion: '2026-02-03T10:30:00.000Z',
            },
          ],
        },
      ],
    };

    const mockFormattedGuides: GetGuideResponse[] = [
      {
        trackingNumber: 'GE123456789',
        shipmentNumber: 'shipment-001',
        source: 'GE',
        status: 'generado',
        carrier: 'Estafeta Express',
        price: '156.13',
        guideLink: null,
        labelUrl: 'https://app.guiaenvia.com/label/GE123456789.pdf',
        file: null,
      },
      {
        trackingNumber: 'DHL987654321',
        shipmentNumber: 'shipment-002',
        source: 'GE',
        status: 'generado',
        carrier: 'DHL Terrestre',
        price: '120.5',
        guideLink: null,
        labelUrl: 'https://app.guiaenvia.com/label/DHL987654321.pdf',
        file: null,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully get guides from Guia Envia', async () => {
      mockedAxios.get.mockResolvedValue({
        data: mockExtGetGuidesGEResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.getGuides();

      expect(result).toEqual(mockFormattedGuides);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockConfig.guiaEnvia.uri}${GET_GUIDES_ENDPOINT_GE}`,
        {
          headers: {
            Authorization: mockConfig.guiaEnvia.apiKey,
          },
        },
      );
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const configWithoutApiKey = {
        guiaEnvia: {
          apiKey: '',
          uri: 'https://test-guia-envia.com',
        },
      };
      service = await createServiceWithConfig(configWithoutApiKey);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      await expect(service.getGuides()).rejects.toThrow(
        GE_MISSING_API_KEY_ERROR,
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const configWithoutUri = {
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: '',
        },
      };
      service = await createServiceWithConfig(configWithoutUri);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      await expect(service.getGuides()).rejects.toThrow(GE_MISSING_URI_ERROR);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when API key is null', async () => {
      const configWithNullApiKey = {
        guiaEnvia: {
          apiKey: null,
          uri: 'https://test-guia-envia.com',
        },
      };
      service = await createServiceWithConfig(configWithNullApiKey as any);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      await expect(service.getGuides()).rejects.toThrow(
        GE_MISSING_API_KEY_ERROR,
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when URI is null', async () => {
      const configWithNullUri = {
        guiaEnvia: {
          apiKey: 'test-ge-api-key',
          uri: null,
        },
      };
      service = await createServiceWithConfig(configWithNullUri as any);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      await expect(service.getGuides()).rejects.toThrow(GE_MISSING_URI_ERROR);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: { error: 'API Error', message: 'Invalid request' },
        },
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when axios throws axios error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: { error: 'Unauthorized', message: 'Invalid API key' },
        },
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      await expect(service.getGuides()).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Invalid API key'),
        }),
      );
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      const unknownError = { some: 'unknown error' };
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockedAxios.get.mockRejectedValue(unknownError);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      await expect(service.getGuides()).rejects.toThrow(
        'An unknown error occurred',
      );
    });

    it('should handle response with empty guides array', async () => {
      const emptyResponse: ExtGetGuidesGEResponse = {
        data: [],
      };

      mockedAxios.get.mockResolvedValue({
        data: emptyResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.getGuides();

      expect(result).toEqual([]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle response with undefined data', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: undefined },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // When data is undefined, formatGetGuidesResponseGE will throw an error
      await expect(service.getGuides()).rejects.toThrow();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle single guide in response', async () => {
      const singleGuideResponse: ExtGetGuidesGEResponse = {
        data: [mockExtGetGuidesGEResponse.data[0]],
      };

      mockedAxios.get.mockResolvedValue({
        data: singleGuideResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.getGuides();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        trackingNumber: 'GE123456789',
        shipmentNumber: 'shipment-001',
        source: 'GE',
        status: 'generado',
        carrier: 'Estafeta Express',
        price: '156.13',
      });
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should construct correct URL with guides endpoint', async () => {
      mockedAxios.get.mockResolvedValue({
        data: mockExtGetGuidesGEResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await service.getGuides();

      const expectedUrl = `${mockConfig.guiaEnvia.uri}${GET_GUIDES_ENDPOINT_GE}`;
      expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl, {
        headers: {
          Authorization: mockConfig.guiaEnvia.apiKey,
        },
      });
    });

    it('should validate configuration before making API call', async () => {
      const invalidConfig = {
        guiaEnvia: {
          apiKey: '',
          uri: '',
        },
      };
      service = await createServiceWithConfig(invalidConfig);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle Error instance correctly', async () => {
      const error = new Error('Generic error message');
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockedAxios.get.mockRejectedValue(error);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
      await expect(service.getGuides()).rejects.toThrow(
        'Generic error message',
      );
    });

    it('should handle guides with missing shipment data gracefully', async () => {
      const guideWithMissingData: ExtGetGuidesGEResponse = {
        data: [
          {
            id: 'guide-3',
            origen: mockExtGetGuidesGEResponse.data[0].origen,
            destino: mockExtGetGuidesGEResponse.data[0].destino,
            estado: 'pendiente',
            resumen: {
              total_solicitadas: 1,
              exitosas: 0,
              fallidas: 1,
              costo_total: 0,
              fecha_procesamiento: '2026-02-04T12:00:00.000Z',
              tiempo_procesamiento: 5000,
            },
            createdAt: '2026-02-04T12:00:00.000Z',
            updatedAt: '2026-02-04T12:00:00.000Z',
            guias: [],
            envio: [],
          },
        ],
      };

      mockedAxios.get.mockResolvedValue({
        data: guideWithMissingData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.getGuides();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        trackingNumber: '',
        shipmentNumber: null,
        source: 'GE',
        status: 'unknown',
        carrier: '',
        price: '0',
        guideLink: null,
        labelUrl: null,
        file: null,
      });
    });

    it('should format multiple guides correctly', async () => {
      mockedAxios.get.mockResolvedValue({
        data: mockExtGetGuidesGEResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await service.getGuides();

      expect(result).toHaveLength(2);
      expect(result[0].trackingNumber).toBe('GE123456789');
      expect(result[0].carrier).toBe('Estafeta Express');
      expect(result[1].trackingNumber).toBe('DHL987654321');
      expect(result[1].carrier).toBe('DHL Terrestre');
    });

    it('should handle network errors from axios', async () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(service.getGuides()).rejects.toThrow(BadRequestException);
    });

    it('should include correct authorization header in request', async () => {
      mockedAxios.get.mockResolvedValue({
        data: mockExtGetGuidesGEResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await service.getGuides();

      expect(mockedAxios.get).toHaveBeenCalledWith(expect.any(String), {
        headers: {
          Authorization: mockConfig.guiaEnvia.apiKey,
        },
      });
    });
  });
});
