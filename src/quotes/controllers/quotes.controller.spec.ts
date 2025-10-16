import { Test, TestingModule } from '@nestjs/testing';
import { QuotesController } from './quotes.controller';
import { QuotesService } from '../services/quotes.service';
import { GetQuoteDto } from '../dtos/quotes.dto';
import { GetQuoteDataResponse } from '../quotes.interface';
import { Reflector } from '@nestjs/core';
import config from '@/config';

describe('QuotesController', () => {
  let controller: QuotesController;
  let quotesService: jest.Mocked<QuotesService>;

  const mockQuoteDto: GetQuoteDto = {
    originPostalCode: '72000',
    destinationPostalCode: '94298',
    weight: 5,
    length: 30,
    height: 20,
    width: 10,
  };

  const mockServiceResponse: GetQuoteDataResponse = {
    version: '1.0.0',
    message: null,
    messages: ['Quotes retrieved successfully'],
    error: null,
    data: {
      quotes: [
        {
          id: 'test-1',
          service: 'Test Service',
          total: 150.75,
          typeService: 'standard',
          courier: 'Estafeta',
          source: 'GE',
        },
      ],
    },
  };

  beforeEach(async () => {
    const mockQuotesService = {
      getQuote: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [
        {
          provide: QuotesService,
          useValue: mockQuotesService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(false), // Mock reflector for JwtGuard
          },
        },
        {
          provide: config.KEY,
          useValue: {
            auth: {
              publicKey: 'test-public-key',
              jwtKey: 'test-jwt-key',
              roleKey: 'test-role-key',
              oneTimeJwtKey: 'test-one-time-jwt-key',
            },
          },
        },
      ],
    }).compile();

    controller = module.get<QuotesController>(QuotesController);
    quotesService = module.get(QuotesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getQuote', () => {
    it('should call QuotesService.getQuote with correct parameters and return result', async () => {
      quotesService.getQuote.mockResolvedValue(mockServiceResponse);

      const result = await controller.getQuote(mockQuoteDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(quotesService.getQuote).toHaveBeenCalledWith(mockQuoteDto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(quotesService.getQuote).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockServiceResponse);
    });

    it('should pass through service exceptions without modification', async () => {
      const serviceError = new Error('Service error');
      quotesService.getQuote.mockRejectedValue(serviceError);

      await expect(controller.getQuote(mockQuoteDto)).rejects.toThrow(
        serviceError,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(quotesService.getQuote).toHaveBeenCalledWith(mockQuoteDto);
    });

    it('should handle DTO validation by accepting valid quote request', async () => {
      quotesService.getQuote.mockResolvedValue(mockServiceResponse);

      const validDto: GetQuoteDto = {
        originPostalCode: '12345',
        destinationPostalCode: '67890',
        weight: 2.5,
        length: 25,
        height: 15,
        width: 8,
      };

      const result = await controller.getQuote(validDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(quotesService.getQuote).toHaveBeenCalledWith(validDto);
      expect(result).toEqual(mockServiceResponse);
    });

    it('should return empty quotes array when service returns empty response', async () => {
      const emptyResponse: GetQuoteDataResponse = {
        ...mockServiceResponse,
        data: { quotes: [] },
        messages: [],
      };

      quotesService.getQuote.mockResolvedValue(emptyResponse);

      const result = await controller.getQuote(mockQuoteDto);

      expect(result.data.quotes).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
    });

    it('should maintain response structure from service', async () => {
      quotesService.getQuote.mockResolvedValue(mockServiceResponse);

      const result = await controller.getQuote(mockQuoteDto);

      // Verify the controller doesn't modify the service response structure
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('quotes');
      expect(result.error).toBeNull();
    });
  });
});
