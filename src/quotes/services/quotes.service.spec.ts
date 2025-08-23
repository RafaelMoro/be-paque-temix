import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { QuotesService } from './quotes.service';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { ManuableService } from '@/manuable/services/manuable.service';
import { PakkeService } from '@/pakke/services/pakke.service';
import { T1Service } from '@/t1/services/t1.service';
import { GetQuoteDto } from '../dtos/quotes.dto';
import { GetQuoteData } from '../quotes.interface';
import config from '@/config';

describe('QuotesService', () => {
  let service: QuotesService;
  let guiaEnviaService: jest.Mocked<GuiaEnviaService>;
  let manuableService: jest.Mocked<ManuableService>;
  let pakkeService: jest.Mocked<PakkeService>;
  let t1Service: jest.Mocked<T1Service>;
  let configService: ConfigType<typeof config>;

  const mockQuoteDto: GetQuoteDto = {
    originPostalCode: '72000',
    destinationPostalCode: '94298',
    weight: 5,
    length: 30,
    height: 20,
    width: 10,
  };

  const mockGeQuotes: GetQuoteData[] = [
    {
      id: 'ge-1',
      service: 'Estafeta Standard',
      total: 150.5,
      typeService: 'standard',
      courier: 'Estafeta',
      source: 'GE',
    },
    {
      id: 'ge-2',
      service: 'DHL Express',
      total: 250.75,
      typeService: 'nextDay',
      courier: 'DHL',
      source: 'GE',
    },
  ];

  const mockT1Quotes: GetQuoteData[] = [
    {
      id: 't1-1',
      service: 'UPS Ground',
      total: 180.25,
      typeService: 'standard',
      courier: 'UPS',
      source: 'TONE',
    },
  ];

  const mockPakkeQuotes: GetQuoteData[] = [
    {
      id: 'pkk-1',
      service: 'Fedex Standard',
      total: 200,
      typeService: 'standard',
      courier: 'Fedex',
      source: 'Pkk',
    },
  ];

  const mockManuableResponse = {
    quotes: [
      {
        id: 'mn-1',
        service: 'Tres Guerras Express',
        total: 120.5,
        typeService: 'nextDay' as const,
        courier: 'Tres guerras' as const,
        source: 'Mn' as const,
      },
    ],
    messages: ['Manuable service response'],
  };

  beforeEach(async () => {
    const mockGuiaEnviaService = {
      getQuote: jest.fn(),
    };

    const mockManuableService = {
      retrieveManuableQuotes: jest.fn(),
    };

    const mockPakkeService = {
      getQuotePakke: jest.fn(),
    };

    const mockT1Service = {
      getQuote: jest.fn(),
    };

    const mockConfigService = {
      version: '1.0.0',
      frontend: {
        uri: 'http://localhost',
        port: '3000',
      },
      environment: 'development',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        {
          provide: GuiaEnviaService,
          useValue: mockGuiaEnviaService,
        },
        {
          provide: ManuableService,
          useValue: mockManuableService,
        },
        {
          provide: PakkeService,
          useValue: mockPakkeService,
        },
        {
          provide: T1Service,
          useValue: mockT1Service,
        },
        {
          provide: config.KEY,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
    guiaEnviaService = module.get(GuiaEnviaService);
    manuableService = module.get(ManuableService);
    pakkeService = module.get(PakkeService);
    t1Service = module.get(T1Service);
    configService = module.get(config.KEY);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getQuote', () => {
    it('should return quotes from all services successfully', async () => {
      guiaEnviaService.getQuote.mockResolvedValue(mockGeQuotes);
      t1Service.getQuote.mockResolvedValue(mockT1Quotes);
      pakkeService.getQuotePakke.mockResolvedValue(mockPakkeQuotes);
      manuableService.retrieveManuableQuotes.mockResolvedValue(
        mockManuableResponse,
      );

      const result = await service.getQuote(mockQuoteDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(guiaEnviaService.getQuote).toHaveBeenCalledWith(mockQuoteDto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(t1Service.getQuote).toHaveBeenCalledWith(mockQuoteDto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(pakkeService.getQuotePakke).toHaveBeenCalledWith(mockQuoteDto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(manuableService.retrieveManuableQuotes).toHaveBeenCalledWith(
        mockQuoteDto,
      );

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        messages: ['Manuable service response'],
        error: null,
        data: {
          quotes: [
            ...mockGeQuotes,
            ...mockT1Quotes,
            ...mockPakkeQuotes,
            ...mockManuableResponse.quotes,
          ],
        },
      });
    });

    it('should handle GuiaEnvia service failure gracefully', async () => {
      guiaEnviaService.getQuote.mockRejectedValue(
        new Error('GE service failed'),
      );
      t1Service.getQuote.mockResolvedValue(mockT1Quotes);
      pakkeService.getQuotePakke.mockResolvedValue(mockPakkeQuotes);
      manuableService.retrieveManuableQuotes.mockResolvedValue(
        mockManuableResponse,
      );

      const result = await service.getQuote(mockQuoteDto);

      expect(result.messages).toContain('GE failed to get quotes');
      expect(result.data.quotes).toEqual([
        ...mockT1Quotes,
        ...mockPakkeQuotes,
        ...mockManuableResponse.quotes,
      ]);
    });

    it('should handle T1 service failure gracefully', async () => {
      guiaEnviaService.getQuote.mockResolvedValue(mockGeQuotes);
      t1Service.getQuote.mockRejectedValue(new Error('T1 service failed'));
      pakkeService.getQuotePakke.mockResolvedValue(mockPakkeQuotes);
      manuableService.retrieveManuableQuotes.mockResolvedValue(
        mockManuableResponse,
      );

      const result = await service.getQuote(mockQuoteDto);

      expect(result.messages).toContain('T1 failed to get quotes');
      expect(result.data.quotes).toEqual([
        ...mockGeQuotes,
        ...mockPakkeQuotes,
        ...mockManuableResponse.quotes,
      ]);
    });

    it('should handle Pakke service failure gracefully', async () => {
      guiaEnviaService.getQuote.mockResolvedValue(mockGeQuotes);
      t1Service.getQuote.mockResolvedValue(mockT1Quotes);
      pakkeService.getQuotePakke.mockRejectedValue(
        new Error('Pakke service failed'),
      );
      manuableService.retrieveManuableQuotes.mockResolvedValue(
        mockManuableResponse,
      );

      const result = await service.getQuote(mockQuoteDto);

      expect(result.messages).toContain('Pkk failed to get quotes');
      expect(result.data.quotes).toEqual([
        ...mockGeQuotes,
        ...mockT1Quotes,
        ...mockManuableResponse.quotes,
      ]);
    });

    it('should handle Manuable service failure gracefully', async () => {
      guiaEnviaService.getQuote.mockResolvedValue(mockGeQuotes);
      t1Service.getQuote.mockResolvedValue(mockT1Quotes);
      pakkeService.getQuotePakke.mockResolvedValue(mockPakkeQuotes);
      manuableService.retrieveManuableQuotes.mockRejectedValue(
        new Error('Manuable service failed'),
      );

      const result = await service.getQuote(mockQuoteDto);

      expect(result.messages).toContain('Mn failed to get quotes');
      expect(result.data.quotes).toEqual([
        ...mockGeQuotes,
        ...mockT1Quotes,
        ...mockPakkeQuotes,
      ]);
    });

    it('should handle multiple service failures', async () => {
      guiaEnviaService.getQuote.mockRejectedValue(
        new Error('GE service failed'),
      );
      t1Service.getQuote.mockRejectedValue(new Error('T1 service failed'));
      pakkeService.getQuotePakke.mockResolvedValue(mockPakkeQuotes);
      manuableService.retrieveManuableQuotes.mockResolvedValue(
        mockManuableResponse,
      );

      const result = await service.getQuote(mockQuoteDto);

      expect(result.messages).toContain('GE failed to get quotes');
      expect(result.messages).toContain('T1 failed to get quotes');
      expect(result.messages).toContain('Manuable service response');
      expect(result.data.quotes).toEqual([
        ...mockPakkeQuotes,
        ...mockManuableResponse.quotes,
      ]);
    });

    it('should handle all services failing', async () => {
      guiaEnviaService.getQuote.mockRejectedValue(
        new Error('GE service failed'),
      );
      t1Service.getQuote.mockRejectedValue(new Error('T1 service failed'));
      pakkeService.getQuotePakke.mockRejectedValue(
        new Error('Pakke service failed'),
      );
      manuableService.retrieveManuableQuotes.mockRejectedValue(
        new Error('Manuable service failed'),
      );

      const result = await service.getQuote(mockQuoteDto);

      expect(result.messages).toContain('GE failed to get quotes');
      expect(result.messages).toContain('T1 failed to get quotes');
      expect(result.messages).toContain('Pkk failed to get quotes');
      expect(result.messages).toContain('Mn failed to get quotes');
      expect(result.data.quotes).toEqual([]);
    });

    it('should handle empty responses from services', async () => {
      guiaEnviaService.getQuote.mockResolvedValue([]);
      t1Service.getQuote.mockResolvedValue([]);
      pakkeService.getQuotePakke.mockResolvedValue([]);
      manuableService.retrieveManuableQuotes.mockResolvedValue({
        quotes: [],
        messages: [],
      });

      const result = await service.getQuote(mockQuoteDto);

      expect(result.messages).toEqual([]);
      expect(result.data.quotes).toEqual([]);
    });

    it('should include Manuable messages when available', async () => {
      const manuableResponseWithMessages = {
        quotes: mockManuableResponse.quotes,
        messages: [
          'Warning: Limited coverage',
          'Info: Additional charges may apply',
        ],
      };

      guiaEnviaService.getQuote.mockResolvedValue(mockGeQuotes);
      t1Service.getQuote.mockResolvedValue(mockT1Quotes);
      pakkeService.getQuotePakke.mockResolvedValue(mockPakkeQuotes);
      manuableService.retrieveManuableQuotes.mockResolvedValue(
        manuableResponseWithMessages,
      );

      const result = await service.getQuote(mockQuoteDto);

      expect(result.messages).toContain('Warning: Limited coverage');
      expect(result.messages).toContain('Info: Additional charges may apply');
    });

    it('should handle Manuable response without messages', async () => {
      const manuableResponseWithoutMessages = {
        quotes: mockManuableResponse.quotes,
        messages: [],
      };

      guiaEnviaService.getQuote.mockResolvedValue(mockGeQuotes);
      t1Service.getQuote.mockResolvedValue(mockT1Quotes);
      pakkeService.getQuotePakke.mockResolvedValue(mockPakkeQuotes);
      manuableService.retrieveManuableQuotes.mockResolvedValue(
        manuableResponseWithoutMessages,
      );

      const result = await service.getQuote(mockQuoteDto);

      expect(result.data.quotes).toEqual([
        ...mockGeQuotes,
        ...mockT1Quotes,
        ...mockPakkeQuotes,
        ...mockManuableResponse.quotes,
      ]);
    });

    it('should throw BadRequestException for unexpected errors', async () => {
      // Make all services throw errors that would cause Promise.allSettled to reject unexpectedly
      const unexpectedError = new Error('Unexpected system error');

      // Mock config service to throw error during version access
      Object.defineProperty(configService, 'version', {
        get: () => {
          throw unexpectedError;
        },
        configurable: true,
      });

      guiaEnviaService.getQuote.mockResolvedValue([]);
      t1Service.getQuote.mockResolvedValue([]);
      pakkeService.getQuotePakke.mockResolvedValue([]);
      manuableService.retrieveManuableQuotes.mockResolvedValue({
        quotes: [],
        messages: [],
      });

      await expect(service.getQuote(mockQuoteDto)).rejects.toThrow(
        new BadRequestException('Unexpected system error'),
      );
    });

    it('should preserve quote order from different services', async () => {
      guiaEnviaService.getQuote.mockResolvedValue(mockGeQuotes);
      t1Service.getQuote.mockResolvedValue(mockT1Quotes);
      pakkeService.getQuotePakke.mockResolvedValue(mockPakkeQuotes);
      manuableService.retrieveManuableQuotes.mockResolvedValue(
        mockManuableResponse,
      );

      const result = await service.getQuote(mockQuoteDto);

      // Verify the order is maintained: GE, T1, Pakke, Manuable
      const expectedOrder = [
        ...mockGeQuotes,
        ...mockT1Quotes,
        ...mockPakkeQuotes,
        ...mockManuableResponse.quotes,
      ];

      expect(result.data.quotes).toEqual(expectedOrder);
    });

    it('should correctly format response structure', async () => {
      guiaEnviaService.getQuote.mockResolvedValue([]);
      t1Service.getQuote.mockResolvedValue([]);
      pakkeService.getQuotePakke.mockResolvedValue([]);
      manuableService.retrieveManuableQuotes.mockResolvedValue({
        quotes: [],
        messages: [],
      });

      const result = await service.getQuote(mockQuoteDto);

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('quotes');
      expect(Array.isArray(result.data.quotes)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.error).toBeNull();
      expect(result.version).toBe(configService.version);
    });
  });
});
