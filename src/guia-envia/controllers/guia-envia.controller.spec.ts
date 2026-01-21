import { Test, TestingModule } from '@nestjs/testing';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { GuiaEnviaController } from './guia-envia.controller';
import { GuiaEnviaService } from '../services/guia-envia.service';
import { CreateGuideGeDto } from '../dtos/guia-envia.dtos';
import { GetServiceGEResponse } from '../guia-envia.interface';

describe('GuiaEnviaController', () => {
  let controller: GuiaEnviaController;
  let service: GuiaEnviaService;

  const mockGuiaEnviaService = {
    listServicesGe: jest.fn(),
    createGuideGe: jest.fn(),
    getAddressesSavedGe: jest.fn(),
    deleteGEAddress: jest.fn(),
    editGEAddress: jest.fn(),
    createAddress: jest.fn(),
  };

  const mockJwtGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuiaEnviaController],
      providers: [
        {
          provide: GuiaEnviaService,
          useValue: mockGuiaEnviaService,
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<GuiaEnviaController>(GuiaEnviaController);
    service = module.get<GuiaEnviaService>(GuiaEnviaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCourierServices', () => {
    const mockServicesResponse: GetServiceGEResponse[] = [
      {
        id: '1',
        nombre: 'Paquete Express',
      },
      {
        id: '2',
        nombre: 'DHL Express',
      },
    ];

    it('should return courier services successfully', async () => {
      mockGuiaEnviaService.listServicesGe.mockResolvedValue(
        mockServicesResponse,
      );

      const result = await controller.getCourierServices();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listServicesGe).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listServicesGe).toHaveBeenCalledWith();
      expect(result).toEqual(mockServicesResponse);
    });

    it('should propagate service errors', async () => {
      const errorMessage = 'Service unavailable';
      mockGuiaEnviaService.listServicesGe.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.getCourierServices()).rejects.toThrow(
        errorMessage,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listServicesGe).toHaveBeenCalledTimes(1);
    });

    it('should handle empty services array', async () => {
      mockGuiaEnviaService.listServicesGe.mockResolvedValue([]);

      const result = await controller.getCourierServices();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listServicesGe).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should call service without any parameters', async () => {
      mockGuiaEnviaService.listServicesGe.mockResolvedValue(
        mockServicesResponse,
      );

      await controller.getCourierServices();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.listServicesGe).toHaveBeenCalledWith();
    });
  });

  describe('getAddressesSavedGe', () => {
    const mockAddressesResponse = {
      version: '1.0.0',
      message: null,
      error: null,
      data: {
        aliases: ['Casa Principal', 'Oficina Centro'],
        addresses: [],
        page: 1,
        pages: 1,
      },
    };

    it('should return addresses successfully without parameters', async () => {
      mockGuiaEnviaService.getAddressesSavedGe.mockResolvedValue(
        mockAddressesResponse,
      );

      const result = await controller.getAddressesSavedGe();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getAddressesSavedGe).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getAddressesSavedGe).toHaveBeenCalledWith({
        page: undefined,
        aliasesOnly: undefined,
      });
      expect(result).toEqual(mockAddressesResponse);
    });

    it('should pass page parameter to service', async () => {
      mockGuiaEnviaService.getAddressesSavedGe.mockResolvedValue(
        mockAddressesResponse,
      );

      await controller.getAddressesSavedGe('2');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getAddressesSavedGe).toHaveBeenCalledWith({
        page: '2',
        aliasesOnly: undefined,
      });
    });

    it('should pass aliasesOnly parameter to service', async () => {
      mockGuiaEnviaService.getAddressesSavedGe.mockResolvedValue(
        mockAddressesResponse,
      );

      await controller.getAddressesSavedGe(undefined, true);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getAddressesSavedGe).toHaveBeenCalledWith({
        page: undefined,
        aliasesOnly: true,
      });
    });

    it('should pass both parameters to service', async () => {
      mockGuiaEnviaService.getAddressesSavedGe.mockResolvedValue(
        mockAddressesResponse,
      );

      await controller.getAddressesSavedGe('3', false);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.getAddressesSavedGe).toHaveBeenCalledWith({
        page: '3',
        aliasesOnly: false,
      });
    });

    it('should propagate service errors', async () => {
      const errorMessage = 'Failed to fetch addresses';
      mockGuiaEnviaService.getAddressesSavedGe.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.getAddressesSavedGe()).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('deleteGEAddress', () => {
    const mockDeleteResponse = {
      version: '1.0.0',
      message: 'Address deleted successfully',
      error: null,
      data: null,
    };

    it('should delete address successfully', async () => {
      const addressId = 'address-123';
      mockGuiaEnviaService.deleteGEAddress.mockResolvedValue(
        mockDeleteResponse,
      );

      const result = await controller.deleteGEAddress(addressId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.deleteGEAddress).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.deleteGEAddress).toHaveBeenCalledWith(addressId);
      expect(result).toEqual(mockDeleteResponse);
    });

    it('should pass the correct id parameter', async () => {
      const addressId = 'specific-id-456';
      mockGuiaEnviaService.deleteGEAddress.mockResolvedValue(
        mockDeleteResponse,
      );

      await controller.deleteGEAddress(addressId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.deleteGEAddress).toHaveBeenCalledWith(addressId);
    });

    it('should propagate service errors', async () => {
      const errorMessage = 'Address not found';
      mockGuiaEnviaService.deleteGEAddress.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.deleteGEAddress('invalid-id')).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('editGEAddress', () => {
    const mockPayload = {
      zipcode: '72000',
      neighborhood: 'Centro',
      city: 'Heroica Puebla de Zaragoza',
      state: 'Puebla',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+52 222 123 4567',
      company: 'Empresa SA',
      rfc: 'XAXX010101000',
      street: 'Avenida Juárez',
      number: '123',
      reference: 'Edificio azul',
      alias: 'Casa Principal',
    };

    const mockEditResponse = {
      version: '1.0.0',
      message: 'Address edited successfully',
      error: null,
      data: {
        zipcode: '72000',
        neighborhood: 'Centro',
        city: 'Heroica Puebla de Zaragoza',
        state: 'Puebla',
        street: 'Avenida Juárez',
        number: '123',
        reference: 'Edificio azul',
        alias: 'Casa Principal',
      },
    };

    it('should edit address successfully', async () => {
      const addressId = 'address-789';
      mockGuiaEnviaService.editGEAddress.mockResolvedValue(mockEditResponse);

      const result = await controller.editGEAddress(mockPayload, addressId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.editGEAddress).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.editGEAddress).toHaveBeenCalledWith({
        id: addressId,
        payload: mockPayload,
      });
      expect(result).toEqual(mockEditResponse);
    });

    it('should pass correct parameters to service', async () => {
      const addressId = 'specific-address-id';
      mockGuiaEnviaService.editGEAddress.mockResolvedValue(mockEditResponse);

      await controller.editGEAddress(mockPayload, addressId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.editGEAddress).toHaveBeenCalledWith({
        id: addressId,
        payload: mockPayload,
      });
    });

    it('should propagate service errors', async () => {
      const errorMessage = 'Failed to update address';
      mockGuiaEnviaService.editGEAddress.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.editGEAddress(mockPayload, 'some-id'),
      ).rejects.toThrow(errorMessage);
    });

    it('should handle different payload variations', async () => {
      const alternativePayload = {
        ...mockPayload,
        name: 'María García',
        alias: 'Oficina',
      };
      const alternativeId = 'alt-address-id';

      mockGuiaEnviaService.editGEAddress.mockResolvedValue(mockEditResponse);

      await controller.editGEAddress(alternativePayload, alternativeId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.editGEAddress).toHaveBeenCalledWith({
        id: alternativeId,
        payload: alternativePayload,
      });
    });
  });

  describe('createAddress', () => {
    const mockPayload = {
      zipcode: '72000',
      neighborhood: 'Centro',
      city: 'Heroica Puebla de Zaragoza',
      state: 'Puebla',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+52 222 123 4567',
      company: 'Empresa SA',
      rfc: 'XAXX010101000',
      street: 'Avenida Juárez',
      number: '123',
      reference: 'Edificio azul',
      alias: 'Casa Principal',
    };

    const mockCreateResponse = {
      zipcode: '72000',
      neighborhood: 'Centro',
      city: 'Heroica Puebla de Zaragoza',
      state: 'Puebla',
      street: 'Avenida Juárez',
      number: '123',
      reference: 'Edificio azul',
      alias: 'Casa Principal',
    };

    it('should create address successfully', async () => {
      mockGuiaEnviaService.createAddress.mockResolvedValue(mockCreateResponse);

      const result = await controller.createAddress(mockPayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createAddress).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createAddress).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockCreateResponse);
    });

    it('should pass the exact payload to service', async () => {
      mockGuiaEnviaService.createAddress.mockResolvedValue(mockCreateResponse);

      await controller.createAddress(mockPayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createAddress).toHaveBeenCalledWith(mockPayload);

      // Verify payload structure is preserved
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const calledPayload = mockGuiaEnviaService.createAddress.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calledPayload.zipcode).toBe(mockPayload.zipcode);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calledPayload.name).toBe(mockPayload.name);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calledPayload.alias).toBe(mockPayload.alias);
    });

    it('should propagate service errors', async () => {
      const errorMessage = 'Invalid address data';
      mockGuiaEnviaService.createAddress.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(controller.createAddress(mockPayload)).rejects.toThrow(
        errorMessage,
      );
    });

    it('should handle different payload variations', async () => {
      const alternativePayload = {
        ...mockPayload,
        name: 'Carlos López',
        alias: 'Sucursal Norte',
        zipcode: '94298',
      };

      mockGuiaEnviaService.createAddress.mockResolvedValue({
        ...mockCreateResponse,
        alias: 'Sucursal Norte',
        zipcode: '94298',
      });

      const result = await controller.createAddress(alternativePayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createAddress).toHaveBeenCalledWith(alternativePayload);
      expect(result.alias).toBe('Sucursal Norte');
      expect(result.zipcode).toBe('94298');
    });
  });

  describe('createGuide', () => {
    const mockCreateGuidePayload: CreateGuideGeDto = {
      quoteId: 'quote-123',
      parcel: {
        length: '30',
        width: '20',
        height: '10',
        weight: '5.0',
        content: 'Electronics',
        satProductId: '43211508',
      },
      origin: {
        alias: 'warehouse-1',
      },
      destination: {
        alias: 'customer-address',
      },
    };

    const mockCreateGuideResponse = {
      trackingNumber: 'EST123456789',
      carrier: 'Guia Envia',
      price: '350.50',
      guideLink: 'https://app.guiaenvia.com/guia/EST123456789',
      labelUrl: 'https://app.guiaenvia.com/guia/EST123456789',
      file: null,
    };

    it('should create guide successfully', async () => {
      mockGuiaEnviaService.createGuideGe.mockResolvedValue(
        mockCreateGuideResponse,
      );

      const result = await controller.createGuide(mockCreateGuidePayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createGuideGe).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createGuideGe).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );
      expect(result).toEqual(mockCreateGuideResponse);
    });

    it('should propagate service errors', async () => {
      const errorMessage = 'Invalid guide data';
      mockGuiaEnviaService.createGuideGe.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        controller.createGuide(mockCreateGuidePayload),
      ).rejects.toThrow(errorMessage);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createGuideGe).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createGuideGe).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );
    });

    it('should pass the exact payload to the service', async () => {
      mockGuiaEnviaService.createGuideGe.mockResolvedValue(
        mockCreateGuideResponse,
      );

      await controller.createGuide(mockCreateGuidePayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createGuideGe).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );

      // Verify the payload structure is preserved
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const calledPayload = mockGuiaEnviaService.createGuideGe.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calledPayload.quoteId).toBe(mockCreateGuidePayload.quoteId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calledPayload.parcel).toEqual(mockCreateGuidePayload.parcel);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calledPayload.origin).toEqual(mockCreateGuidePayload.origin);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(calledPayload.destination).toEqual(
        mockCreateGuidePayload.destination,
      );
    });

    it('should handle different payload variations', async () => {
      const alternativePayload: CreateGuideGeDto = {
        quoteId: 'different-quote-456',
        parcel: {
          length: '40',
          width: '30',
          height: '15',
          weight: '10.0',
          content: 'Documents',
          satProductId: '43211509',
        },
        origin: {
          alias: 'branch-office',
        },
        destination: {
          alias: 'home-delivery',
        },
      };

      const alternativeResponse = {
        trackingNumber: 'DHL987654321',
        carrier: 'DHL',
        price: '450.75',
        guideLink: 'https://app.guiaenvia.com/guia/DHL987654321',
        labelUrl: 'https://app.guiaenvia.com/guia/DHL987654321',
        file: null,
      };

      mockGuiaEnviaService.createGuideGe.mockResolvedValue(alternativeResponse);

      const result = await controller.createGuide(alternativePayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createGuideGe).toHaveBeenCalledWith(alternativePayload);
      expect(result).toEqual(alternativeResponse);
    });

    it('should handle service returning null or undefined', async () => {
      mockGuiaEnviaService.createGuideGe.mockResolvedValue(null);

      const result = await controller.createGuide(mockCreateGuidePayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.createGuideGe).toHaveBeenCalledWith(
        mockCreateGuidePayload,
      );
      expect(result).toBeNull();
    });
  });

  describe('Controller Configuration', () => {
    it('should be properly configured', () => {
      // Test basic controller setup
      expect(controller).toHaveProperty('getCourierServices');
      expect(controller).toHaveProperty('createGuide');
      expect(controller).toHaveProperty('getAddressesSavedGe');
      expect(controller).toHaveProperty('deleteGEAddress');
      expect(controller).toHaveProperty('editGEAddress');
      expect(controller).toHaveProperty('createAddress');
      expect(typeof controller.getCourierServices).toBe('function');
      expect(typeof controller.createGuide).toBe('function');
      expect(typeof controller.getAddressesSavedGe).toBe('function');
      expect(typeof controller.deleteGEAddress).toBe('function');
      expect(typeof controller.editGEAddress).toBe('function');
      expect(typeof controller.createAddress).toBe('function');
    });

    it('should have service dependency injected', () => {
      // Test that the service is properly injected
      expect(service).toBeDefined();
      expect(service).toBe(mockGuiaEnviaService);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle BadRequestException from service in getCourierServices', async () => {
      const error = new Error('Bad Request');
      error.name = 'BadRequestException';
      mockGuiaEnviaService.listServicesGe.mockRejectedValue(error);

      await expect(controller.getCourierServices()).rejects.toThrow(
        'Bad Request',
      );
    });

    it('should handle BadRequestException from service in createGuide', async () => {
      const mockPayload: CreateGuideGeDto = {
        quoteId: 'invalid-quote',
        parcel: {
          length: '30',
          width: '20',
          height: '10',
          weight: '5.0',
          content: 'Test',
          satProductId: '43211508',
        },
        origin: { alias: 'origin-alias' },
        destination: { alias: 'dest-alias' },
      };

      const error = new Error('Invalid payload');
      error.name = 'BadRequestException';
      mockGuiaEnviaService.createGuideGe.mockRejectedValue(error);

      await expect(controller.createGuide(mockPayload)).rejects.toThrow(
        'Invalid payload',
      );
    });
  });
});
