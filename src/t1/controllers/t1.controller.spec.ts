import { Test, TestingModule } from '@nestjs/testing';
import { T1Controller } from './t1.controller';
import { T1Service } from '../services/t1.service';
import { CreateGuideToneRequestDto } from '../dtos/t1.dtos';
import { CreateGuideToneDataResponse } from '../t1.interface';
import { Reflector } from '@nestjs/core';
import config from '@/config';

describe('T1Controller', () => {
  let controller: T1Controller;

  const mockT1Service = {
    createGuide: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [T1Controller],
      providers: [
        {
          provide: T1Service,
          useValue: mockT1Service,
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

    controller = module.get<T1Controller>(T1Controller);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createGuide', () => {
    it('should call t1Service.createGuide with correct payload', async () => {
      const mockPayload: CreateGuideToneRequestDto = {
        parcel: {
          content: 'Test package content',
        },
        origin: {
          name: 'John',
          lastName: 'Doe',
          street1: 'Test Street 123',
          neighborhood: 'Test Neighborhood',
          external_number: '123',
          town: 'Test Town',
          state: 'Test State',
          phone: '1234567890',
          email: 'john.doe@example.com',
          reference: 'Near the park',
        },
        destination: {
          name: 'Jane',
          lastName: 'Smith',
          street1: 'Dest Street 456',
          neighborhood: 'Dest Neighborhood',
          external_number: '456',
          town: 'Dest Town',
          state: 'Dest State',
          phone: '0987654321',
          email: 'jane.smith@example.com',
          reference: 'Next to the mall',
        },
        notifyMe: true,
        quoteToken: 'test-quote-token-123',
      };

      const mockResponse: CreateGuideToneDataResponse = {
        version: '1.0.0',
        message: null,
        messages: ['Guide created successfully'],
        error: null,
        data: {
          guide: {
            trackingNumber: 'TRK123456789',
            carrier: 'T1',
            price: '150.00',
            guideLink: 'https://example.com/guide/123456',
            labelUrl: 'https://example.com/label.pdf',
            file: null,
          },
        },
      };

      mockT1Service.createGuide.mockResolvedValue(mockResponse);

      const result = await controller.createGuide(mockPayload);

      expect(mockT1Service.createGuide).toHaveBeenCalledWith(mockPayload);
      expect(mockT1Service.createGuide).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });

    it('should handle service errors', async () => {
      const mockPayload: CreateGuideToneRequestDto = {
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
        notifyMe: false,
        quoteToken: 'error-token',
      };

      const error = new Error('T1 service error');
      mockT1Service.createGuide.mockRejectedValue(error);

      await expect(controller.createGuide(mockPayload)).rejects.toThrow(
        'T1 service error',
      );
      expect(mockT1Service.createGuide).toHaveBeenCalledWith(mockPayload);
    });

    it('should pass through service response without modification', async () => {
      const mockPayload: CreateGuideToneRequestDto = {
        parcel: {
          content: 'Another test package',
        },
        origin: {
          name: 'Alice',
          lastName: 'Brown',
          street1: 'Street A 100',
          neighborhood: 'District A',
          external_number: '100',
          town: 'City A',
          state: 'State A',
          phone: '1111222233',
          email: 'alice@example.com',
          reference: 'Corner building',
        },
        destination: {
          name: 'Bob',
          lastName: 'Wilson',
          street1: 'Avenue B 200',
          neighborhood: 'District B',
          external_number: '200',
          town: 'City B',
          state: 'State B',
          phone: '4444555566',
          email: 'bob@example.com',
          reference: 'Blue building',
        },
        notifyMe: true,
        quoteToken: 'another-quote-token',
      };

      const mockResponse: CreateGuideToneDataResponse = {
        version: '1.0.0',
        message: null,
        messages: ['T1: Guide created successfully'],
        error: null,
        data: {
          guide: {
            trackingNumber: 'TRK987654321',
            carrier: 'T1',
            price: '200.50',
            guideLink: 'https://example.com/guide/987654',
            labelUrl: 'https://example.com/label2.pdf',
            file: 'base64encodedfile',
          },
        },
      };

      mockT1Service.createGuide.mockResolvedValue(mockResponse);

      const result = await controller.createGuide(mockPayload);

      expect(result).toEqual(mockResponse);
      expect(result.data.guide).toEqual(mockResponse.data.guide);
      expect(result.version).toBe('1.0.0');
      expect(result.messages).toEqual(['T1: Guide created successfully']);
    });

    it('should handle null guide response from service', async () => {
      const mockPayload: CreateGuideToneRequestDto = {
        parcel: {
          content: 'Test package',
        },
        origin: {
          name: 'Test',
          lastName: 'User',
          street1: 'Test Street',
          neighborhood: 'Test Neighborhood',
          external_number: '123',
          town: 'Test Town',
          state: 'Test State',
          phone: '1234567890',
          email: 'test@example.com',
          reference: 'Reference',
        },
        destination: {
          name: 'Dest',
          lastName: 'User',
          street1: 'Dest Street',
          neighborhood: 'Dest Neighborhood',
          external_number: '456',
          town: 'Dest Town',
          state: 'Dest State',
          phone: '0987654321',
          email: 'dest@example.com',
          reference: 'Reference',
        },
        notifyMe: false,
        quoteToken: 'null-guide-token',
      };

      const mockResponse: CreateGuideToneDataResponse = {
        version: '1.0.0',
        message: null,
        messages: ['Guide creation failed'],
        error: null,
        data: {
          guide: null,
        },
      };

      mockT1Service.createGuide.mockResolvedValue(mockResponse);

      const result = await controller.createGuide(mockPayload);

      expect(result).toBe(mockResponse);
      expect(result.data.guide).toBeNull();
    });
  });
});
