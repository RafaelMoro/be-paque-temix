import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PakkeService } from './pakke.service';
import config from '@/config';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GetQuoteData } from '@/quotes/quotes.interface';
import axios from 'axios';
import * as utils from '../pakke.utils';
import {
  PAKKE_MISSING_API_KEY_ERROR,
  PAKKE_MISSING_URI_ERROR,
} from '../pakke.constants';
import { PakkeGetQuoteResponse, PakkeQuote } from '../pakke.interface';
import { GetQuotePakkeDto } from '../dtos/pakke.dto';

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
      id: 'PKE-Pakke Express-PKE-001',
      service: 'Pakke Express Next Day',
      total: 120.0,
      typeService: 'nextDay',
      courier: 'Paquetexpress',
      source: 'Pkk',
    },
  ];

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

      const result = await service.getQuotePakke(mockPayload);

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
      expect(result).toEqual(mockFormattedQuotes);
    });

    it('should throw BadRequestException when API key is missing', async () => {
      const serviceWithoutApiKey = await createServiceWithConfig({
        pakke: {
          apiKey: '',
          uri: 'https://test-pakke.com',
        },
      });

      await expect(
        serviceWithoutApiKey.getQuotePakke(mockPayload),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_API_KEY_ERROR));
    });

    it('should throw BadRequestException when URI is missing', async () => {
      const serviceWithoutUri = await createServiceWithConfig({
        pakke: {
          apiKey: 'test-pakke-api-key',
          uri: '',
        },
      });

      await expect(
        serviceWithoutUri.getQuotePakke(mockPayload),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_URI_ERROR));
    });

    it('should throw BadRequestException when axios throws an error', async () => {
      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);

      const errorMessage = 'Network timeout';
      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(service.getQuotePakke(mockPayload)).rejects.toThrow(
        new BadRequestException(errorMessage),
      );
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

      await expect(service.getQuotePakke(mockPayload)).rejects.toThrow(
        new BadRequestException('An unknown error occurred'),
      );
    });

    it('should handle response with empty Pakke array', async () => {
      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);
      jest.spyOn(utils, 'formatPakkeQuotes').mockReturnValue([]);

      const emptyResponse: PakkeGetQuoteResponse = {
        Pakke: [],
      };

      mockedAxios.post.mockResolvedValue({
        data: emptyResponse,
      });

      const result = await service.getQuotePakke(mockPayload);

      expect(utils.formatPakkeQuotes).toHaveBeenCalledWith(emptyResponse);
      expect(result).toEqual([]);
    });

    it('should handle response with undefined data', async () => {
      jest
        .spyOn(utils, 'convertPayloadToPakkeDto')
        .mockReturnValue(mockTransformedPayload);
      jest.spyOn(utils, 'formatPakkeQuotes').mockReturnValue([]);

      mockedAxios.post.mockResolvedValue({
        data: undefined,
      });

      const result = await service.getQuotePakke(mockPayload);

      expect(utils.formatPakkeQuotes).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([]);
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

      mockedAxios.post.mockResolvedValue({
        data: multipleQuotesResponse,
      });

      const result = await service.getQuotePakke(mockPayload);

      expect(utils.formatPakkeQuotes).toHaveBeenCalledWith(
        multipleQuotesResponse,
      );
      expect(result).toEqual(expectedMultipleQuotes);
      expect(result).toHaveLength(2);
    });

    it('should propagate BadRequestException from utils', async () => {
      jest.spyOn(utils, 'convertPayloadToPakkeDto').mockImplementation(() => {
        throw new BadRequestException('Invalid postal code format');
      });

      await expect(service.getQuotePakke(mockPayload)).rejects.toThrow(
        new BadRequestException('Invalid postal code format'),
      );
    });

    it('should validate configuration before making API call', async () => {
      const serviceWithNullApiKey = await createServiceWithConfig({
        pakke: {
          apiKey: null as unknown as string,
          uri: 'https://test-pakke.com',
        },
      });

      const convertSpy = jest.spyOn(utils, 'convertPayloadToPakkeDto');

      await expect(
        serviceWithNullApiKey.getQuotePakke(mockPayload),
      ).rejects.toThrow(new BadRequestException(PAKKE_MISSING_API_KEY_ERROR));

      // Verify that the conversion happens before validation fails
      expect(convertSpy).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  // Keep the original test for backwards compatibility
  it('get quotes from Pakke (original test)', async () => {
    const result: GetQuoteData[] = [
      {
        id: '1',
        service: 'Pakke Express',
        total: 150.5,
        typeService: null,
        courier: null,
        source: 'Pkk',
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
      .spyOn(service, 'getQuotePakke')
      // eslint-disable-next-line @typescript-eslint/require-await
      .mockImplementation(async () => result);

    const response = await service.getQuotePakke(payload);
    expect(response).toBe(result);
  });
});
