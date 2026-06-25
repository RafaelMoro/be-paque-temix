jest.mock('@/users/services/users.service', () => {
  return {
    UsersService: jest.fn().mockImplementation(() => ({
      findByEmail: jest.fn(),
    })),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GuidesDbService } from './guides-db.service';
import { Guide } from '../entities/guide.entity';
import { KraftIdCounter } from '../entities/kraft-id-counter.entity';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { T1Service } from '@/t1/services/t1.service';
import { PakkeService } from '@/pakke/services/pakke.service';
import { ManuableService } from '@/manuable/services/manuable.service';
import { UsersService } from '@/users/services/users.service';
import config from '@/config';

const mockGuideModel = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockCounterModel = {
  findOneAndUpdate: jest.fn(),
};

const mockGuiaEnviaService = {
  createGuideStandardized: jest.fn(),
};

const mockT1Service = {
  createGuideStandardized: jest.fn(),
};

const mockPakkeService = {
  createGuideStandardized: jest.fn(),
};

const mockManuableService = {
  createGuideStandardized: jest.fn(),
};

describe('GuidesDbService', () => {
  let service: GuidesDbService;
  const mockUsersService = { findByEmail: jest.fn() };

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuidesDbService,
        {
          provide: getModelToken(Guide.name),
          useValue: mockGuideModel,
        },
        {
          provide: getModelToken(KraftIdCounter.name),
          useValue: mockCounterModel,
        },
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
          provide: ManuableService,
          useValue: mockManuableService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: config.KEY,
          useValue: { version: '1.0.0' },
        },
      ],
    }).compile();

    service = module.get<GuidesDbService>(GuidesDbService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateKraftId', () => {
    it('should generate kraftId in correct format', async () => {
      mockCounterModel.findOneAndUpdate.mockResolvedValue({ sequence: 1 });

      const kraftId = await service.generateKraftId();

      expect(kraftId).toMatch(/^KFT-\d{6}-\d{6}$/);
    });

    it('should generate sequential kraftIds', async () => {
      mockCounterModel.findOneAndUpdate
        .mockResolvedValueOnce({ sequence: 1 })
        .mockResolvedValueOnce({ sequence: 2 });

      const id1 = await service.generateKraftId();
      const id2 = await service.generateKraftId();

      expect(id2.split('-')[2]).toBe(
        (parseInt(id1.split('-')[2]) + 1).toString().padStart(6, '0'),
      );
    });
  });

  describe('createGuide', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };
    const payload = {
      provider: 'GE' as const,
      quoteId: 'quote-123',
      parcel: {
        length: '10',
        width: '10',
        height: '10',
        weight: '1',
        content: 'Test',
        satProductId: '123',
        value: 100,
        quantity: 1,
      },
      origin: {
        alias: 'origin',
        name: 'John',
        lastName: 'Doe',
        phone: '123',
        email: 'john@example.com',
        company: 'Company',
        street1: 'Street',
        external_number: '1',
        neighborhood: 'Neighborhood',
        city: 'City',
        town: 'Town',
        state: 'State',
        zipcode: '12345',
        country: 'MX',
        reference: 'Ref',
      },
      destination: {
        alias: 'dest',
        name: 'Jane',
        lastName: 'Doe',
        phone: '456',
        email: 'jane@example.com',
        company: 'Company',
        street1: 'Street 2',
        external_number: '2',
        neighborhood: 'Neighborhood 2',
        city: 'City 2',
        town: 'Town 2',
        state: 'State 2',
        zipcode: '67890',
        country: 'MX',
        reference: 'Ref 2',
      },
      notifyMe: false,
    };

    const buildProviderResponse = (trackingNumber: string | null) => ({
      version: '1.0.0',
      message: null,
      error: null,
      data: {
        guide: trackingNumber
          ? {
              trackingNumber,
              carrier: 'Carrier',
              price: '100',
              guideLink: null,
              labelUrl: 'http://label',
              source: 'GE',
              file: null,
            }
          : null,
      },
    });

    it('should create guide with successful provider response', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockCounterModel.findOneAndUpdate.mockResolvedValue({ sequence: 1 });
      mockGuiaEnviaService.createGuideStandardized.mockResolvedValue(
        buildProviderResponse('EXT-123'),
      );
      mockGuideModel.create.mockResolvedValue({
        ...payload,
        userId: user._id,
        kraftId: 'KFT-202606-000001',
        externalId: 'EXT-123',
        status: 'created',
        isProviderTrackingSynced: true,
        labelUrl: 'http://label',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createGuide({ email: user.email }, payload);

      expect(result.data.kraftId).toMatch(/^KFT-/);
      expect(result.data.status).toBe('created');
      expect(result.data.externalId).toBe('EXT-123');
    });

    it('should save failed guide when provider returns no tracking number', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockCounterModel.findOneAndUpdate.mockResolvedValue({ sequence: 1 });
      mockGuiaEnviaService.createGuideStandardized.mockResolvedValue(
        buildProviderResponse(null),
      );
      mockGuideModel.create.mockResolvedValue({
        ...payload,
        userId: user._id,
        kraftId: 'KFT-202606-000001',
        externalId: null,
        status: 'failed',
        isProviderTrackingSynced: false,
        failureInfo: {
          errorDetails: 'Provider returned empty guide',
          errorCode: 'GDE-PVR-002',
          timestamp: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createGuide({ email: user.email }, payload);

      expect(result.data.status).toBe('failed');
      expect(result.data.kraftId).toBeDefined();
      expect(result.data.failureInfo).toBeDefined();
    });

    it('should throw KraftError when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.createGuide({ email: 'missing@example.com' }, payload),
      ).rejects.toThrow('User not found');
    });
  });
});
