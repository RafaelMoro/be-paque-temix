import { Test, TestingModule } from '@nestjs/testing';
import { GuidesService } from './guides.service';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import config from '@/config';
import { GetGuideResponse } from '@/global.interface';
import { GetQuoteDataResponse } from '../guides.interface';

describe('GuidesService', () => {
  let service: GuidesService;
  let guiaEnviaService: jest.Mocked<GuiaEnviaService>;

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

  beforeEach(async () => {
    const mockGuiaEnviaService = {
      getGuides: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuidesService,
        {
          provide: GuiaEnviaService,
          useValue: mockGuiaEnviaService,
        },
        {
          provide: config.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<GuidesService>(GuidesService);
    guiaEnviaService = module.get(GuiaEnviaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGuides', () => {
    it('should successfully retrieve guides from Guia Envia', async () => {
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

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        messages: [],
        error: null,
        data: {
          guides: [],
        },
      });
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should return empty guides array when Guia Envia returns empty array', async () => {
      guiaEnviaService.getGuides.mockResolvedValue([]);

      const result = await service.getGuides();

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        messages: [],
        error: null,
        data: {
          guides: [],
        },
      });
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should handle single guide correctly', async () => {
      const singleGuide = [mockGEGuides[0]];
      guiaEnviaService.getGuides.mockResolvedValue(singleGuide);

      const result = await service.getGuides();

      expect(result.data.guides).toHaveLength(1);
      expect(result.data.guides[0]).toEqual(mockGEGuides[0]);
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple guides correctly', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result = await service.getGuides();

      expect(result.data.guides).toHaveLength(2);
      expect(result.data.guides[0].trackingNumber).toBe('GE123456789');
      expect(result.data.guides[1].trackingNumber).toBe('DHL987654321');
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should include correct version from config', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result = await service.getGuides();

      expect(result.version).toBe('1.0.0');
    });

    it('should return response with correct structure', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result: GetQuoteDataResponse = await service.getGuides();

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

      const result = await service.getGuides();

      expect(result.data.guides).toEqual(mockGEGuides);
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should handle Promise.allSettled correctly when service rejects', async () => {
      const error = new Error('Service unavailable');
      guiaEnviaService.getGuides.mockRejectedValue(error);

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors gracefully', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(new Error('Network error'));

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should handle timeout errors gracefully', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(
        new Error('Request timeout'),
      );

      const result = await service.getGuides();

      expect(result.data.guides).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should maintain guide data integrity', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      const result = await service.getGuides();

      expect(result.data.guides[0]).toMatchObject({
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

    it('should call guiaEnviaService.getGuides exactly once', async () => {
      guiaEnviaService.getGuides.mockResolvedValue(mockGEGuides);

      await service.getGuides();

      expect(guiaEnviaService.getGuides).toHaveBeenCalledTimes(1);
      expect(guiaEnviaService.getGuides).toHaveBeenCalledWith();
    });

    it('should not throw error when guiaEnviaService fails', async () => {
      guiaEnviaService.getGuides.mockRejectedValue(new Error('Service error'));

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

      expect(result.data.guides[0].trackingNumber).toBe('DHL987654321');
      expect(result.data.guides[1].trackingNumber).toBe('GE123456789');
    });
  });
});
