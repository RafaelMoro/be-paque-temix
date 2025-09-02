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
  UpdateGlobalMarginProfitDto,
  UpdateProvidersMarginProfitDto,
} from '../dtos/global-configs.dto';
import { TypeProfitMargin } from '../global-configs.interface';
import config from '@/config';

describe('GlobalConfigsService', () => {
  let service: GlobalConfigsService;
  let globalConfigModel: jest.Mocked<Model<GlobalConfigs>>;

  const mockGlobalConfigDoc: GlobalConfigsDoc = {
    _id: 'global-config-id-123',
    configId: 'global',
    providers: [
      {
        name: 'Pkk',
        couriers: [
          {
            name: 'DHL',
            profitMargin: {
              value: 15,
              type: 'percentage',
            },
          },
        ],
      },
    ],
    globalMarginProfit: {
      value: 10,
      type: 'percentage',
    },
    save: jest.fn(),
  } as unknown as GlobalConfigsDoc;

  const mockUpdateGlobalMarginProfitDto: UpdateGlobalMarginProfitDto = {
    globalMarginProfit: {
      value: 20,
      type: 'percentage',
    },
  };

  const mockUpdateProvidersMarginProfitDto: UpdateProvidersMarginProfitDto = {
    providers: [
      {
        name: 'Pkk',
        couriers: [
          {
            name: 'DHL',
            profitMargin: {
              value: 25,
              type: 'absolute',
            },
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const mockGlobalConfigModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      save: jest.fn(),
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

    // Prevent onModuleInit from running during tests by mocking ensureConfigExists
    jest
      .spyOn(service as any, 'ensureConfigExists')
      .mockResolvedValue(undefined);
  });

  describe('ensureConfigExists', () => {
    beforeEach(() => {
      // Restore the original method for these specific tests
      jest.restoreAllMocks();
    });

    it('should use existing config if found', async () => {
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGlobalConfigDoc),
      } as any);

      await service.onModuleInit();

      expect(globalConfigModel.findOne).toHaveBeenCalledWith({
        configId: 'global',
      });
    });

    it('should throw BadRequestException on database error', async () => {
      const dbError = new Error('Database connection failed');
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await expect(service.onModuleInit()).rejects.toThrow(
        new BadRequestException('Database connection failed'),
      );
    });
  });

  describe('ensureConfigExists', () => {
    it('should create default config if none exists', async () => {
      const mockSavedDoc = { ...mockGlobalConfigDoc };
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const mockConfigInstance = {
        save: jest.fn().mockResolvedValue(mockSavedDoc),
      };

      // Mock the constructor call to return the instance
      jest
        .spyOn(globalConfigModel, 'constructor' as any)
        .mockImplementation(() => mockConfigInstance);
      Object.setPrototypeOf(globalConfigModel, function () {
        return mockConfigInstance;
      });

      await service.onModuleInit();

      expect(globalConfigModel.findOne).toHaveBeenCalledWith({
        configId: 'global',
      });
    });

    it('should use existing config if found', async () => {
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGlobalConfigDoc),
      } as any);

      await service.onModuleInit();

      expect(globalConfigModel.findOne).toHaveBeenCalledWith({
        configId: 'global',
      });
    });

    it('should throw BadRequestException on database error', async () => {
      const dbError = new Error('Database connection failed');
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await expect(service.onModuleInit()).rejects.toThrow(
        new BadRequestException('Database connection failed'),
      );
    });
  });

  describe('getConfig', () => {
    it('should return the global config', async () => {
      jest
        .spyOn(service as any, 'ensureConfigExists')
        .mockResolvedValue(undefined);
      (service as any).globalConfig = mockGlobalConfigDoc;

      const result = await service.getConfig();

      expect(result).toEqual(mockGlobalConfigDoc);
    });

    it('should throw BadRequestException on database error', async () => {
      const dbError = new Error('Database read failed');
      jest
        .spyOn(service as any, 'ensureConfigExists')
        .mockRejectedValue(dbError);

      await expect(service.getConfig()).rejects.toThrow(
        new BadRequestException('Database read failed'),
      );
    });
  });

  describe('updateProvidersConfig', () => {
    it('should update providers config successfully', async () => {
      const updatedDoc = {
        ...mockGlobalConfigDoc,
        providers: mockUpdateProvidersMarginProfitDto.providers,
      };
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      } as any);

      const result = await service.updateProvidersConfig(
        mockUpdateProvidersMarginProfitDto,
      );

      expect(globalConfigModel.findOneAndUpdate).toHaveBeenCalledWith(
        { configId: 'global' },
        { $set: { providers: mockUpdateProvidersMarginProfitDto.providers } },
        { new: true },
      );
      expect(result).toEqual(updatedDoc);
    });

    it('should throw BadRequestException when document not found', async () => {
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.updateProvidersConfig(mockUpdateProvidersMarginProfitDto),
      ).rejects.toThrow(
        new BadRequestException('Failed to update providers config'),
      );
    });

    it('should throw BadRequestException on database error', async () => {
      const dbError = new Error('Database update failed');
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await expect(
        service.updateProvidersConfig(mockUpdateProvidersMarginProfitDto),
      ).rejects.toThrow(new BadRequestException('Database update failed'));
    });
  });

  describe('updateGlobalMarginProfitConfig', () => {
    it('should update global margin profit config successfully', async () => {
      const updatedDoc = {
        ...mockGlobalConfigDoc,
        globalMarginProfit: mockUpdateGlobalMarginProfitDto.globalMarginProfit,
      };
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      } as any);

      const result = await service.updateGlobalMarginProfitConfig(
        mockUpdateGlobalMarginProfitDto,
      );

      expect(globalConfigModel.findOneAndUpdate).toHaveBeenCalledWith(
        { configId: 'global' },
        {
          $set: {
            globalMarginProfit:
              mockUpdateGlobalMarginProfitDto.globalMarginProfit,
          },
        },
        { new: true },
      );
      expect(result).toEqual(updatedDoc);
    });

    it('should throw BadRequestException when document not found', async () => {
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.updateGlobalMarginProfitConfig(mockUpdateGlobalMarginProfitDto),
      ).rejects.toThrow(
        new BadRequestException('Failed to update global profit margin'),
      );
    });

    it('should throw BadRequestException on database error', async () => {
      const dbError = new Error('Database update failed');
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await expect(
        service.updateGlobalMarginProfitConfig(mockUpdateGlobalMarginProfitDto),
      ).rejects.toThrow(new BadRequestException('Database update failed'));
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

  describe('validateProvider', () => {
    it('should not throw error for valid provider', () => {
      expect(() => service.validateProvider('Pkk')).not.toThrow();
    });

    it('should throw BadRequestException for invalid provider', () => {
      expect(() => service.validateProvider('invalid')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateCourier', () => {
    it('should not throw error for valid courier', () => {
      expect(() => service.validateCourier('DHL')).not.toThrow();
    });

    it('should throw BadRequestException for invalid courier', () => {
      expect(() => service.validateCourier('invalid')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProfitMargin', () => {
    it('should return profit margin successfully', async () => {
      jest.spyOn(service, 'getConfig').mockResolvedValue(mockGlobalConfigDoc);

      const result = await service.getProfitMargin();

      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        error: null,
        data: {
          providers: mockGlobalConfigDoc.providers,
        },
      });
    });

    it('should throw NotFoundException when global config not found', async () => {
      jest.spyOn(service, 'getConfig').mockResolvedValue(null as any);

      await expect(service.getProfitMargin()).rejects.toThrow(
        new NotFoundException('Global config not found'),
      );
    });

    it('should convert other errors to BadRequestException', async () => {
      const readError = new Error('Database read failed');
      jest.spyOn(service, 'getConfig').mockRejectedValue(readError);

      await expect(service.getProfitMargin()).rejects.toThrow(
        new BadRequestException('Database read failed'),
      );
    });
  });

  describe('manageGlobalProfitMargin', () => {
    it('should update global profit margin successfully', async () => {
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGlobalConfigDoc),
      } as any);

      const updatedDoc = {
        ...mockGlobalConfigDoc,
        globalMarginProfit: mockUpdateGlobalMarginProfitDto.globalMarginProfit,
      };
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      } as any);

      await service.onModuleInit();
      const result = await service.manageGlobalProfitMargin(
        mockUpdateGlobalMarginProfitDto,
      );

      expect(result).toEqual({
        version: '1.0.0',
        message: 'Global profit margin updated',
        error: null,
        data: {
          globalMarginProfit:
            mockUpdateGlobalMarginProfitDto.globalMarginProfit,
        },
      });
    });

    it('should throw BadRequestException for invalid type', async () => {
      const invalidDto = {
        globalMarginProfit: {
          value: 15,
          type: 'invalid' as TypeProfitMargin,
        },
      };

      await expect(
        service.manageGlobalProfitMargin(invalidDto),
      ).rejects.toThrow(
        new BadRequestException(
          "Invalid type: invalid. Type must be either 'percentage' or 'absolute'",
        ),
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database update failed');
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGlobalConfigDoc),
      } as any);
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await service.onModuleInit();
      await expect(
        service.manageGlobalProfitMargin(mockUpdateGlobalMarginProfitDto),
      ).rejects.toThrow(new BadRequestException('Database update failed'));
    });
  });

  describe('updateProvidersProfitMargin', () => {
    it('should update providers profit margin successfully', async () => {
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGlobalConfigDoc),
      } as any);

      const updatedDoc = {
        ...mockGlobalConfigDoc,
        providers: mockUpdateProvidersMarginProfitDto.providers,
      };
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      } as any);

      await service.onModuleInit();
      const result = await service.updateProvidersProfitMargin(
        mockUpdateProvidersMarginProfitDto,
      );

      expect(result).toEqual({
        version: '1.0.0',
        message: "Provider's profit margin updated",
        error: null,
        data: {
          providers: mockUpdateProvidersMarginProfitDto.providers,
        },
      });
    });

    it('should throw BadRequestException for invalid provider', async () => {
      const invalidDto = {
        providers: [
          {
            name: 'InvalidProvider',
            couriers: [
              {
                name: 'DHL',
                profitMargin: {
                  value: 15,
                  type: 'percentage' as TypeProfitMargin,
                },
              },
            ],
          },
        ],
      };

      await expect(
        service.updateProvidersProfitMargin(invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid courier', async () => {
      const invalidDto = {
        providers: [
          {
            name: 'Pkk',
            couriers: [
              {
                name: 'InvalidCourier',
                profitMargin: {
                  value: 15,
                  type: 'percentage' as TypeProfitMargin,
                },
              },
            ],
          },
        ],
      };

      await expect(
        service.updateProvidersProfitMargin(invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid profit margin type', async () => {
      const invalidDto = {
        providers: [
          {
            name: 'Pkk',
            couriers: [
              {
                name: 'DHL',
                profitMargin: {
                  value: 15,
                  type: 'invalid' as TypeProfitMargin,
                },
              },
            ],
          },
        ],
      };

      await expect(
        service.updateProvidersProfitMargin(invalidDto),
      ).rejects.toThrow(
        new BadRequestException(
          "Invalid type: invalid. Type must be either 'percentage' or 'absolute'",
        ),
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database update failed');
      globalConfigModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGlobalConfigDoc),
      } as any);
      globalConfigModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as any);

      await service.onModuleInit();
      await expect(
        service.updateProvidersProfitMargin(mockUpdateProvidersMarginProfitDto),
      ).rejects.toThrow(new BadRequestException('Database update failed'));
    });
  });
});
