import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';

import { GeneralInfoDbService } from './general-info-db.service';
import {
  GeneralInfoDb,
  GeneralInfoDbDoc,
} from '../entities/general-info-db.entity';
import { UpdateMnTokenDto } from '../dtos/general-info-db.dto';

describe('GeneralInfoDbService', () => {
  let service: GeneralInfoDbService;

  const mockGeneralInfoDoc: Partial<GeneralInfoDbDoc> = {
    configId: 'global',
    mnConfig: {
      tkProd: 'prod-token-123',
      tkDev: 'dev-token-456',
    },
    toneConfig: {
      tkProd: 'tone-prod-789',
      tkDev: 'tone-dev-012',
    },
    save: jest.fn(),
  };

  const mockModel = Object.assign(
    jest.fn(() => ({
      ...mockGeneralInfoDoc,
      save: jest.fn().mockResolvedValue(mockGeneralInfoDoc),
    })),
    {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneralInfoDbService,
        {
          provide: getModelToken(GeneralInfoDb.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<GeneralInfoDbService>(GeneralInfoDbService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call ensureConfigExists', async () => {
      // Mock findOne to return existing config to avoid private method testing
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGeneralInfoDoc),
      });

      await service.onModuleInit();

      expect(mockModel.findOne).toHaveBeenCalledWith({ configId: 'global' });
    });

    it('should create default config when none exists', async () => {
      // Mock findOne to return null, triggering config creation
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.onModuleInit();

      expect(mockModel.findOne).toHaveBeenCalledWith({ configId: 'global' });
      expect(mockModel).toHaveBeenCalled(); // Constructor should be called
    });

    it('should handle database errors during initialization', async () => {
      const error = new Error('Database error');
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(service.onModuleInit()).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConfig', () => {
    it('should return config after initialization', async () => {
      // Setup mock to return config
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGeneralInfoDoc),
      });

      // Initialize the service
      await service.onModuleInit();

      const result = await service.getConfig();

      expect(result).toEqual(mockGeneralInfoDoc);
    });

    it('should handle errors when getting config', async () => {
      const error = new Error('Config error');
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(service.getConfig()).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMnTk', () => {
    beforeEach(async () => {
      // Setup service with valid config
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGeneralInfoDoc),
      });
      await service.onModuleInit();
    });

    it('should return production token when isProd is true', async () => {
      const result = await service.getMnTk({ isProd: true });

      expect(result).toBe('prod-token-123');
    });

    it('should return development token when isProd is false', async () => {
      const result = await service.getMnTk({ isProd: false });

      expect(result).toBe('dev-token-456');
    });

    it('should handle null config', async () => {
      // Reset mocks and setup to return null
      jest.clearAllMocks();
      const getConfigSpy = jest.spyOn(service, 'getConfig');
      getConfigSpy.mockResolvedValue(null!);

      const result = await service.getMnTk({ isProd: true });

      expect(result).toBeNull();
    });

    it('should throw BadRequestException on error', async () => {
      const getConfigSpy = jest.spyOn(service, 'getConfig');
      getConfigSpy.mockRejectedValue(new Error('Config error'));

      await expect(service.getMnTk({ isProd: true })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateMnToken', () => {
    const updatePayload: UpdateMnTokenDto = {
      token: 'new-token-123',
      isProd: true,
    };

    it('should update production token successfully', async () => {
      const updatedDoc = {
        ...mockGeneralInfoDoc,
        mnConfig: { ...mockGeneralInfoDoc.mnConfig!, tkProd: 'new-token-123' },
      };
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await service.updateMnToken(updatePayload);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { configId: 'global' },
        { $set: { 'mnConfig.tkProd': 'new-token-123' } },
        { new: true },
      );
      expect(result).toBe(updatedDoc);
    });

    it('should update development token successfully', async () => {
      const devPayload: UpdateMnTokenDto = {
        token: 'new-dev-token-456',
        isProd: false,
      };
      const updatedDoc = {
        ...mockGeneralInfoDoc,
        mnConfig: {
          ...mockGeneralInfoDoc.mnConfig!,
          tkDev: 'new-dev-token-456',
        },
      };
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDoc),
      });

      const result = await service.updateMnToken(devPayload);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { configId: 'global' },
        { $set: { 'mnConfig.tkDev': 'new-dev-token-456' } },
        { new: true },
      );
      expect(result).toBe(updatedDoc);
    });

    it('should throw BadRequestException when update fails', async () => {
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updateMnToken(updatePayload)).rejects.toThrow(
        new BadRequestException('Failed to update MN token config'),
      );
    });

    it('should throw BadRequestException on database error', async () => {
      const error = new Error('Database error');
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      });

      await expect(service.updateMnToken(updatePayload)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
