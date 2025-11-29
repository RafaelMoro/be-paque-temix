import { Test, TestingModule } from '@nestjs/testing';
import { Request as ExpressRequest } from 'express';
import { AddressesController } from './addresses.controller';
import { AddressesService } from '../services/addresses.service';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import {
  CreateAddressDtoPayload,
  UpdateAddressDto,
} from '../dtos/addresses.dto';

/* eslint-disable @typescript-eslint/unbound-method */

describe('AddressesController', () => {
  let controller: AddressesController;
  let service: AddressesService;

  const mockAddressesService = {
    createAddress: jest.fn(),
    findAddressesByEmail: jest.fn(),
    deleteAddressByAliasAndEmail: jest.fn(),
    updateAddress: jest.fn(),
  };

  // Mock JwtGuard to bypass authentication in tests
  const mockJwtGuard = {
    canActivate: () => {
      return true;
    },
  };

  const mockRequest = {
    user: {
      email: 'test@example.com',
    },
  } as ExpressRequest;

  const mockPayload: CreateAddressDtoPayload = {
    addressName: 'Home',
    externalNumber: '123',
    internalNumber: '4B',
    reference: 'Near the park',
    zipcode: '12345',
    neighborhood: 'Central',
    state: 'California',
    city: ['Los Angeles'],
    town: ['Downtown'],
    alias: 'home-address',
  };

  const mockResponse = {
    version: '1.0.0',
    message: null,
    error: null,
    data: {
      address: {
        addressName: 'Home',
        externalNumber: '123',
        internalNumber: '4B',
        reference: 'Near the park',
        zipcode: '12345',
        state: 'California',
        city: ['Los Angeles'],
        town: ['Downtown'],
        alias: 'home-address',
        email: 'test@example.com',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        {
          provide: AddressesService,
          useValue: mockAddressesService,
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<AddressesController>(AddressesController);
    service = module.get<AddressesService>(AddressesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createAddress', () => {
    it('should call addressesService.createAddress with correct parameters', async () => {
      mockAddressesService.createAddress.mockResolvedValue(mockResponse);

      const result = await controller.createAddress(mockRequest, mockPayload);

      expect(service.createAddress).toHaveBeenCalledWith({
        payload: mockPayload,
        email: 'test@example.com',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should extract email from request.user', async () => {
      mockAddressesService.createAddress.mockResolvedValue(mockResponse);

      await controller.createAddress(mockRequest, mockPayload);

      expect(service.createAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        }),
      );
    });
  });

  describe('getAddresses', () => {
    const mockAddressesResponse = {
      version: '1.0.0',
      message: null,
      error: null,
      data: {
        addresses: [mockResponse.data.address],
      },
    };

    it('should call addressesService.findAddressesByEmail with correct email', async () => {
      mockAddressesService.findAddressesByEmail.mockResolvedValue(
        mockAddressesResponse,
      );

      const result = await controller.getAddresses(mockRequest);

      expect(service.findAddressesByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual(mockAddressesResponse);
    });

    it('should extract email from request.user', async () => {
      mockAddressesService.findAddressesByEmail.mockResolvedValue(
        mockAddressesResponse,
      );

      await controller.getAddresses(mockRequest);

      expect(service.findAddressesByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });
  });

  describe('deleteAddress', () => {
    const mockDeleteResponse = {
      version: '1.0.0',
      message: null,
      error: null,
      data: {
        address: {
          alias: 'home-address',
        },
      },
    };

    it('should call addressesService.deleteAddressByAliasAndEmail with correct parameters', async () => {
      mockAddressesService.deleteAddressByAliasAndEmail.mockResolvedValue(
        mockDeleteResponse,
      );

      const result = await controller.deleteAddress(
        'home-address',
        mockRequest,
      );

      expect(service.deleteAddressByAliasAndEmail).toHaveBeenCalledWith({
        alias: 'home-address',
        email: 'test@example.com',
      });
      expect(result).toEqual(mockDeleteResponse);
    });

    it('should extract alias from route parameter and email from request.user', async () => {
      mockAddressesService.deleteAddressByAliasAndEmail.mockResolvedValue(
        mockDeleteResponse,
      );

      await controller.deleteAddress('work-address', mockRequest);

      expect(service.deleteAddressByAliasAndEmail).toHaveBeenCalledWith({
        alias: 'work-address',
        email: 'test@example.com',
      });
    });
  });

  describe('updateAddress', () => {
    const updatePayload: UpdateAddressDto = {
      alias: 'home-address',
      addressName: 'Updated Home',
    };

    const mockUpdateResponse = {
      version: '1.0.0',
      message: null,
      error: null,
      data: {
        address: {
          alias: 'home-address',
        },
      },
    };

    it('should call addressesService.updateAddress with correct parameters', async () => {
      mockAddressesService.updateAddress.mockResolvedValue(mockUpdateResponse);

      const result = await controller.updateAddress(updatePayload, mockRequest);

      expect(service.updateAddress).toHaveBeenCalledWith({
        payload: updatePayload,
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUpdateResponse);
    });

    it('should extract email from request.user and pass payload', async () => {
      mockAddressesService.updateAddress.mockResolvedValue(mockUpdateResponse);

      await controller.updateAddress(updatePayload, mockRequest);

      expect(service.updateAddress).toHaveBeenCalledWith({
        payload: updatePayload,
        email: 'test@example.com',
      });
    });
  });
});
