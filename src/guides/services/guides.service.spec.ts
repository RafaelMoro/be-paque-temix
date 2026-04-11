import { Test, TestingModule } from '@nestjs/testing';
import { GuidesService } from './guides.service';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { T1Service } from '@/t1/services/t1.service';
import { PakkeService } from '@/pakke/services/pakke.service';
import config from '@/config';
import { GetGuideResponse } from '@/global.interface';
import { GetGuidesDataResponse } from '../guides.interface';
import { T1_USER_NOT_FOUND_ERROR, T1_RETRY_GUIDES } from '@/t1/t1.constants';

describe('GuidesService', () => {
  let service: GuidesService;
  let guiaEnviaService: jest.Mocked<GuiaEnviaService>;
  let t1Service: jest.Mocked<T1Service>;
  let pakkeService: jest.Mocked<PakkeService>;

  const mockConfig = {
    version: '1.0.0',
    guiaEnvia: {
      apiKey: 'test-api-key',
      uri: 'https://test.com',
    },
  };

  const mockGEGuides: GetGuideResponse[] = [
    {
      trackingNumber: 'GE123456789',
      shipmentNumber: 'shipment-001',
      source: 'GE',
      status: 'generado',
      carrier: 'Estafeta Express',
      courier: 'Estafeta',
      price: '156.13',
      guideLink: null,
      labelUrl: 'https://app.guiaenvia.com/label/GE123456789.pdf',
      file: null,
      origin: {
        name: 'Warehouse',
        alias: 'Main Warehouse',
        street: 'Industrial Ave',
        streetNumber: '100',
        neighborhood: 'Industrial Zone',
        city: 'Mexico City',
        state: 'CDMX',
      },
      destination: {
        name: 'Customer 1',
        alias: 'Home',
        street: 'Main Street',
        streetNumber: '123',
        neighborhood: 'Centro',
        city: 'Puebla',
        state: 'Puebla',
      },
    },
    {
      trackingNumber: 'DHL987654321',
      shipmentNumber: 'shipment-002',
      source: 'GE',
      status: 'generado',
      carrier: 'DHL Terrestre',
      courier: 'DHL',
      price: '120.5',
      guideLink: null,
      labelUrl: 'https://app.guiaenvia.com/label/DHL987654321.pdf',
      file: null,
      origin: {
        name: 'Warehouse',
        alias: 'Main Warehouse',
        street: 'Industrial Ave',
        streetNumber: '100',
        neighborhood: 'Industrial Zone',
        city: 'Mexico City',
        state: 'CDMX',
      },
      destination: {
        name: 'Customer 2',
        alias: 'Office',
        street: 'Business Blvd',
        streetNumber: '456',
        neighborhood: 'Del Valle',
        city: 'Guadalajara',
        state: 'Jalisco',
      },
    },
  ];

  const mockT1Guides: GetGuideResponse[] = [
    {
      trackingNumber: 'T1123456789',
      shipmentNumber: null,
      source: 'TONE',
      status: 'En tránsito',
      carrier: 'Estafeta',
      courier: 'Estafeta',
      price: '200.00',
      guideLink: null,
      labelUrl: 'https://t1.example.com/label/T1123456789.pdf',
      file: null,
      order: 'ORDER-001',
      guide: 'GUIDE-001',
      trackingLink: 'https://track.example.com/T1123456789',
      shippingLink: 'https://shipping.example.com/T1123456789',
      origin: {
        name: 'T1 Warehouse',
        alias: 'T1 Main',
        street: 'T1 Street',
        streetNumber: '500',
        neighborhood: 'T1 Zone',
        city: 'Monterrey',
        state: 'Nuevo León',
      },
      destination: {
        name: 'T1 Customer',
        alias: 'T1 Home',
        street: 'T1 Avenue',
        streetNumber: '600',
        neighborhood: 'T1 Neighborhood',
        city: 'Tijuana',
        state: 'Baja California',
      },
    },
  ];

  const mockPkkGuides: GetGuideResponse[] = [
    {
      trackingNumber: 'PKK123456789',
      shipmentNumber: 'PKK123456789',
      source: 'Pkk',
      status: 'WAITING',
      carrier: null,
      courier: null,
      price: null,
      guideLink: null,
      labelUrl: null,
      file: null,
      order: null,
      guide: null,
      trackingLink: null,
      shippingLink: null,
      origin: null,
      destination: null,
    },
  ];

  beforeEach(async () => {
    const mockGuiaEnviaService = {
      getGuides: jest.fn(),
    };

    const mockT1Service = {
      retrieveT1Guides: jest.fn(),
    };

    const mockPakkeService = {
      getBasicGuidesInfoPkk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuidesService,
        {
          provide: GuiaEnviaService,
          useValue: mockGuiaEnviaService,
        },
        {
          provide: T1Service,
          useValue: mockT1Service,
        },
        {
          provide: PakkeService,
          useValue: mockPakkeService,
        },
        {
          provide: config.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<GuidesService>(GuidesService);
    guiaEnviaService = module.get(GuiaEnviaService);
    t1Service = module.get(T1Service);
    pakkeService = module.get(PakkeService);

    // Set default mock implementations
    guiaEnviaService.getGuides.mockResolvedValue([]);
    t1Service.retrieveT1Guides.mockResolvedValue({ data: [], messages: [] });
    pakkeService.getBasicGuidesInfoPkk.mockResolvedValue([]);

    // Silence console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGuides', () => {
    it('should successfully retrieve guides from all three services', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: mockT1Guides,
        messages: [],
      });
      pakkeService.getBasicGuidesInfoPkk.mockResolvedValue(mockPkkGuides);

      const result = await service.getGuides();

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        messages: [],
        error: null,
        data: {
          guides: [...mockGEGuides, ...mockT1Guides, ...mockPkkGuides],
        },
      });
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
      expect(t1Service.retrieveT1Guides).toHaveBeenCalledTimes(1);
      expect(pakkeService.getBasicGuidesInfoPkk).toHaveBeenCalledTimes(1);
      expect(pakkeService.getBasicGuidesInfoPkk).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 30,
      });
    });

    it('should successfully retrieve guides from Guia Envia only', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result = await service.getGuides();

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        messages: [],
        error: null,
        data: {
          guides: mockGEGuides,
        },
      });
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should return empty guides array when Guia Envia service rejects', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(new Error('API Error'));

      const result = await service.getGuides();

      expect(result.messages).toContain('GE failed to get guides');
      expect(result.messages).toContain('GE Error: API Error');
      expect(result.data.guides).toEqual([]);
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should handle T1 service rejection', async () => {
      t1Service.retrieveT1Guides.mockRejectedValue(new Error('T1 API Error'));

      const result = await service.getGuides();

      expect(result.messages).toContain('T1 failed to get guides');
      expect(result.data.guides).toEqual([]);
    });

    it('should handle Pkk service rejection', async () => {
      pakkeService.getBasicGuidesInfoPkk.mockRejectedValue(
        new Error('Pkk API Error'),
      );

      const result = await service.getGuides();

      expect(result.messages).toContain('Pkk failed to get guides');
      expect(result.data.guides).toEqual([]);
    });

    it('should handle T1 user not found error with retry message', async () => {
      t1Service.retrieveT1Guides.mockRejectedValue(
        new Error(T1_USER_NOT_FOUND_ERROR),
      );

      const result = await service.getGuides();

      expect(result.messages).toContain('T1 failed to get guides');
      expect(result.messages).toContain(T1_RETRY_GUIDES);
    });

    it('should handle T1 returning messages in successful response', async () => {
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: mockT1Guides,
        messages: ['T1 Warning: Rate limit approaching'],
      });

      const result = await service.getGuides();

      expect(result.messages).toContain('T1 Warning: Rate limit approaching');
      expect(result.data.guides).toEqual(mockT1Guides);
    });

    it('should handle all three services rejecting', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(new Error('GE Error'));
      t1Service.retrieveT1Guides.mockRejectedValue(new Error('T1 Error'));
      pakkeService.getBasicGuidesInfoPkk.mockRejectedValue(
        new Error('Pkk Error'),
      );

      const result = await service.getGuides();

      expect(result.messages).toContain('GE failed to get guides');
      expect(result.messages).toContain('T1 failed to get guides');
      expect(result.messages).toContain('Pkk failed to get guides');
      expect(result.data.guides).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should combine guides from GE and T1 when Pkk fails', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: mockT1Guides,
        messages: [],
      });
      pakkeService.getBasicGuidesInfoPkk.mockRejectedValue(
        new Error('Pkk Error'),
      );

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([...mockGEGuides, ...mockT1Guides]);
      expect(result.messages).toContain('Pkk failed to get guides');
    });

    it('should combine guides from GE and Pkk when T1 fails', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);
      t1Service.retrieveT1Guides.mockRejectedValue(new Error('T1 Error'));
      pakkeService.getBasicGuidesInfoPkk.mockResolvedValue(mockPkkGuides);

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([...mockGEGuides, ...mockPkkGuides]);
      expect(result.messages).toContain('T1 failed to get guides');
    });

    it('should combine guides from T1 and Pkk when GE fails', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(new Error('GE Error'));
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: mockT1Guides,
        messages: [],
      });
      pakkeService.getBasicGuidesInfoPkk.mockResolvedValue(mockPkkGuides);

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([...mockT1Guides, ...mockPkkGuides]);
      expect(result.messages).toContain('GE failed to get guides');
    });

    it('should handle T1 returning null data', async () => {
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: null as any,
        messages: [],
      });

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
    });

    it('should handle T1 returning undefined data', async () => {
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: undefined as any,
        messages: [],
      });

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
    });

    it('should return empty guides array when Guia Envia returns empty array', async () => {
      guiaEnviaService.getGuides.mockResolvedValue([]);

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
      expect(result.messages).toEqual([]);
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should handle single guide correctly', async () => {
      const singleGuide = [mockGEGuides[0]];
      guiaEnviaService.getGuides.mockResolvedValue(singleGuide);

      const result = await service.getGuides();

      expect(result.data.guides).toHaveLength(1);
      expect(result.data.guides[0]).toEqual(mockGEGuides[0]);
    });

    it('should handle multiple guides correctly', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result = await service.getGuides();

      expect(result.data.guides.length).toBeGreaterThanOrEqual(2);
      const geGuides = result.data.guides.filter((g) => g.source === 'GE');
      expect(geGuides[0].trackingNumber).toBe('GE123456789');
      expect(geGuides[1].trackingNumber).toBe('DHL987654321');
    });

    it('should include correct version from config', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result = await service.getGuides();

      expect(result.version).toBe('1.0.0');
    });

    it('should return response with correct structure', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result: GetGuidesDataResponse = await service.getGuides();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('guides');
      expect(Array.isArray(result.data.guides)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.error).toBeNull();
      expect(result.message).toBeNull();
    });

    it('should handle Promise.allSettled correctly when service resolves', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: mockT1Guides,
        messages: [],
      });
      pakkeService.getBasicGuidesInfoPkk.mockResolvedValue(mockPkkGuides);

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([
        ...mockGEGuides,
        ...mockT1Guides,
        ...mockPkkGuides,
      ]);
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
      expect(t1Service.retrieveT1Guides).toHaveBeenCalledTimes(1);
      expect(pakkeService.getBasicGuidesInfoPkk).toHaveBeenCalledTimes(1);
    });

    it('should handle Promise.allSettled correctly when service rejects', async () => {
      const error = new Error('Service unavailable');
      guiaEnviaService.getGuides.mockRejectedValue(error);
      t1Service.retrieveT1Guides.mockRejectedValue(error);
      pakkeService.getBasicGuidesInfoPkk.mockRejectedValue(error);

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
      expect(result.messages).toContain('GE failed to get guides');
      expect(result.messages).toContain('T1 failed to get guides');
      expect(result.messages).toContain('Pkk failed to get guides');
    });

    it('should handle network errors gracefully', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(new Error('Network error'));

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
      expect(result.error).toBeNull();
      expect(result.messages).toContain('GE failed to get guides');
      expect(result.messages).toContain('GE Error: Network error');
    });

    it('should handle timeout errors gracefully', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(
        new Error('Request timeout'),
      );

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
      expect(result.error).toBeNull();
      expect(result.messages).toContain('GE failed to get guides');
      expect(result.messages).toContain('GE Error: Request timeout');
    });

    it('should maintain guide data integrity', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result = await service.getGuides();

      const geGuide = result.data.guides.find(
        (g) => g.trackingNumber === 'GE123456789',
      );
      expect(geGuide).toMatchObject({
        trackingNumber: 'GE123456789',
        shipmentNumber: 'shipment-001',
        source: 'GE',
        status: 'generado',
        carrier: 'Estafeta Express',
        price: '156.13',
      });
    });

    it('should handle guides with all fields populated', async () => {
      const guidesWithAllFields: GetGuideResponse[] = [
        {
          trackingNumber: 'FULL123456',
          shipmentNumber: 'ship-full-001',
          source: 'GE',
          status: 'entregado',
          carrier: 'FedEx',
          courier: 'Fedex',
          price: '250.00',
          guideLink: 'https://track.example.com/FULL123456',
          labelUrl: 'https://label.example.com/FULL123456.pdf',
          file: 'base64encodedfile',
          origin: {
            name: 'Sender Name',
            alias: 'Origin Alias',
            street: 'Origin Street',
            streetNumber: '100',
            neighborhood: 'Origin Neighborhood',
            city: 'Origin City',
            state: 'Origin State',
          },
          destination: {
            name: 'Recipient Name',
            alias: 'Destination Alias',
            street: 'Destination Street',
            streetNumber: '200',
            neighborhood: 'Destination Neighborhood',
            city: 'Destination City',
            state: 'Destination State',
          },
        },
      ];
      guiaEnviaService.getGuides.mockResolvedValue(guidesWithAllFields);

      const result = await service.getGuides();

      expect(result.data.guides[0]).toEqual(guidesWithAllFields[0]);
    });

    it('should handle guides with minimal fields', async () => {
      const guidesWithMinimalFields: GetGuideResponse[] = [
        {
          trackingNumber: 'MIN123',
          shipmentNumber: null,
          source: 'GE',
          status: 'pendiente',
          carrier: 'Unknown',
          courier: null,
          price: '0',
          guideLink: null,
          labelUrl: null,
          file: null,
          origin: {
            name: 'Min Origin',
            alias: 'Alias Origin',
            street: 'Street',
            streetNumber: '1',
            neighborhood: 'Neighborhood',
            city: 'City',
            state: 'State',
          },
          destination: {
            name: 'Min Destination',
            alias: 'Alias Destination',
            street: 'Street',
            streetNumber: '2',
            neighborhood: 'Neighborhood',
            city: 'City',
            state: 'State',
          },
        },
      ];
      guiaEnviaService.getGuides.mockResolvedValue(guidesWithMinimalFields);

      const result = await service.getGuides();

      expect(result.data.guides[0]).toEqual(guidesWithMinimalFields[0]);
    });

    it('should call all services exactly once', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: mockT1Guides,
        messages: [],
      });
      pakkeService.getBasicGuidesInfoPkk.mockResolvedValue(mockPkkGuides);

      await service.getGuides();

      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
      expect(guiaEnviaService.getGuides).toHaveBeenCalledWith();
      expect(t1Service.retrieveT1Guides).toHaveBeenCalledTimes(1);
      expect(pakkeService.getBasicGuidesInfoPkk).toHaveBeenCalledTimes(1);
      expect(pakkeService.getBasicGuidesInfoPkk).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 30,
      });
    });

    it('should not throw error when any service fails', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(new Error('GE error'));
      t1Service.retrieveT1Guides.mockRejectedValue(new Error('T1 error'));
      pakkeService.getBasicGuidesInfoPkk.mockRejectedValue(
        new Error('Pkk error'),
      );

      await expect(service.getGuides()).resolves.toBeDefined();
    });

    it('should return consistent response structure on success', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result1 = await service.getGuides();
      const result2 = await service.getGuides();

      expect(result1).toEqual(result2);
    });

    it('should preserve guide order from service response', async () => {
      const orderedGuides = [...mockGEGuides].reverse();
      guiaEnviaService.getGuides.mockResolvedValue(orderedGuides);

      const result = await service.getGuides();

      const geGuides = result.data.guides.filter((g) => g.source === 'GE');
      expect(geGuides[0].trackingNumber).toBe('DHL987654321');
      expect(geGuides[1].trackingNumber).toBe('GE123456789');
    });

    it('should set message to first message when messages array is not empty', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(new Error('GE Error'));

      const result = await service.getGuides();

      expect(result.message).toBe('GE failed to get guides');
      expect(result.messages[0]).toBe('GE failed to get guides');
    });

    it('should keep message as null when all services succeed', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: mockT1Guides,
        messages: [],
      });
      pakkeService.getBasicGuidesInfoPkk.mockResolvedValue(mockPkkGuides);

      const result = await service.getGuides();

      expect(result.message).toBeNull();
      expect(result.messages).toEqual([]);
    });

    it('should handle mixed success and failure scenarios', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);
      t1Service.retrieveT1Guides.mockRejectedValue(new Error('T1 Error'));
      pakkeService.getBasicGuidesInfoPkk.mockResolvedValue(mockPkkGuides);

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([...mockGEGuides, ...mockPkkGuides]);
      expect(result.messages).toContain('T1 failed to get guides');
      expect(result.messages.length).toBe(1);
    });

    it('should aggregate warnings from T1 service', async () => {
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: mockT1Guides,
        messages: ['Warning 1', 'Warning 2'],
      });

      const result = await service.getGuides();

      expect(result.messages).toContain('Warning 1');
      expect(result.messages).toContain('Warning 2');
      expect(result.data.guides).toEqual(mockT1Guides);
    });

    it('should handle large number of guides from all services', async () => {
      const manyGEGuides = Array(50)
        .fill(null)
        .map((_, i) => ({ ...mockGEGuides[0], trackingNumber: `GE${i}` }));
      const manyT1Guides = Array(50)
        .fill(null)
        .map((_, i) => ({ ...mockT1Guides[0], trackingNumber: `T1${i}` }));
      const manyPkkGuides = Array(50)
        .fill(null)
        .map((_, i) => ({ ...mockPkkGuides[0], trackingNumber: `PKK${i}` }));

      guiaEnviaService.getGuides.mockResolvedValue(manyGEGuides);
      t1Service.retrieveT1Guides.mockResolvedValue({
        data: manyT1Guides,
        messages: [],
      });
      pakkeService.getBasicGuidesInfoPkk.mockResolvedValue(manyPkkGuides);

      const result = await service.getGuides();

      expect(result.data.guides).toHaveLength(150);
    });

    it('should execute all service calls in parallel', async () => {
      const callOrder: string[] = [];

      guiaEnviaService.getGuides.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        callOrder.push('GE');
        return mockGEGuides;
      });

      t1Service.retrieveT1Guides.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        callOrder.push('T1');
        return { data: mockT1Guides, messages: [] };
      });

      pakkeService.getBasicGuidesInfoPkk.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
        callOrder.push('Pkk');
        return mockPkkGuides;
      });

      const startTime = Date.now();
      await service.getGuides();
      const duration = Date.now() - startTime;

      // If calls were sequential, it would take ~120ms, parallel should be ~50ms
      expect(duration).toBeLessThan(100);
      expect(callOrder).toHaveLength(3);
    });
  });
});
