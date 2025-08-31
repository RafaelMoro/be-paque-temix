/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { GlobalConfigsController } from './global-configs.controller';
import { GlobalConfigsService } from '../services/global-configs.service';
import { CreateGlobalConfigsDto } from '../dtos/global-configs.dto';
import { ProfitMarginResponse } from '../global-configs.interface';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import config from '@/config';

describe('GlobalConfigsController', () => {
  let controller: GlobalConfigsController;
  let globalConfigsService: jest.Mocked<GlobalConfigsService>;

  const mockCreateGlobalConfigsDto: CreateGlobalConfigsDto = {
    profitMargin: {
      value: 20,
      type: 'percentage',
    },
  };

  const mockProfitMarginResponse: ProfitMarginResponse = {
    version: '1.0.0',
    message: null,
    error: null,
    data: {
      profitMargin: {
        value: 15,
        type: 'percentage',
      },
    },
  };

  const mockManageProfitMarginResponse: ProfitMarginResponse = {
    version: '1.0.0',
    message: 'Profit margin created',
    error: null,
    data: {
      profitMargin: {
        value: 20,
        type: 'percentage',
      },
    },
  };

  beforeEach(async () => {
    const mockGlobalConfigsService = {
      getProfitMargin: jest.fn(),
      manageProfitMargin: jest.fn(),
    };

    const mockConfigService = {
      version: '1.0.0',
      auth: {
        jwtKey: 'test-jwt-key',
        publicKey: 'test-public-key',
        roleKey: 'test-role-key',
      },
    };

    const mockReflector = {
      get: jest.fn(),
      getAllAndOverride: jest.fn(),
    };

    const mockJwtGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const mockRolesGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalConfigsController],
      providers: [
        {
          provide: GlobalConfigsService,
          useValue: mockGlobalConfigsService,
        },
        {
          provide: config.KEY,
          useValue: mockConfigService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: JwtGuard,
          useValue: mockJwtGuard,
        },
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
      ],
    }).compile();

    controller = module.get<GlobalConfigsController>(GlobalConfigsController);
    globalConfigsService = module.get(GlobalConfigsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getProfitMargin', () => {
    it('should return profit margin successfully', async () => {
      globalConfigsService.getProfitMargin.mockResolvedValue(
        mockProfitMarginResponse,
      );

      const result = await controller.getProfitMargin();

      expect(globalConfigsService.getProfitMargin).toHaveBeenCalledWith();
      expect(result).toEqual(mockProfitMarginResponse);
    });

    it('should throw NotFoundException when service throws NotFoundException', async () => {
      const notFoundError = new NotFoundException('Profit margin not found');
      globalConfigsService.getProfitMargin.mockRejectedValue(notFoundError);

      await expect(controller.getProfitMargin()).rejects.toThrow(notFoundError);
      expect(globalConfigsService.getProfitMargin).toHaveBeenCalledWith();
    });

    it('should throw BadRequestException when service throws BadRequestException', async () => {
      const badRequestError = new BadRequestException('Database error');
      globalConfigsService.getProfitMargin.mockRejectedValue(badRequestError);

      await expect(controller.getProfitMargin()).rejects.toThrow(
        badRequestError,
      );
      expect(globalConfigsService.getProfitMargin).toHaveBeenCalledWith();
    });

    it('should propagate any other errors from service', async () => {
      const genericError = new Error('Unexpected error');
      globalConfigsService.getProfitMargin.mockRejectedValue(genericError);

      await expect(controller.getProfitMargin()).rejects.toThrow(genericError);
      expect(globalConfigsService.getProfitMargin).toHaveBeenCalledWith();
    });
  });

  describe('manageProfitMargin', () => {
    it('should create profit margin successfully', async () => {
      globalConfigsService.updateProvidersProfitMargin.mockResolvedValue(
        mockManageProfitMarginResponse,
      );

      const result = await controller.manageProfitMargin(
        mockCreateGlobalConfigsDto,
      );

      expect(globalConfigsService.updateProvidersProfitMargin).toHaveBeenCalledWith(
        mockCreateGlobalConfigsDto,
      );
      expect(result).toEqual(mockManageProfitMarginResponse);
    });

    it('should update profit margin successfully', async () => {
      const updateResponse = {
        ...mockManageProfitMarginResponse,
        message: 'Profit margin updated',
      };
      globalConfigsService.updateProvidersProfitMargin.mockResolvedValue(updateResponse);

      const result = await controller.manageProfitMargin(
        mockCreateGlobalConfigsDto,
      );

      expect(globalConfigsService.updateProvidersProfitMargin).toHaveBeenCalledWith(
        mockCreateGlobalConfigsDto,
      );
      expect(result).toEqual(updateResponse);
    });

    it('should handle absolute type profit margin', async () => {
      const absoluteDto: CreateGlobalConfigsDto = {
        profitMargin: {
          value: 50,
          type: 'absolute',
        },
      };
      const absoluteResponse: ProfitMarginResponse = {
        ...mockManageProfitMarginResponse,
        data: {
          profitMargin: {
            value: 50,
            type: 'absolute',
          },
        },
      };
      globalConfigsService.updateProvidersProfitMargin.mockResolvedValue(
        absoluteResponse,
      );

      const result = await controller.manageProfitMargin(absoluteDto);

      expect(globalConfigsService.updateProvidersProfitMargin).toHaveBeenCalledWith(
        absoluteDto,
      );
      expect(result).toEqual(absoluteResponse);
    });

    it('should throw BadRequestException when service throws BadRequestException', async () => {
      const badRequestError = new BadRequestException(
        'Invalid profit margin type',
      );
      globalConfigsService.updateProvidersProfitMargin.mockRejectedValue(
        badRequestError,
      );

      await expect(
        controller.manageProfitMargin(mockCreateGlobalConfigsDto),
      ).rejects.toThrow(badRequestError);
      expect(globalConfigsService.updateProvidersProfitMargin).toHaveBeenCalledWith(
        mockCreateGlobalConfigsDto,
      );
    });

    it('should propagate any other errors from service', async () => {
      const genericError = new Error('Database connection failed');
      globalConfigsService.updateProvidersProfitMargin.mockRejectedValue(genericError);

      await expect(
        controller.manageProfitMargin(mockCreateGlobalConfigsDto),
      ).rejects.toThrow(genericError);
      expect(globalConfigsService.updateProvidersProfitMargin).toHaveBeenCalledWith(
        mockCreateGlobalConfigsDto,
      );
    });

    it('should pass the exact DTO to service without modification', async () => {
      const complexDto: CreateGlobalConfigsDto = {
        profitMargin: {
          value: 99.99,
          type: 'percentage',
        },
      };
      globalConfigsService.updateProvidersProfitMargin.mockResolvedValue(
        mockManageProfitMarginResponse,
      );

      await controller.manageProfitMargin(complexDto);

      expect(globalConfigsService.updateProvidersProfitMargin).toHaveBeenCalledWith(
        complexDto,
      );
      expect(globalConfigsService.updateProvidersProfitMargin).toHaveBeenCalledTimes(1);
    });
  });

  describe('controller definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have globalConfigsService injected', () => {
      expect(globalConfigsService).toBeDefined();
    });
  });
});
