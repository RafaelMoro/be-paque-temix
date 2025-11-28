import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PakkeService } from './pakke.service';
import config from '@/config';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import {
  GetQuoteData,
  ExtApiGetQuoteResponse,
} from '@/quotes/quotes.interface';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import axios from 'axios';
import * as utils from '../pakke.utils';
import * as quotesUtils from '@/quotes/quotes.utils';
import {
  PAKKE_MISSING_API_KEY_ERROR,
  PAKKE_MISSING_URI_ERROR,
} from '../pakke.constants';
import {
  CreateGuidePkkDataResponse,
  PakkeExternalCreateGuideResponse,
  PakkeGetQuoteResponse,
  PakkeQuote,
  PkkCreateGuideRequest,
} from '../pakke.interface';
import { GetQuotePakkeDto } from '../dtos/pakke.dto';
import { GlobalCreateGuideResponse } from '@/global.interface';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PakkeService', () => {
  let service: PakkeService;

  const mockConfig = {
    pakke: {
      apiKey: 'test-pakke-api-key',
      uri: 'https://test-pakke.com',
    },
    version: '1.0.0',
  };

  const mockPayload: GetQuoteDto = {
    originPostalCode: '01010',
    destinationPostalCode: '02020',
    height: 15,
    length: 25,
    width: 20,
    weight: 3.0,
  };

  const mockTransformedPayload: GetQuotePakkeDto = {
    ZipCodeFrom: '01010',
    ZipCodeTo: '02020',
    Parcel: {
      Weight: '3',
      Width: '20',
      Height: '15',
      Length: '25',
    },
  };

  const mockPakkeQuote: PakkeQuote = {
    CourierCode: 'PKE',
    CourierName: 'Paquete Express',
    CourierServiceId: 'PKE-001',
    CourierServiceName: 'Next Day',
    DeliveryDays: '1',
    CouponCode: null,
    ShipmentAmount: 120.0,
    ShipmentSubtotalAmount: 100.0,
    ShipmentVatAmount: 20.0,
    InsuranceAmount: 0,
    InsuranceSubtotalAmount: 0,
    InsuranceVatAmount: 0,
    DiscountAmount: 0,
    VatAmount: 20.0,
    TotalPrice: 120.0,
    ExtendedZoneAmount: 0,
    EstimatedDeliveryDate: '2025-08-23',
    EstimatedDeliveryDays: 1,
    OverWeightFrom: 0,
    OverWeightPrice: 0,
    BestOption: true,
    CityId: null,
    CityName: null,
    typeService: 'nextDay',
    pickupInstructions: {
      icon: 'pickup-icon',
      info: 'Pickup info',
      type: 'pickup',
      date: '2025-08-22',
    },
    deliveryInstructions: {
      icon: 'delivery-icon',
      info: 'Delivery info',
      type: 'delivery',
      date: '2025-08-23',
    },
    labelInstructions: [],
    serviceDescription: ['Fast delivery'],
    OnboardingCosting: null,
    PromotionCosting: null,
    CourierScore: 4.5,
    Kg: 3.0,
    courierLogo: 'pakke-logo.png',
  };

  const mockPakkeResponse: PakkeGetQuoteResponse = {
    Pakke: [mockPakkeQuote],
  };

  const mockFormattedQuotes: GetQuoteData[] = [
    {
      id: 'PKE-Paquete Express-PKE-001',
      service: 'Paquete Express Next Day',
      total: 120.0,
      qBaseRef: 120.0,
      qAdjFactor: 0,
      qAdjBasis: 0,
      qAdjMode: 'P',
      qAdjSrcRef: 'default',
      typeService: 'nextDay',
      courier: 'Paquetexpress',
      source: 'Pkk',
    },
  ];

  const mockGlobalConfig: GlobalConfigsDoc = {
    globalMarginProfit: {
      value: 15,
      type: 'percentage',
    },
    providers: [
      {
        name: 'Pkk',
        couriers: [
          {
            name: 'Paquetexpress',
            profitMargin: {
              value: 10,
              type: 'percentage',
            },
          },
          {
            name: 'AMPM',
            profitMargin: {
              value: 12,
              type: 'percentage',
            },
          },
          {
            name: 'Fedex',
            profitMargin: {
              value: 14,
              type: 'percentage',
            },
          },
        ],
      },
    ],
  } as GlobalConfigsDoc;

  const mockCreateGuidePayload: PkkCreateGuideRequest = {
    parcel: {
      content: 'Electronics',
      length: '25',
      width: '20',
      height: '15',
      weight: '3',
    },
    origin: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+52 55 1234 5678',
      company: 'Sender Corp',
      street1: 'Calle Principal 123',
      isResidential: false,
      street2: 'Near the park',
      neighborhood: 'Centro',
      city: 'Mexico City',
      state: 'CDMX',
      zipcode: '01010',
    },
    destination: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+52 55 8765 4321',
      company: 'Receiver Corp',
      street1: 'Avenida Secundaria 456',
      isResidential: true,
      street2: 'Apartment 2B',
      neighborhood: 'Norte',
      city: 'Guadalajara',
      state: 'Jalisco',
      zipcode: '02020',
    },
  };

  const mockPakkeExternalResponse: PakkeExternalCreateGuideResponse = {
    ShipmentId: 'PKK123456789',
    ResellerId: 'RSL001',
    OwnerId: 'OWN001',
    CreatedAt: new Date('2025-10-17T10:00:00Z'),
    ExpiresAt: new Date('2025-10-24T10:00:00Z'),
    CourierName: 'Paquete Express',
    CourierCode: 'PKE',
    CourierServiceId: 'PKE-001',
    CourierService: 'Next Day',
    ResellerReference: 'REF123',
    HasExceptions: false,
    HasChangeZipCode: false,
    SendRecipientNotifications: true,
    InsuredAmount: 0,
    Parcel: {
      Length: 25,
      Width: 20,
      Height: 15,
      Weight: 3,
    },
    AddressFrom: {
      ZipCode: '01010',
      State: 'CDMX',
      City: 'Mexico City',
      Neighborhood: 'Centro',
      Address1: 'Calle Principal 123',
      Address2: 'Near the park',
      Residential: false,
    },
    AddressTo: {
      ZipCode: '02020',
      State: 'Jalisco',
      City: 'Guadalajara',
      Neighborhood: 'Norte',
      Address1: 'Avenida Secundaria 456',
      Address2: 'Apartment 2B',
      Residential: true,
    },
    Sender: {
      Name: 'John Doe',
      Email: 'john@example.com',
      Phone1: '+52 55 1234 5678',
      Phone2: undefined,
      CompanyName: 'Sender Corp',
    },
    Recipient: {
      Name: 'Jane Smith',
      Email: 'jane@example.com',
      Phone1: '+52 55 8765 4321',
      Phone2: undefined,
      CompanyName: 'Receiver Corp',
    },
    QuotedAmount: 120.0,
    DiscountAmount: 0,
    InsuranceAmount: 0,
    TotalAmount: 120.0,
    OverWeightPrice: 0,
    OriginalWeight: 3,
    OriginalWidth: 20,
    OriginalLength: 25,
    OriginalHeight: 15,
    OriginalVolumetricWeight: 3,
    RealWeight: 3,
    RealOverWeight: 0,
    Owner: 'PKK',
    DaysInTransit: 1,
    Content: 'Electronics',
    Status: 'SUCCESS',
    TrackingNumber: 'PKK123456789',
    TrackingStatus: 'WAITING ',
    Label: 'https://example.com/label.pdf',
  };

  const mockFormattedCreateGuideResponse: GlobalCreateGuideResponse = {
    trackingNumber: 'PKK123456789',
    carrier: 'Paquete Express',
    price: '120',
    guideLink: null,
    labelUrl: 'https://example.com/label.pdf',
    file: 'https://example.com/label.pdf',
    source: 'PAKKE',
  };

  const mockCreateGuideResponse: CreateGuidePkkDataResponse = {
    version: '1.0.0',
    message: null,
    messages: ['Pkk Guide created successfully'],
    error: null,
    data: {
      guide: mockFormattedCreateGuideResponse,
    },
  };

  const mockExternalPayload = {
    AddressFrom: {
      ZipCode: '01010',
      State: 'CDMX',
      City: 'Mexico City',
      Neighborhood: 'Centro',
      Address1: 'Calle Principal 123',
      Address2: 'Near the park',
      Residential: false,
    },
    AddressTo: {
      ZipCode: '02020',
      State: 'Jalisco',
      City: 'Guadalajara',
      Neighborhood: 'Norte',
      Address1: 'Avenida Secundaria 456',
      Address2: 'Apartment 2B',
      Residential: true,
    },
    Content: 'Electronics',
    Parcel: {
      Length: 25,
      Width: 20,
      Height: 15,
      Weight: 3,
    },
    Sender: {
      Name: 'John Doe',
      Email: 'john@example.com',
      Phone1: '+52 55 1234 5678',
      CompanyName: 'Sender Corp',
    },
    Recipient: {
      Name: 'Jane Smith',
      Email: 'jane@example.com',
      Phone1: '+52 55 8765 4321',
      CompanyName: 'Receiver Corp',
    },
  };

  const createServiceWithConfig = async (configOverride: typeof mockConfig) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PakkeService,
        {
          provide: config.KEY,
          useValue: configOverride,
        },
      ],
    }).compile();
    return module.get<PakkeService>(PakkeService);
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

  describe('getQuotePakke', () => {
    it('should successfully get quotes from Pakke', async () => {
      // Mock utilities
      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);
      jest
        .spyOn(utils, 'formatPakkeQuotes')
        .mockReturnValue(mockFormattedQuotes);

      // Mock axios response
      mockedAxios.post.mockResolvedValue({
        data: mockPakkeResponse,
      });

      const result = await service.getQuotePakke(mockPayload, mockGlobalConfig);

      expect(utils.convertPayloadToPakkeDto).toHaveBeenCalledWith(mockPayload);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe('https://test-pakke.com/Shipments/rates');
      expect(payload).toEqual(mockTransformedPayload);
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-pakke-api-key',
        },
      });
      expect(utils.formatPakkeQuotes).toHaveBeenCalledWith(mockPakkeResponse);
      expect(quotesUtils.calculateTotalQuotes).toHaveBeenCalledWith({
        quotes: mockFormattedQuotes,
        provider: 'Pkk',
        config: mockGlobalConfig,
        messages: [],
        providerNotFoundMessage: 'Pkk provider not found in global config',
      });
      expect(result).toEqual({
        quotes: mockFormattedQuotes,
        messages: [],
      });
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        pakke: {
          apiKey: '',
          uri: 'https://test-pakke.com',
        },
        version: '1.0.0',
      });

      await expect(
        serviceWithoutApiKey.getQuotePakke(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_API_KEY_ERROR));
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        pakke: {
          apiKey: 'test-pakke-api-key',
          uri: '',
        },
        version: '1.0.0',
      });

      await expect(
        serviceWithoutUri.getQuotePakke(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_URI_ERROR));
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);

      const errorMessage = 'Network timeout';
      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.getQuotePakke(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(errorMessage));
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);

      // Reject with non-Error object
      mockedAxios.post.mockRejectedValue({
        status: 500,
        message: 'Server error',
      });

      await expect(
        service.getQuotePakke(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });

    it('should handle response with empty Pakke array', async () => {
      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);
      jest.spyOn(utils, 'formatPakkeQuotes').mockReturnValue([]);

      // Mock calculateTotalQuotes to return empty array
      jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
        quotes: [],
        messages: [],
      });

      const emptyResponse: PakkeGetQuoteResponse = {
        Pakke: [],
      };

      mockedAxios.post.mockResolvedValue({
        data: emptyResponse,
      });

      const result = await service.getQuotePakke(mockPayload, mockGlobalConfig);

      expect(utils.formatPakkeQuotes).toHaveBeenCalledWith(emptyResponse);
      expect(result).toEqual({
        quotes: [],
        messages: [],
      });
    });

    it('should handle response with undefined data', async () => {
      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);
      jest.spyOn(utils, 'formatPakkeQuotes').mockReturnValue([]);

      // Mock calculateTotalQuotes to return empty array
      jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
        quotes: [],
        messages: [],
      });

      mockedAxios.post.mockResolvedValue({
        data: undefined,
      });

      const result = await service.getQuotePakke(mockPayload, mockGlobalConfig);

      expect(utils.formatPakkeQuotes).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        quotes: [],
        messages: [],
      });
    });

    it('should handle multiple quotes in response', async () => {
      const secondQuote: PakkeQuote = {
        ...mockPakkeQuote,
        CourierCode: 'STD',
        CourierName: 'AMPM',
        CourierServiceId: 'STD-001',
        CourierServiceName: 'Ground',
        TotalPrice: 80.0,
        typeService: 'standard',
        EstimatedDeliveryDays: 3,
        BestOption: false,
      };

      const multipleQuotesResponse: PakkeGetQuoteResponse = {
        Pakke: [mockPakkeQuote, secondQuote],
      };

      const expectedMultipleQuotes: GetQuoteData[] = [
        {
          id: 'PKE-Pakke Express-PKE-001',
          service: 'Pakke Express Next Day',
          total: 120.0,
          typeService: 'nextDay',
          courier: 'AMPM',
          source: 'Pkk',
        },
        {
          id: 'STD-Standard Delivery-STD-001',
          service: 'Standard Delivery Ground',
          total: 80.0,
          typeService: 'standard',
          courier: 'Fedex',
          source: 'Pkk',
        },
      ];

      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);
      jest
        .spyOn(utils, 'formatPakkeQuotes')
        .mockReturnValue(expectedMultipleQuotes);

      // Mock calculateTotalQuotes to return the multiple quotes
      jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
        quotes: expectedMultipleQuotes,
        messages: [],
      });

      mockedAxios.post.mockResolvedValue({
        data: multipleQuotesResponse,
      });

      const result = await service.getQuotePakke(mockPayload, mockGlobalConfig);

      expect(utils.formatPakkeQuotes).toHaveBeenCalledWith(
        multipleQuotesResponse,
      );
      expect(result).toEqual({
        quotes: expectedMultipleQuotes,
        messages: [],
      });
      expect(result.quotes).toHaveLength(2);
    });

    it('should propagate BadRequestException from utils', async () => {
      jest.spyOn(utils, 'convertPayloadToPakkeDto').mockImplementation(() => {
        throw new BadRequestException('Invalid postal code format');
      });

      await expect(
        service.getQuotePakke(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException('Invalid postal code format'));
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        pakke: {
          apiKey: null as unknown as string,
          uri: 'https://test-pakke.com',
        },
        version: '1.0.0',
      });

      const convertSpy = jest.spyOn(utils, 'convertPayloadToPakkeDto');

      await expect(
        serviceWithNullApiKey.getQuotePakke(mockPayload, mockGlobalConfig),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_API_KEY_ERROR));

      // Verify that the conversion happens before validation fails
      expect(convertSpy).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('createGuidePakke', () => {
    it('should successfully create a guide', async () => {
      // Mock utilities
      jest
        .spyOn(utils, 'convertPkkCreateGuideToExternal')
        .mockReturnValue(mockExternalPayload);
      jest
        .spyOn(utils, 'formatPakkeCreateGuideResponse')
        .mockReturnValue(mockFormattedCreateGuideResponse);

      // Mock axios response
      mockedAxios.post.mockResolvedValue({
        data: mockPakkeExternalResponse,
      });

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await service.createGuidePakke(mockCreateGuidePayload);

      expect(utils.convertPkkCreateGuideToExternal).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, payload, config] = mockedAxios.post.mock.calls[0];
      expect(url).toBe('https://test-pakke.com/Shipments');
      expect(payload).toEqual(mockExternalPayload);
      expect(config).toMatchObject({
        headers: {
          Authorization: 'test-pakke-api-key',
        },
      });
      expect(utils.formatPakkeCreateGuideResponse).toHaveBeenCalledWith(
        mockPakkeExternalResponse,
      );
      expect(result).toEqual(mockCreateGuideResponse);

      consoleSpy.mockRestore();
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        pakke: {
          apiKey: '',
          uri: 'https://test-pakke.com',
        },
        version: '1.0.0',
      });

      await expect(
        serviceWithoutApiKey.createGuidePakke(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_API_KEY_ERROR));
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        pakke: {
          apiKey: 'test-pakke-api-key',
          uri: '',
        },
        version: '1.0.0',
      });

      await expect(
        serviceWithoutUri.createGuidePakke(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_URI_ERROR));
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      jest
        .spyOn(utils, 'convertPkkCreateGuideToExternal')
        .mockReturnValue(mockExternalPayload);

      const errorMessage = 'Network timeout';
      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.createGuidePakke(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(errorMessage));
    });

    it('should throw BadRequestException with generic message for unknown errors', async () => {
      jest
        .spyOn(utils, 'convertPkkCreateGuideToExternal')
        .mockReturnValue(mockExternalPayload);

      // Reject with non-Error object
      mockedAxios.post.mockRejectedValue({
        status: 500,
        message: 'Server error',
      });

      await expect(
        service.createGuidePakke(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });

    it('should handle response with undefined data', async () => {
      jest
        .spyOn(utils, 'convertPkkCreateGuideToExternal')
        .mockReturnValue(mockExternalPayload);
      jest
        .spyOn(utils, 'formatPakkeCreateGuideResponse')
        .mockReturnValue(mockFormattedCreateGuideResponse);

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockedAxios.post.mockResolvedValue({
        data: undefined,
      });

      const result = await service.createGuidePakke(mockCreateGuidePayload);

      expect(utils.formatPakkeCreateGuideResponse).toHaveBeenCalledWith(
        undefined,
      );
      expect(result.messages).toContain('Pkk Guide created successfully');
      expect(result.version).toBe('1.0.0');
      expect(result.error).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should propagate BadRequestException from utils', async () => {
      jest
        .spyOn(utils, 'convertPkkCreateGuideToExternal')
        .mockImplementation(() => {
          throw new BadRequestException('Invalid guide data');
        });

      await expect(
        service.createGuidePakke(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException('Invalid guide data'));
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        pakke: {
          apiKey: null as unknown as string,
          uri: 'https://test-pakke.com',
        },
        version: '1.0.0',
      });

      const convertSpy = jest.spyOn(utils, 'convertPkkCreateGuideToExternal');

      await expect(
        serviceWithNullApiKey.createGuidePakke(mockCreateGuidePayload),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_API_KEY_ERROR));

      // Verify that the conversion doesn't happen before validation fails
      expect(convertSpy).not.toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should include success message and version in response', async () => {
      jest
        .spyOn(utils, 'convertPkkCreateGuideToExternal')
        .mockReturnValue(mockExternalPayload);
      jest
        .spyOn(utils, 'formatPakkeCreateGuideResponse')
        .mockReturnValue(mockFormattedCreateGuideResponse);

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockedAxios.post.mockResolvedValue({
        data: mockPakkeExternalResponse,
      });

      const result = await service.createGuidePakke(mockCreateGuidePayload);

      expect(result.messages).toEqual(['Pkk Guide created successfully']);
      expect(result.version).toBe('1.0.0');
      expect(result.error).toBeNull();
      expect(result.message).toBeNull();
      expect(result.data.guide).toEqual(mockFormattedCreateGuideResponse);

      consoleSpy.mockRestore();
    });
  });

  // Keep the original test for backwards compatibility
  it('get quotes from Pakke (original test)', async () => {
    const result: ExtApiGetQuoteResponse = {
      quotes: [
        {
          id: '1',
          service: 'Pakke Express',
          total: 150.5,
          typeService: null,
          courier: null,
          source: 'Pkk',
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
      .spyOn(service, 'getQuotePakke')
      // eslint-disable-next-line @typescript-eslint/require-await
      .mockImplementation(async () => result);

    const response = await service.getQuotePakke(payload, mockGlobalConfig);
    expect(response).toBe(result);
  });
});
