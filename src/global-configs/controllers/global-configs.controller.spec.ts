/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { GlobalConfigsController } from './global-configs.controller';
import { GlobalConfigsService } from '../services/global-configs.service';
import {
  UpdateGlobalMarginProfitDto,
  UpdateProvidersMarginProfitDto,
} from '../dtos/global-configs.dto';
import {
  ProfitMarginResponse,
  GlobalProfitMarginResponse,
} from '../global-configs.interface';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import config from '@/config';

describe('GlobalConfigsController', () => {
  let controller: GlobalConfigsController;
  let globalConfigsService: jest.Mocked<GlobalConfigsService>;

  const mockUpdateProvidersMarginProfitDto: UpdateProvidersMarginProfitDto = {
    providers: [
      {
        name: 'Pkk',
        couriers: [
          {
            name: 'DHL',
            profitMargin: {
              value: 20,
              type: 'percentage',
            },
          },
        ],
      },
    ],
  };

  const mockUpdateGlobalMarginProfitDto: UpdateGlobalMarginProfitDto = {
    globalMarginProfit: {
      value: 15,
      type: 'percentage',
    },
  };

  const mockProfitMarginResponse: ProfitMarginResponse = {
    version: '1.0.0',
    message: null,
    error: null,
    data: {
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
    },
  };

  const mockGlobalProfitMarginResponse: GlobalProfitMarginResponse = {
    version: '1.0.0',
    message: 'Global profit margin updated',
    error: null,
    data: {
      globalMarginProfit: {
        value: 15,
        type: 'percentage',
      },
    },
  };

  beforeEach(async () => {
    const mockGlobalConfigsService = {
      getProfitMargin: jest.fn(),
      updateProvidersProfitMargin: jest.fn(),
      manageGlobalProfitMargin: jest.fn(),
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

  describe('manageProfitMargin (updateProvidersProfitMargin)', () => {
    it('should update providers profit margin successfully', async () => {
      const updateResponse: ProfitMarginResponse = {
        ...mockProfitMarginResponse,
        message: "Provider's profit margin updated",
      };
      globalConfigsService.updateProvidersProfitMargin.mockResolvedValue(
        updateResponse,
      );

      const result = await controller.manageProfitMargin(
        mockUpdateProvidersMarginProfitDto,
      );

      expect(
        globalConfigsService.updateProvidersProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateProvidersMarginProfitDto);
      expect(result).toEqual(updateResponse);
    });

    it('should handle multiple providers and couriers', async () => {
      const complexDto: UpdateProvidersMarginProfitDto = {
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
              {
                name: 'UPS',
                profitMargin: {
                  value: 10,
                  type: 'percentage',
                },
              },
            ],
          },
          {
            name: 'GE',
            couriers: [
              {
                name: 'Fedex',
                profitMargin: {
                  value: 15,
                  type: 'percentage',
                },
              },
            ],
          },
        ],
      };
      const complexResponse: ProfitMarginResponse = {
        ...mockProfitMarginResponse,
        data: { providers: complexDto.providers },
      };
      globalConfigsService.updateProvidersProfitMargin.mockResolvedValue(
        complexResponse,
      );

      const result = await controller.manageProfitMargin(complexDto);

      expect(
        globalConfigsService.updateProvidersProfitMargin,
      ).toHaveBeenCalledWith(complexDto);
      expect(result).toEqual(complexResponse);
    });

    it('should throw BadRequestException when service throws BadRequestException', async () => {
      const badRequestError = new BadRequestException(
        'Invalid provider or courier',
      );
      globalConfigsService.updateProvidersProfitMargin.mockRejectedValue(
        badRequestError,
      );

      await expect(
        controller.manageProfitMargin(mockUpdateProvidersMarginProfitDto),
      ).rejects.toThrow(badRequestError);
      expect(
        globalConfigsService.updateProvidersProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateProvidersMarginProfitDto);
    });

    it('should propagate any other errors from service', async () => {
      const genericError = new Error('Database connection failed');
      globalConfigsService.updateProvidersProfitMargin.mockRejectedValue(
        genericError,
      );

      await expect(
        controller.manageProfitMargin(mockUpdateProvidersMarginProfitDto),
      ).rejects.toThrow(genericError);
      expect(
        globalConfigsService.updateProvidersProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateProvidersMarginProfitDto);
    });
  });

  describe('updateGlobalProfitMargin', () => {
    it('should update global profit margin successfully', async () => {
      globalConfigsService.manageGlobalProfitMargin.mockResolvedValue(
        mockGlobalProfitMarginResponse,
      );

      const result = await controller.updateGlobalProfitMargin(
        mockUpdateGlobalMarginProfitDto,
      );

      expect(
        globalConfigsService.manageGlobalProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateGlobalMarginProfitDto);
      expect(result).toEqual(mockGlobalProfitMarginResponse);
    });

    it('should handle absolute type global profit margin', async () => {
      const absoluteDto: UpdateGlobalMarginProfitDto = {
        globalMarginProfit: {
          value: 50,
          type: 'absolute',
        },
      };
      const absoluteResponse: GlobalProfitMarginResponse = {
        ...mockGlobalProfitMarginResponse,
        data: {
          globalMarginProfit: {
            value: 50,
            type: 'absolute',
          },
        },
      };
      globalConfigsService.manageGlobalProfitMargin.mockResolvedValue(
        absoluteResponse,
      );

      const result = await controller.updateGlobalProfitMargin(absoluteDto);

      expect(
        globalConfigsService.manageGlobalProfitMargin,
      ).toHaveBeenCalledWith(absoluteDto);
      expect(result).toEqual(absoluteResponse);
    });

    it('should throw BadRequestException when service throws BadRequestException', async () => {
      const badRequestError = new BadRequestException(
        'Invalid global profit margin type',
      );
      globalConfigsService.manageGlobalProfitMargin.mockRejectedValue(
        badRequestError,
      );

      await expect(
        controller.updateGlobalProfitMargin(mockUpdateGlobalMarginProfitDto),
      ).rejects.toThrow(badRequestError);
      expect(
        globalConfigsService.manageGlobalProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateGlobalMarginProfitDto);
    });

    it('should propagate any other errors from service', async () => {
      const genericError = new Error('Database update failed');
      globalConfigsService.manageGlobalProfitMargin.mockRejectedValue(
        genericError,
      );

      await expect(
        controller.updateGlobalProfitMargin(mockUpdateGlobalMarginProfitDto),
      ).rejects.toThrow(genericError);
      expect(
        globalConfigsService.manageGlobalProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateGlobalMarginProfitDto);
    });
  });

  describe('manageProfitMargin (updateProvidersProfitMargin)', () => {
    it('should update providers profit margin successfully', async () => {
      const updateResponse: ProfitMarginResponse = {
        ...mockProfitMarginResponse,
        message: "Provider's profit margin updated",
      };
      globalConfigsService.updateProvidersProfitMargin.mockResolvedValue(
        updateResponse,
      );

      const result = await controller.manageProfitMargin(
        mockUpdateProvidersMarginProfitDto,
      );

      expect(
        globalConfigsService.updateProvidersProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateProvidersMarginProfitDto);
      expect(result).toEqual(updateResponse);
    });

    it('should throw BadRequestException when service throws BadRequestException', async () => {
      const badRequestError = new BadRequestException(
        'Invalid profit margin type',
      );
      globalConfigsService.updateProvidersProfitMargin.mockRejectedValue(
        badRequestError,
      );

      await expect(
        controller.manageProfitMargin(mockUpdateProvidersMarginProfitDto),
      ).rejects.toThrow(badRequestError);
      expect(
        globalConfigsService.updateProvidersProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateProvidersMarginProfitDto);
    });

    it('should propagate any other errors from service', async () => {
      const genericError = new Error('Database connection failed');
      globalConfigsService.updateProvidersProfitMargin.mockRejectedValue(
        genericError,
      );

      await expect(
        controller.manageProfitMargin(mockUpdateProvidersMarginProfitDto),
      ).rejects.toThrow(genericError);
      expect(
        globalConfigsService.updateProvidersProfitMargin,
      ).toHaveBeenCalledWith(mockUpdateProvidersMarginProfitDto);
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
