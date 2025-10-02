import { Test, TestingModule } from '@nestjs/testing';
import { ManuableController } from './manuable.controller';
import { ManuableService } from '../services/manuable.service';
import { CreateGuideMnRequestDto } from '../dtos/manuable.dto';
import {
  CreateGuideMnDataResponse,
  GetGuidesMnDataResponse,
  GetHistoryGuidesPayload,
} from '../manuable.interface';
import { Reflector } from '@nestjs/core';
import config from '@/config';

describe('ManuableController', () => {
  let controller: ManuableController;

  const mockManuableService = {
    createGuideWithAutoRetry: jest.fn(),
    getHistoryGuidesWithAutoRetry: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManuableController],
      providers: [
        {
          provide: ManuableService,
          useValue: mockManuableService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(false), // Mock reflector
          },
        },
        {
          provide: config.KEY,
          useValue: {
            auth: {
              publicKey: 'test-public-key',
            },
          },
        },
      ],
    }).compile();

    controller = module.get<ManuableController>(ManuableController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createGuide', () => {
    it('should call manuableService.createGuideWithAutoRetry with correct payload', async () => {
      const mockPayload: CreateGuideMnRequestDto = {
        quoteId: 'test-quote-id',
        parcel: {
          satProductId: 'SAT001',
          content: 'Electronics',
          value: 1000,
          quantity: 1,
        },
        origin: {
          name: 'John Doe',
          street1: 'Calle Principal 123',
          neighborhood: 'Centro',
          external_number: '123',
          city: 'Mexico City',
          company: 'ACME Corp',
          state: 'CDMX',
          phone: '+52 55 1234 5678',
          email: 'john.doe@example.com',
          country: 'MX',
          reference: 'Near the park',
        },
        destination: {
          name: 'Jane Smith',
          street1: 'Avenida Secundaria 456',
          neighborhood: 'Norte',
          external_number: '456',
          city: 'Guadalajara',
          company: 'Tech Corp',
          state: 'Jalisco',
          phone: '+52 33 5678 9012',
          email: 'jane.smith@example.com',
          country: 'MX',
          reference: 'Next to the mall',
        },
      };

      const mockResponse: CreateGuideMnDataResponse = {
        version: '1.0.0',
        message: null,
        messages: ['Mn: Guide created successfully'],
        error: null,
        data: {
          guide: {
            token: 'guide-token-123',
            created_at: '2023-01-01T00:00:00Z',
            tracking_number: 'TRK123456789',
            label_url: 'https://example.com/label.pdf',
            price: '150.00',
            carrier: 'DHL',
            tracking_status: null,
            waybill: null,
            cancellable: true,
            label_status: 'ready',
          },
        },
      };

      mockManuableService.createGuideWithAutoRetry.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.createGuide(mockPayload);

      expect(mockManuableService.createGuideWithAutoRetry).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(
        mockManuableService.createGuideWithAutoRetry,
      ).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });

    it('should handle service errors', async () => {
      const mockPayload: CreateGuideMnRequestDto = {
        quoteId: 'test-quote-id',
        parcel: {
          satProductId: 'SAT001',
          content: 'Electronics',
          value: 1000,
          quantity: 1,
        },
        origin: {
          name: 'John Doe',
          street1: 'Calle Principal 123',
          neighborhood: 'Centro',
          external_number: '123',
          city: 'Mexico City',
          company: 'ACME Corp',
          state: 'CDMX',
          phone: '+52 55 1234 5678',
          email: 'john.doe@example.com',
          country: 'MX',
          reference: 'Near the park',
        },
        destination: {
          name: 'Jane Smith',
          street1: 'Avenida Secundaria 456',
          neighborhood: 'Norte',
          external_number: '456',
          city: 'Guadalajara',
          company: 'Tech Corp',
          state: 'Jalisco',
          phone: '+52 33 5678 9012',
          email: 'jane.smith@example.com',
          country: 'MX',
          reference: 'Next to the mall',
        },
      };

      const error = new Error('Service error');
      mockManuableService.createGuideWithAutoRetry.mockRejectedValue(error);

      await expect(controller.createGuide(mockPayload)).rejects.toThrow(
        'Service error',
      );
      expect(mockManuableService.createGuideWithAutoRetry).toHaveBeenCalledWith(
        mockPayload,
      );
    });

    it('should pass through service response without modification', async () => {
      const mockPayload: CreateGuideMnRequestDto = {
        quoteId: 'another-quote-id',
        parcel: {
          satProductId: 'SAT002',
          content: 'Clothing',
          value: 500,
          quantity: 2,
        },
        origin: {
          name: 'Alice Brown',
          street1: 'Street A 100',
          neighborhood: 'District A',
          external_number: '100',
          city: 'Tijuana',
          company: 'Fashion Inc',
          state: 'Baja California',
          phone: '+52 664 1111 2222',
          email: 'alice@example.com',
          country: 'MX',
          reference: 'Corner building',
        },
        destination: {
          name: 'Bob Wilson',
          street1: 'Street B 200',
          neighborhood: 'District B',
          external_number: '200',
          city: 'Monterrey',
          company: 'Logistics Co',
          state: 'Nuevo León',
          phone: '+52 81 3333 4444',
          email: 'bob@example.com',
          country: 'MX',
          reference: 'Blue building',
        },
      };

      const mockResponse: CreateGuideMnDataResponse = {
        version: '1.0.1',
        message: 'Custom message',
        messages: ['Mn: Token valid', 'Mn: Guide created successfully'],
        error: null,
        data: {
          guide: {
            token: 'test-token',
            created_at: '2023-01-01',
            tracking_number: 'TEST123',
            label_url: 'http://example.com/label',
            price: '50.00',
            carrier: 'test-carrier',
            tracking_status: null,
            waybill: null,
            cancellable: true,
            label_status: 'active',
          },
        },
      };

      mockManuableService.createGuideWithAutoRetry.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.createGuide(mockPayload);

      expect(result).toEqual(mockResponse);
      expect(result).toBe(mockResponse); // Should be the exact same object reference
    });
  });

  describe('getGuides', () => {
    it('should call manuableService.getHistoryGuidesWithAutoRetry with tracking_number', async () => {
      const trackingNumber = 'TRK123456789';
      const mockResponse: GetGuidesMnDataResponse = {
        version: '1.0.0',
        message: null,
        messages: ['Mn: Guides retrieved successfully'],
        error: null,
        data: {
          guides: [
            {
              token: 'guide-token-123',
              created_at: '2023-01-01T00:00:00Z',
              tracking_number: 'TRK123456789',
              label_url: 'https://example.com/label.pdf',
              price: '150.00',
              carrier: 'DHL',
              tracking_status: null,
              waybill: null,
              cancellable: true,
              label_status: 'ready',
            },
          ],
        },
      };

      mockManuableService.getHistoryGuidesWithAutoRetry.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getGuides(trackingNumber);

      const expectedPayload: GetHistoryGuidesPayload = {
        tracking_number: trackingNumber,
      };
      expect(
        mockManuableService.getHistoryGuidesWithAutoRetry,
      ).toHaveBeenCalledWith(expectedPayload);
      expect(
        mockManuableService.getHistoryGuidesWithAutoRetry,
      ).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });

    it('should call manuableService.getHistoryGuidesWithAutoRetry without tracking_number', async () => {
      const mockResponse: GetGuidesMnDataResponse = {
        version: '1.0.0',
        message: null,
        messages: ['Mn: Guides retrieved successfully'],
        error: null,
        data: {
          guides: [],
        },
      };

      mockManuableService.getHistoryGuidesWithAutoRetry.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getGuides();

      const expectedPayload: GetHistoryGuidesPayload = {
        tracking_number: undefined,
      };
      expect(
        mockManuableService.getHistoryGuidesWithAutoRetry,
      ).toHaveBeenCalledWith(expectedPayload);
      expect(result).toBe(mockResponse);
    });

    it('should handle service errors', async () => {
      const trackingNumber = 'TRK123456789';
      const error = new Error('Service error');
      mockManuableService.getHistoryGuidesWithAutoRetry.mockRejectedValue(
        error,
      );

      await expect(controller.getGuides(trackingNumber)).rejects.toThrow(
        'Service error',
      );

      const expectedPayload: GetHistoryGuidesPayload = {
        tracking_number: trackingNumber,
      };
      expect(
        mockManuableService.getHistoryGuidesWithAutoRetry,
      ).toHaveBeenCalledWith(expectedPayload);
    });
  });
});
