import { Test, TestingModule } from '@nestjs/testing';
import { GuidesController } from './guides.controller';
import { GuidesService } from '../services/guides.service';
import { GetQuoteDataResponse } from '../guides.interface';
import { GetGuideResponse } from '@/global.interface';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';

describe('GuidesController', () => {
  let controller: GuidesController;
  let guidesService: jest.Mocked<GuidesService>;

  const mockGuidesResponse: GetQuoteDataResponse = {
    version: '1.0.0',
    message: null,
    messages: [],
    error: null,
    data: {
      guides: [
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
      ] as GetGuideResponse[],
    },
  };

  const mockEmptyGuidesResponse: GetQuoteDataResponse = {
    version: '1.0.0',
    message: null,
    messages: [],
    error: null,
    data: {
      guides: [],
    },
  };

  const mockJwtGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const mockGuidesService = {
      getGuides: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuidesController],
      providers: [
        {
          provide: GuidesService,
          useValue: mockGuidesService,
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<GuidesController>(GuidesController);
    guidesService = module.get(GuidesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getGuides', () => {
    it('should call guidesService.getGuides and return the result', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = await controller.getGuides();

      expect(guidesService.getGuides).toHaveBeenCalledTimes(1);
      expect(guidesService.getGuides).toHaveBeenCalledWith();
      expect(result).toEqual(mockGuidesResponse);
    });

    it('should return guides data with correct structure', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = await controller.getGuides();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('guides');
      expect(Array.isArray(result.data.guides)).toBe(true);
    });

    it('should return multiple guides when service returns them', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = await controller.getGuides();

      expect(result.data.guides).toHaveLength(2);
      expect(result.data.guides[0].trackingNumber).toBe('GE123456789');
      expect(result.data.guides[1].trackingNumber).toBe('DHL987654321');
    });

    it('should return empty guides array when service returns empty array', async () => {
      guidesService.getGuides.mockResolvedValue(mockEmptyGuidesResponse);

      const result = await controller.getGuides();

      expect(result.data.guides).toEqual([]);
      expect(result.data.guides).toHaveLength(0);
    });

    it('should propagate service response without modification', async () => {
      const serviceResponse = mockGuidesResponse;
      guidesService.getGuides.mockResolvedValue(serviceResponse);

      const result = await controller.getGuides();

      expect(result).toBe(serviceResponse);
      expect(result).toStrictEqual(serviceResponse);
    });

    it('should handle service errors by propagating them', async () => {
      const error = new Error('Service error');
      guidesService.getGuides.mockRejectedValue(error);

      await expect(controller.getGuides()).rejects.toThrow('Service error');
      expect(guidesService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should return response with version from service', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = await controller.getGuides();

      expect(result.version).toBe('1.0.0');
    });

    it('should return response with null error and message', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = await controller.getGuides();

      expect(result.error).toBeNull();
      expect(result.message).toBeNull();
    });

    it('should return response with empty messages array', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = await controller.getGuides();

      expect(result.messages).toEqual([]);
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should call service exactly once per request', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      await controller.getGuides();

      expect(guidesService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should not modify guides data from service', async () => {
      const expectedGuides = mockGuidesResponse.data.guides;
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = await controller.getGuides();

      expect(result.data.guides).toEqual(expectedGuides);
      expect(result.data.guides[0]).toEqual(expectedGuides[0]);
      expect(result.data.guides[1]).toEqual(expectedGuides[1]);
    });

    it('should handle single guide response', async () => {
      const singleGuideResponse: GetQuoteDataResponse = {
        version: '1.0.0',
        message: null,
        messages: [],
        error: null,
        data: {
          guides: [mockGuidesResponse.data.guides[0]],
        },
      };
      guidesService.getGuides.mockResolvedValue(singleGuideResponse);

      const result = await controller.getGuides();

      expect(result.data.guides).toHaveLength(1);
      expect(result.data.guides[0].trackingNumber).toBe('GE123456789');
    });

    it('should maintain guide properties in response', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = await controller.getGuides();
      const firstGuide = result.data.guides[0];

      expect(firstGuide).toHaveProperty('trackingNumber');
      expect(firstGuide).toHaveProperty('shipmentNumber');
      expect(firstGuide).toHaveProperty('source');
      expect(firstGuide).toHaveProperty('status');
      expect(firstGuide).toHaveProperty('carrier');
      expect(firstGuide).toHaveProperty('price');
      expect(firstGuide).toHaveProperty('guideLink');
      expect(firstGuide).toHaveProperty('labelUrl');
      expect(firstGuide).toHaveProperty('file');
    });

    it('should return async response', async () => {
      guidesService.getGuides.mockResolvedValue(mockGuidesResponse);

      const result = controller.getGuides();

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeDefined();
    });

    it('should handle service returning response with messages', async () => {
      const responseWithMessages: GetQuoteDataResponse = {
        ...mockGuidesResponse,
        messages: ['Warning: Some guides may be delayed'],
      };
      guidesService.getGuides.mockResolvedValue(responseWithMessages);

      const result = await controller.getGuides();

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBe('Warning: Some guides may be delayed');
    });
  });
});
