import { Test, TestingModule } from '@nestjs/testing';
import { PakkeController } from './pakke.controller';
import { PakkeService } from '../services/pakke.service';
import { CreateGuidePkkDataResponse } from '../pakke.interface';
import { CreateGuidePakkeRequestDto } from '../dtos/pakke.dto';
import { GlobalCreateGuideResponse } from '@/global.interface';
import { Reflector } from '@nestjs/core';
import config from '@/config';

describe('PakkeController', () => {
  let controller: PakkeController;
  let pakkeService: jest.Mocked<PakkeService>;

  const mockCreateGuidePayload: CreateGuidePakkeRequestDto = {
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

  const mockFormattedCreateGuideResponse: GlobalCreateGuideResponse = {
    trackingNumber: 'PKK123456789',
    carrier: 'Paquete Express',
    price: '120',
    guideLink: null,
    labelUrl: 'https://example.com/label.pdf',
    file: 'https://example.com/label.pdf',
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

  const mockPakkeServiceValue = {
    createGuidePakke: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PakkeController],
      providers: [
        {
          provide: PakkeService,
          useValue: mockPakkeServiceValue,
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

    controller = module.get<PakkeController>(PakkeController);
    pakkeService = module.get(PakkeService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createGuide', () => {
    it('should successfully create a guide and return response', async () => {
      pakkeService.createGuidePakke.mockResolvedValue(mockCreateGuideResponse);

      const result = await controller.createGuide(mockCreateGuidePayload);

      expect(pakkeService.createGuidePakke).toHaveBeenCalledTimes(1);
      expect(pakkeService.createGuidePakke).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );
      expect(result).toEqual(mockCreateGuideResponse);
    });

    it('should propagate service errors', async () => {
      const serviceError = new Error('Service unavailable');
      pakkeService.createGuidePakke.mockRejectedValue(serviceError);

      await expect(
        controller.createGuide(mockCreateGuidePayload),
      ).rejects.toThrow(serviceError);
      expect(pakkeService.createGuidePakke).toHaveBeenCalledTimes(1);
      expect(pakkeService.createGuidePakke).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );
    });

    it('should pass through the exact payload to service', async () => {
      pakkeService.createGuidePakke.mockResolvedValue(mockCreateGuideResponse);

      await controller.createGuide(mockCreateGuidePayload);

      expect(pakkeService.createGuidePakke).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );
      // Verify the payload structure is preserved
      const calledWith = pakkeService.createGuidePakke.mock.calls[0][0];
      expect(calledWith.parcel).toEqual(mockCreateGuidePayload.parcel);
      expect(calledWith.origin).toEqual(mockCreateGuidePayload.origin);
      expect(calledWith.destination).toEqual(
        mockCreateGuidePayload.destination,
      );
    });

    it('should handle service returning different response format', async () => {
      const alternateResponse: CreateGuidePkkDataResponse = {
        ...mockCreateGuideResponse,
        data: {
          guide: null,
        },
        messages: ['Guide creation failed'],
      };

      pakkeService.createGuidePakke.mockResolvedValue(alternateResponse);

      const result = await controller.createGuide(mockCreateGuidePayload);

      expect(result).toEqual(alternateResponse);
      expect(result.data.guide).toBeNull();
      expect(result.messages).toContain('Guide creation failed');
    });

    it('should maintain the async nature of the endpoint', async () => {
      pakkeService.createGuidePakke.mockResolvedValue(mockCreateGuideResponse);

      const resultPromise = controller.createGuide(mockCreateGuidePayload);

      expect(resultPromise).toBeInstanceOf(Promise);
      const result = await resultPromise;
      expect(result).toEqual(mockCreateGuideResponse);
    });
  });
});
