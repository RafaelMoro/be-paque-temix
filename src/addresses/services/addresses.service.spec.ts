import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { AddressesService } from './addresses.service';
import { AddressDoc } from '../entities/addresses.entity';
import config from '@/config';
import {
  ADDRESS_NOT_FOUND_ERROR,
  ALIAS_EXISTS_ERROR,
  EMAIL_MISSING_ERROR,
  MISSING_ALIAS_ERROR,
} from '../addresses.constants';
import {
  CreateAddressDtoPayload,
  UpdateAddressDto,
} from '../dtos/addresses.dto';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe('AddressesService', () => {
  let service: AddressesService;
  let model: any;

  const mockConfigService = {
    version: '1.0.0',
  };

  const mockAddressData = {
    _id: '507f1f77bcf86cd799439011',
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
  };

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

  beforeEach(async () => {
    const mockSave = jest.fn().mockResolvedValue({
      ...mockAddressData,
      toJSON: () => mockAddressData,
    });

    // Mock model constructor
    const MockModel: any = jest.fn().mockImplementation(() => ({
      save: mockSave,
      toJSON: () => mockAddressData,
    }));

    MockModel.findOne = jest.fn();
    MockModel.find = jest.fn();
    MockModel.findOneAndDelete = jest.fn();
    MockModel.findOneAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        {
          provide: getModelToken(AddressDoc.name),
          useValue: MockModel,
        },
        {
          provide: config.KEY,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
    model = module.get(getModelToken(AddressDoc.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyAliasExists', () => {
    it('should return true if alias exists', async () => {
      const execMock = jest.fn().mockResolvedValue(mockAddressData);
      model.findOne.mockReturnValue({ exec: execMock });

      const result = await service.verifyAliasExists({
        alias: 'home-address',
        email: 'test@example.com',
      });

      expect(result).toBe(true);
      expect(model.findOne).toHaveBeenCalledWith({
        alias: 'home-address',
        email: 'test@example.com',
      });
    });

    it('should return false if alias does not exist', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      model.findOne.mockReturnValue({ exec: execMock });

      const result = await service.verifyAliasExists({
        alias: 'nonexistent',
        email: 'test@example.com',
      });

      expect(result).toBe(false);
    });

    it('should throw BadRequestException on database error', async () => {
      const execMock = jest.fn().mockRejectedValue(new Error('Database error'));
      model.findOne.mockReturnValue({ exec: execMock });

      await expect(
        service.verifyAliasExists({
          alias: 'home-address',
          email: 'test@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createAddress', () => {
    it('should create and return an address successfully', async () => {
      // Mock that alias doesn't exist
      const execMock = jest.fn().mockResolvedValue(null);
      model.findOne.mockReturnValue({ exec: execMock });

      const result = await service.createAddress({
        payload: mockPayload,
        email: 'test@example.com',
      });

      expect(result).toEqual({
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
          },
        },
      });
      expect(model.findOne).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email is missing', async () => {
      await expect(
        service.createAddress({
          payload: mockPayload,
          email: '',
        }),
      ).rejects.toThrow(new BadRequestException(EMAIL_MISSING_ERROR));
    });

    it('should throw BadRequestException if alias already exists', async () => {
      const execMock = jest.fn().mockResolvedValue(mockAddressData);
      model.findOne.mockReturnValue({ exec: execMock });

      await expect(
        service.createAddress({
          payload: mockPayload,
          email: 'test@example.com',
        }),
      ).rejects.toThrow(new BadRequestException(ALIAS_EXISTS_ERROR));
    });
  });

  describe('findAddressesByEmail', () => {
    it('should return addresses for a given email', async () => {
      const execMock = jest.fn().mockResolvedValue([
        {
          ...mockAddressData,
          toJSON: () => mockAddressData,
        },
      ]);
      model.find.mockReturnValue({ exec: execMock });

      const result = await service.findAddressesByEmail('test@example.com');

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          addresses: [
            {
              addressName: 'Home',
              externalNumber: '123',
              internalNumber: '4B',
              reference: 'Near the park',
              zipcode: '12345',
              state: 'California',
              city: ['Los Angeles'],
              town: ['Downtown'],
              alias: 'home-address',
            },
          ],
        },
      });
      expect(model.find).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });

    it('should return empty array if no addresses found', async () => {
      const execMock = jest.fn().mockResolvedValue([]);
      model.find.mockReturnValue({ exec: execMock });

      const result = await service.findAddressesByEmail('test@example.com');

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          addresses: [],
        },
      });
    });

    it('should return empty array if addresses is null', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      model.find.mockReturnValue({ exec: execMock });

      const result = await service.findAddressesByEmail('test@example.com');

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          addresses: [],
        },
      });
    });
  });

  describe('deleteAddressByAliasAndEmail', () => {
    it('should delete and return the deleted address alias', async () => {
      const execMock = jest.fn().mockResolvedValue(mockAddressData);
      model.findOneAndDelete.mockReturnValue({ exec: execMock });

      const result = await service.deleteAddressByAliasAndEmail({
        alias: 'home-address',
        email: 'test@example.com',
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          address: {
            alias: 'home-address',
          },
        },
      });
      expect(model.findOneAndDelete).toHaveBeenCalledWith({
        alias: 'home-address',
        email: 'test@example.com',
      });
    });

    it('should throw NotFoundException if address not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      model.findOneAndDelete.mockReturnValue({ exec: execMock });

      await expect(
        service.deleteAddressByAliasAndEmail({
          alias: 'nonexistent',
          email: 'test@example.com',
        }),
      ).rejects.toThrow(new NotFoundException(ADDRESS_NOT_FOUND_ERROR));
    });
  });

  describe('updateAddress', () => {
    const updatePayload: UpdateAddressDto = {
      alias: 'home-address',
      addressName: 'Updated Home',
    };

    it('should update and return the updated address alias', async () => {
      const execMock = jest.fn().mockResolvedValue(mockAddressData);
      model.findOneAndUpdate.mockReturnValue({ exec: execMock });

      const result = await service.updateAddress({
        payload: updatePayload,
        email: 'test@example.com',
      });

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          address: {
            alias: 'home-address',
          },
        },
      });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { email: 'test@example.com', alias: 'home-address' },
        { $set: updatePayload },
        { new: true },
      );
    });

    it('should throw BadRequestException if alias is missing', async () => {
      const payloadWithoutAlias: UpdateAddressDto = {
        addressName: 'Updated Home',
      };

      await expect(
        service.updateAddress({
          payload: payloadWithoutAlias,
          email: 'test@example.com',
        }),
      ).rejects.toThrow(new BadRequestException(MISSING_ALIAS_ERROR));
    });

    it('should throw NotFoundException if address not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      model.findOneAndUpdate.mockReturnValue({ exec: execMock });

      await expect(
        service.updateAddress({
          payload: updatePayload,
          email: 'test@example.com',
        }),
      ).rejects.toThrow(new NotFoundException(ADDRESS_NOT_FOUND_ERROR));
    });
  });
});
