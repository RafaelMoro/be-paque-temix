/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { GlobalConfigsService } from './global-configs.service';
import {
  GlobalConfigs,
  GlobalConfigsDoc,
} from '../entities/global-configs.entity';
import {
  CreateGlobalConfigsDto,
  UpdateGlobalConfigsDto,
} from '../dtos/global-configs.dto';
import { TypeProfitMargin } from '../global-configs.interface';
import config from '@/config';

describe('GlobalConfigsService', () => {
  let service: GlobalConfigsService;
  let globalConfigModel: jest.Mocked<Model<GlobalConfigs>>;

  const mockProfitMarginDoc: GlobalConfigsDoc = {
    _id: 'profit-margin-id-123',
    profitMargin: {
      value: 15,
      type: 'percentage',
    },
    save: jest.fn(),
  } as unknown as GlobalConfigsDoc;

  const mockCreateGlobalConfigsDto: CreateGlobalConfigsDto = {
    profitMargin: {
      value: 20,
      type: 'percentage',
    },
  };

  const mockUpdateGlobalConfigsDto: UpdateGlobalConfigsDto = {
    profitMargin: {
      value: 25,
      type: 'absolute',
    },
    profitMarginId: 'profit-margin-id-123',
  };

  beforeEach(async () => {
    const mockGlobalConfigModel = {
      create: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const mockConfigService = {
      version: '1.0.0',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalConfigsService,
        {
          provide: getModelToken(GlobalConfigs.name),
          useValue: mockGlobalConfigModel,
        },
        {
          provide: config.KEY,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GlobalConfigsService>(GlobalConfigsService);
    globalConfigModel = module.get(getModelToken(GlobalConfigs.name));

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createProfitMargin', () => {
    it('should create a profit margin successfully', async () => {
      const mockCreatedDoc = {
        ...mockProfitMarginDoc,
        save: jest.fn().mockResolvedValue(mockProfitMarginDoc),
      };
      globalConfigModel.create.mockResolvedValue(mockCreatedDoc as any);

      const result = await service.createProfitMargin(
        mockCreateGlobalConfigsDto,
      );

      expect(globalConfigModel.create).toHaveBeenCalledWith(
        mockCreateGlobalConfigsDto,
      );
      expect(mockCreatedDoc.save).toHaveBeenCalled();
      expect(result).toEqual(mockProfitMarginDoc);
    });

    it('should throw BadRequestException on database error', async () => {
      const dbError = new Error('Database connection failed');
      globalConfigModel.create.mockRejectedValue(dbError);

      await expect(
        service.createProfitMargin(mockCreateGlobalConfigsDto),
      ).rejects.toThrow(new BadRequestException('Database connection failed'));
    });

    it('should throw BadRequestException for unknown errors', async () => {
      globalConfigModel.create.mockRejectedValue('Unknown error');

      await expect(
        service.createProfitMargin(mockCreateGlobalConfigsDto),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });
  });

  describe('readProfitMargin', () => {
    it('should return profit margin when found', async () => {
      globalConfigModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockProfitMarginDoc]),
      } as any);

      const result = await service.readProfitMargin();

      expect(globalConfigModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockProfitMarginDoc);
    });

    it('should return null when no profit margin found', async () => {
      globalConfigModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.readProfitMargin();

      expect(globalConfigModel.find).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should throw BadRequestException on database error', async () => {
      const dbError = new Error('Database query failed');
      globalConfigModel.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await expect(service.readProfitMargin()).rejects.toThrow(
        new BadRequestException('Database query failed'),
      );
    });

    it('should throw BadRequestException for unknown errors', async () => {
      globalConfigModel.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue('Unknown error'),
      } as any);

      await expect(service.readProfitMargin()).rejects.toThrow(
        new BadRequestException('An unknown error occurred'),
      );
    });
  });

  describe('updateProfitMargin', () => {
    it('should update profit margin successfully', async () => {
      const updatedDoc = {
        ...mockProfitMarginDoc,
        profitMargin: { value: 25, type: 'absolute' },
      };
      globalConfigModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      } as any);

      const result = await service.updateProfitMargin(
        mockUpdateGlobalConfigsDto,
      );

      expect(globalConfigModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'profit-margin-id-123',
        { $set: mockUpdateGlobalConfigsDto },
      );
      expect(result).toEqual(updatedDoc);
    });

    it('should return null when document not found for update', async () => {
      globalConfigModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.updateProfitMargin(
        mockUpdateGlobalConfigsDto,
      );

      expect(result).toBeNull();
    });

    it('should throw BadRequestException on database error', async () => {
      const dbError = new Error('Database update failed');
      globalConfigModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await expect(
        service.updateProfitMargin(mockUpdateGlobalConfigsDto),
      ).rejects.toThrow(new BadRequestException('Database update failed'));
    });

    it('should throw BadRequestException for unknown errors', async () => {
      globalConfigModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue('Unknown error'),
      } as any);

      await expect(
        service.updateProfitMargin(mockUpdateGlobalConfigsDto),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });
  });

  describe('validateTypeMargin', () => {
    it('should not throw error for valid percentage type', () => {
      expect(() => service.validateTypeMargin('percentage')).not.toThrow();
    });

    it('should not throw error for valid absolute type', () => {
      expect(() => service.validateTypeMargin('absolute')).not.toThrow();
    });

    it('should throw BadRequestException for invalid type', () => {
      expect(() => service.validateTypeMargin('invalid')).toThrow(
        new BadRequestException(
          "Invalid type: invalid. Type must be either 'percentage' or 'absolute'",
        ),
      );
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => service.validateTypeMargin('')).toThrow(
        new BadRequestException(
          "Invalid type: . Type must be either 'percentage' or 'absolute'",
        ),
      );
    });
  });

  describe('manageProfitMargin', () => {
    it('should create new profit margin when none exists', async () => {
      // Mock readProfitMargin to return null (no existing profit margin)
      jest.spyOn(service, 'readProfitMargin').mockResolvedValue(null);
      jest
        .spyOn(service, 'createProfitMargin')
        .mockResolvedValue(mockProfitMarginDoc);
      jest.spyOn(service, 'validateTypeMargin').mockImplementation(() => {});

      const result = await service.manageProfitMargin(
        mockCreateGlobalConfigsDto,
      );

      expect(service.readProfitMargin).toHaveBeenCalled();
      expect(service.createProfitMargin).toHaveBeenCalledWith(
        mockCreateGlobalConfigsDto,
      );
      expect(service.validateTypeMargin).toHaveBeenCalledWith('percentage');
      expect(result).toEqual({
        version: '1.0.0',
        message: 'Profit margin created',
        error: null,
        data: {
          profitMargin: {
            value: 15,
            type: 'percentage',
          },
        },
      });
    });

    it('should update existing profit margin when one exists', async () => {
      // Mock readProfitMargin to return existing profit margin
      jest
        .spyOn(service, 'readProfitMargin')
        .mockResolvedValue(mockProfitMarginDoc);
      jest
        .spyOn(service, 'updateProfitMargin')
        .mockResolvedValue(mockProfitMarginDoc);
      jest.spyOn(service, 'validateTypeMargin').mockImplementation(() => {});

      const result = await service.manageProfitMargin(
        mockCreateGlobalConfigsDto,
      );

      expect(service.readProfitMargin).toHaveBeenCalled();
      expect(service.updateProfitMargin).toHaveBeenCalledWith({
        ...mockCreateGlobalConfigsDto,
        profitMarginId: 'profit-margin-id-123',
      });
      expect(service.validateTypeMargin).toHaveBeenCalledWith('percentage');
      expect(result).toEqual({
        version: '1.0.0',
        message: 'Profit margin updated',
        error: null,
        data: {
          profitMargin: {
            value: 20,
            type: 'percentage',
          },
        },
      });
    });

    it('should throw BadRequestException for invalid type when creating', async () => {
      const invalidDto = {
        profitMargin: {
          value: 15,
          type: 'invalid' as TypeProfitMargin,
        },
      };

      const mockInvalidDoc = {
        ...mockProfitMarginDoc,
        profitMargin: { value: 15, type: 'invalid' as TypeProfitMargin },
      } as GlobalConfigsDoc;

      jest.spyOn(service, 'readProfitMargin').mockResolvedValue(null);
      jest
        .spyOn(service, 'createProfitMargin')
        .mockResolvedValue(mockInvalidDoc);

      await expect(service.manageProfitMargin(invalidDto)).rejects.toThrow(
        new BadRequestException(
          "Invalid type: invalid. Type must be either 'percentage' or 'absolute'",
        ),
      );
    });

    it('should throw BadRequestException for invalid type when updating', async () => {
      const invalidDto = {
        profitMargin: {
          value: 15,
          type: 'invalid' as TypeProfitMargin,
        },
      };

      jest
        .spyOn(service, 'readProfitMargin')
        .mockResolvedValue(mockProfitMarginDoc);
      jest
        .spyOn(service, 'updateProfitMargin')
        .mockResolvedValue(mockProfitMarginDoc);

      await expect(service.manageProfitMargin(invalidDto)).rejects.toThrow(
        new BadRequestException(
          "Invalid type: invalid. Type must be either 'percentage' or 'absolute'",
        ),
      );
    });

    it('should throw BadRequestException when value or type is missing on update', async () => {
      const incompleteDto = {
        profitMargin: {
          value: undefined,
          type: 'percentage' as TypeProfitMargin,
        },
      } as unknown as CreateGlobalConfigsDto;

      jest
        .spyOn(service, 'readProfitMargin')
        .mockResolvedValue(mockProfitMarginDoc);
      jest
        .spyOn(service, 'updateProfitMargin')
        .mockResolvedValue(mockProfitMarginDoc);

      const result = await service.manageProfitMargin(incompleteDto);

      expect(result).toBeInstanceOf(BadRequestException);
      expect((result as BadRequestException).message).toBe(
        'Could not update profit margin',
      );
    });

    it('should handle errors from readProfitMargin', async () => {
      const readError = new Error('Read operation failed');
      jest.spyOn(service, 'readProfitMargin').mockRejectedValue(readError);

      await expect(
        service.manageProfitMargin(mockCreateGlobalConfigsDto),
      ).rejects.toThrow(new BadRequestException('Read operation failed'));
    });

    it('should handle unknown errors', async () => {
      jest
        .spyOn(service, 'readProfitMargin')
        .mockRejectedValue('Unknown error');

      await expect(
        service.manageProfitMargin(mockCreateGlobalConfigsDto),
      ).rejects.toThrow(new BadRequestException('An unknown error occurred'));
    });
  });

  describe('getProfitMargin', () => {
    it('should return profit margin successfully', async () => {
      jest
        .spyOn(service, 'readProfitMargin')
        .mockResolvedValue(mockProfitMarginDoc);

      const result = await service.getProfitMargin();

      expect(service.readProfitMargin).toHaveBeenCalled();
      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          profitMargin: {
            value: 15,
            type: 'percentage',
          },
        },
      });
    });

    it('should throw NotFoundException when profit margin not found', async () => {
      jest.spyOn(service, 'readProfitMargin').mockResolvedValue(null);

      await expect(service.getProfitMargin()).rejects.toThrow(
        new NotFoundException('Profit margin not found'),
      );
    });

    it('should re-throw NotFoundException from readProfitMargin', async () => {
      const notFoundError = new NotFoundException('Custom not found message');
      jest.spyOn(service, 'readProfitMargin').mockRejectedValue(notFoundError);

      await expect(service.getProfitMargin()).rejects.toThrow(notFoundError);
    });

    it('should convert other errors to BadRequestException', async () => {
      const readError = new Error('Database read failed');
      jest.spyOn(service, 'readProfitMargin').mockRejectedValue(readError);

      await expect(service.getProfitMargin()).rejects.toThrow(
        new BadRequestException('Database read failed'),
      );
    });

    it('should handle unknown errors', async () => {
      jest
        .spyOn(service, 'readProfitMargin')
        .mockRejectedValue('Unknown error');

      await expect(service.getProfitMargin()).rejects.toThrow(
        new BadRequestException('An unknown error occurred'),
      );
    });
  });
});
