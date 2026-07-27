jest.mock('@/users/services/users.service', () => {
  return {
    UsersService: jest.fn().mockImplementation(() => ({
      findByEmail: jest.fn(),
    })),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GuidesDbService } from './guides-db.service';
import { GetGuidesQueryDto } from '../dtos/guides-db.dto';
import { Guide, GuideDoc } from '../entities/guide.entity';
import { KraftIdCounter } from '../entities/kraft-id-counter.entity';
import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { T1Service } from '@/t1/services/t1.service';
import { PakkeService } from '@/pakke/services/pakke.service';
import { ManuableService } from '@/manuable/services/manuable.service';
import { UsersService } from '@/users/services/users.service';
import { BalanceService } from '@/balance/services/balance.service';
import { QuoteCourier } from '@/quotes/quotes.interface';
import config from '@/config';

const mockGuideModel = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const mockCounterModel = {
  findOneAndUpdate: jest.fn(),
};

const createMockFindQuery = (leanResult: unknown) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(leanResult),
});

const createMockFindOneQuery = (resolvedValue: unknown) => ({
  populate: jest.fn().mockResolvedValue(resolvedValue),
});

const mockGuiaEnviaService = {
  createGuideStandardized: jest.fn(),
  getGuides: jest.fn(),
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
  const mockBalanceService = {
    assertSufficientBalance: jest.fn(),
    debitBalance: jest.fn(),
  };
  const mockConnection = {
    transaction: jest.fn(async (callback) => callback({})),
  };

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
          provide: BalanceService,
          useValue: mockBalanceService,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: config.KEY,
          useValue: {
            version: '1.0.0',
            businessTimezone: 'America/Mexico_City',
          },
        },
      ],
    }).compile();

    service = module.get<GuidesDbService>(GuidesDbService);

    jest.clearAllMocks();
    mockBalanceService.assertSufficientBalance.mockResolvedValue({});
    mockBalanceService.debitBalance.mockResolvedValue({});
    mockGuideModel.findByIdAndUpdate.mockImplementation(
      async (_id, update) => ({
        ...update,
        _id: new Types.ObjectId(),
        kraftId: 'KFT-202606-000001',
        status: update.status ?? 'waiting',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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

    it('uses the business timezone calendar month for the counter key', async () => {
      mockCounterModel.findOneAndUpdate.mockResolvedValue({ sequence: 1 });
      jest.useFakeTimers();

      jest.setSystemTime(new Date('2026-02-01T05:59:59.999Z'));
      await expect(service.generateKraftId()).resolves.toBe(
        'KFT-202601-000001',
      );
      expect(mockCounterModel.findOneAndUpdate).toHaveBeenLastCalledWith(
        { yearMonth: '202601' },
        expect.any(Object),
        expect.any(Object),
      );

      jest.setSystemTime(new Date('2026-02-01T06:00:00.000Z'));
      await expect(service.generateKraftId()).resolves.toBe(
        'KFT-202602-000001',
      );
      expect(mockCounterModel.findOneAndUpdate).toHaveBeenLastCalledWith(
        { yearMonth: '202602' },
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('createGuide', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };
    const payload = {
      provider: 'GE' as const,
      quote: {
        id: 'quote-123',
        service: 'standard',
        total: 100,
        typeService: 'standard' as const,
        courier: 'Estafeta' as QuoteCourier,
      },
      parcel: {
        length: 10,
        width: 10,
        height: 10,
        weight: 1,
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

    it.each([
      ['success', 'created'],
      ['failed', 'failed'],
    ] as const)(
      'should create a %s mocked guide without calling the provider',
      async (mock, status) => {
        mockUsersService.findByEmail.mockResolvedValue(user);
        mockCounterModel.findOneAndUpdate.mockResolvedValue({ sequence: 1 });
        mockGuideModel.create.mockImplementation((guide) =>
          Promise.resolve({
            ...guide,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );

        const result = await service.createGuide(
          { email: user.email },
          payload,
          { mock },
        );

        expect(result.data.status).toBe(status);
        if (mock === 'success') {
          expect(result.data.externalId).toMatch(/^MOCK-KFT-/);
        } else {
          expect(result.data.externalId).toBeNull();
        }
        expect(
          mockGuiaEnviaService.createGuideStandardized,
        ).not.toHaveBeenCalled();
      },
    );

    it('should throw KraftError when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.createGuide({ email: 'missing@example.com' }, payload),
      ).rejects.toThrow('User not found');
    });
  });

  describe('getGuidesByUser', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };

    it('should return paginated guides for user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.find.mockReturnValue(createMockFindQuery([]));
      mockGuideModel.countDocuments.mockResolvedValue(0);

      const result = await service.getGuidesByUser(
        { email: user.email },
        { page: 1, limit: 10 },
      );

      expect(result.data.guides).toEqual([]);
      expect(result.data.total).toBe(0);
      expect(result.data.totalPages).toBe(0);
      expect(mockGuideModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user._id, deletedAt: null }),
      );
    });

    it('should apply month and year filter to limit results', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.find.mockReturnValue(createMockFindQuery([]));
      mockGuideModel.countDocuments.mockResolvedValue(0);

      await service.getGuidesByUser(
        { email: user.email },
        { page: 1, limit: 10, month: 6, year: 2026 },
      );

      expect(mockGuideModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user._id,
          deletedAt: null,
          createdAt: expect.objectContaining({
            $gte: new Date('2026-06-01T06:00:00.000Z'),
            $lt: new Date('2026-07-01T06:00:00.000Z'),
          }),
        }),
      );
    });

    it('uses Mexico City local midnight for February 2026 boundaries', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.find.mockReturnValue(createMockFindQuery([]));
      mockGuideModel.countDocuments.mockResolvedValue(0);

      await service.getGuidesByUser(
        { email: user.email },
        { page: 1, limit: 10, month: 2, year: 2026 },
      );

      expect(mockGuideModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: new Date('2026-02-01T06:00:00.000Z'),
            $lt: new Date('2026-03-01T06:00:00.000Z'),
          },
        }),
      );
    });

    it('should default to current month when month/year not provided', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.find.mockReturnValue(createMockFindQuery([]));
      mockGuideModel.countDocuments.mockResolvedValue(0);
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-01T05:59:59.999Z'));

      await service.getGuidesByUser(
        { email: user.email },
        { page: 1, limit: 10 },
      );

      expect(mockGuideModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({
            $gte: new Date('2026-01-01T06:00:00.000Z'),
            $lt: new Date('2026-02-01T06:00:00.000Z'),
          }),
        }),
      );
    });

    it('uses explicit offset date ranges when no month or year is supplied', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.find.mockReturnValue(createMockFindQuery([]));
      mockGuideModel.countDocuments.mockResolvedValue(0);

      await service.getGuidesByUser(
        { email: user.email },
        {
          page: 1,
          limit: 10,
          startDate: '2026-02-01T00:00:00-06:00',
          endDate: '2026-02-01T06:00:00Z',
        },
      );

      expect(mockGuideModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: new Date('2026-02-01T06:00:00.000Z'),
            $lte: new Date('2026-02-01T06:00:00.000Z'),
          },
        }),
      );
    });

    it('rejects ambiguous date ranges before querying MongoDB', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.getGuidesByUser(
          { email: user.email },
          { page: 1, limit: 10, startDate: '2026-02-01' },
        ),
      ).rejects.toThrow('explicit UTC offset');
      await expect(
        service.getGuidesByUser(
          { email: user.email },
          { page: 1, limit: 10, startDate: '2026-02-01T00:00:00' },
        ),
      ).rejects.toThrow('explicit UTC offset');
      await expect(
        service.getGuidesByUser(
          { email: user.email },
          { page: 1, limit: 10, startDate: 'not-a-date' },
        ),
      ).rejects.toThrow('explicit UTC offset');

      expect(mockGuideModel.find).not.toHaveBeenCalled();
    });

    it('preserves month/year precedence over explicit date ranges', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.find.mockReturnValue(createMockFindQuery([]));
      mockGuideModel.countDocuments.mockResolvedValue(0);

      await service.getGuidesByUser(
        { email: user.email },
        {
          page: 1,
          limit: 10,
          month: 2,
          year: 2026,
          startDate: '2026-01-01T00:00:00-06:00',
        },
      );

      expect(mockGuideModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: new Date('2026-02-01T06:00:00.000Z'),
            $lt: new Date('2026-03-01T06:00:00.000Z'),
          },
        }),
      );
    });

    it('validates guide date range DTO values require explicit offsets', async () => {
      const validOffset = plainToInstance(GetGuidesQueryDto, {
        startDate: '2026-02-01T00:00:00-06:00',
      });
      const validUtc = plainToInstance(GetGuidesQueryDto, {
        startDate: '2026-02-01T06:00:00Z',
      });
      const dateOnly = plainToInstance(GetGuidesQueryDto, {
        startDate: '2026-02-01',
      });
      const offsetFree = plainToInstance(GetGuidesQueryDto, {
        startDate: '2026-02-01T00:00:00',
      });
      const malformed = plainToInstance(GetGuidesQueryDto, {
        startDate: 'not-a-date',
      });

      await expect(validate(validOffset)).resolves.toHaveLength(0);
      await expect(validate(validUtc)).resolves.toHaveLength(0);
      await expect(validate(dateOnly)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'startDate' }),
        ]),
      );
      await expect(validate(offsetFree)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'startDate' }),
        ]),
      );
      await expect(validate(malformed)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'startDate' }),
        ]),
      );
    });
  });

  describe('getAllGuides', () => {
    const admin = { _id: new Types.ObjectId(), email: 'admin@example.com' };

    it('should apply scope=all and month filter', async () => {
      mockGuideModel.find.mockReturnValue(createMockFindQuery([]));
      mockGuideModel.countDocuments.mockResolvedValue(0);

      const result = await service.getAllGuides(
        { scope: 'all', month: 6, year: 2026 },
        { email: admin.email },
      );

      expect(result.data.total).toBe(0);
      expect(mockGuideModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
          createdAt: {
            $gte: new Date('2026-06-01T06:00:00.000Z'),
            $lt: new Date('2026-07-01T06:00:00.000Z'),
          },
        }),
      );
    });
  });

  describe('getGuideById', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };

    it('should return guide by kraftId for owner', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.getGuideById(
        'KFT-202606-000001',
        { email: user.email },
        false,
      );

      expect(result.data.kraftId).toBe('KFT-202606-000001');
      expect(mockGuideModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          kraftId: 'KFT-202606-000001',
          userId: user._id,
          deletedAt: null,
        }),
      );
    });
  });

  describe('checkRetryEligibility', () => {
    it('should return eligible when no retries yet', () => {
      const guide = {
        status: 'failed',
        retries: { retryCount: 0, retryAttempts: [], lastRetryAt: undefined },
      } as any;

      const result = service.checkRetryEligibility(guide);

      expect(result.eligible).toBe(true);
    });

    it('should return not eligible when max retries reached', () => {
      const guide = {
        status: 'failed',
        retries: { retryCount: 10, retryAttempts: [], lastRetryAt: new Date() },
      } as any;

      const result = service.checkRetryEligibility(guide);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Maximum retry attempts');
    });

    it('should return not eligible when cooldown active', () => {
      const recentRetry = new Date(Date.now() - 60 * 1000);
      const guide = {
        status: 'failed',
        retries: { retryCount: 1, retryAttempts: [], lastRetryAt: recentRetry },
      } as any;

      const result = service.checkRetryEligibility(guide);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Cooldown period active');
    });
  });

  describe('retryFailedGuide', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };

    it('should throw when not eligible for retry', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'failed',
          provider: 'GE',
          retries: { retryCount: 10, retryAttempts: [] },
          quoteData: { quote: { id: 'q1' } },
          origin: { alias: 'o1' },
          destination: { alias: 'd1' },
          parcel: { length: 10 },
        }),
      );

      await expect(
        service.retryFailedGuide('KFT-202606-000001', { email: user.email }),
      ).rejects.toThrow('Maximum retry attempts');
    });
  });

  describe('syncGuideWithProvider', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };

    it('should throw when guide has no externalId', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
          externalId: null,
        }),
      );

      await expect(
        service.syncGuideWithProvider(
          'KFT-202606-000001',
          { email: user.email },
          false,
        ),
      ).rejects.toThrow('no external tracking ID');
    });

    it('should sync guide status from GE provider', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
          externalId: 'EXT123',
        }),
      );
      mockGuiaEnviaService.getGuides.mockResolvedValue([
        { trackingNumber: 'EXT123', status: 'in-transit' },
      ]);
      mockGuideModel.findByIdAndUpdate.mockResolvedValue({});
      mockGuideModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(),
        kraftId: 'KFT-202606-000001',
        status: 'created',
        provider: 'GE',
        externalId: 'EXT123',
        providerStatus: 'in-transit',
      });

      const result = await service.syncGuideWithProvider(
        'KFT-202606-000001',
        { email: user.email },
        false,
      );

      expect(mockGuiaEnviaService.getGuides).toHaveBeenCalled();
      expect(mockGuideModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({ providerStatus: 'in-transit' }),
        }),
      );
    });
  });

  describe('retryFailedGuide success path', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };

    it('should update guide on successful retry', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      const guideId = new Types.ObjectId();
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: guideId,
          kraftId: 'KFT-202606-000001',
          status: 'failed',
          provider: 'GE',
          retries: { retryCount: 1, retryAttempts: [], lastRetryAt: null },
          quoteData: { quote: { id: 'q1' } },
          origin: { alias: 'o1' },
          destination: { alias: 'd1' },
          parcel: { length: 10 },
        }),
      );
      mockGuiaEnviaService.createGuideStandardized.mockResolvedValue({
        version: '1.0',
        data: {
          guide: { trackingNumber: 'NEW123', labelUrl: 'http://label.com' },
        },
        error: null,
        message: null,
      });
      mockGuideModel.findByIdAndUpdate.mockResolvedValue({});
      mockGuideModel.findById.mockResolvedValue({
        _id: guideId,
        kraftId: 'KFT-202606-000001',
        status: 'created',
        provider: 'GE',
        externalId: 'NEW123',
        labelUrl: 'http://label.com',
        retries: { retryCount: 2 },
      });

      const result = await service.retryFailedGuide('KFT-202606-000001', {
        email: user.email,
      });

      expect(result.data.status).toBe('created');
      expect(result.data.externalId).toBe('NEW123');
    });
  });

  describe('mapProviderErrorToKraftCode', () => {
    it('should return GDE-NET-001 for ENOTFOUND', () => {
      const result = (service as any).mapProviderErrorToKraftCode({
        code: 'ENOTFOUND',
      });
      expect(result).toBe('GDE-NET-001');
    });

    it('should return GDE-TMOT-001 for ETIMEDOUT', () => {
      const result = (service as any).mapProviderErrorToKraftCode({
        code: 'ETIMEDOUT',
      });
      expect(result).toBe('GDE-TMOT-001');
    });

    it('should return GDE-PVR-003 for 401 status', () => {
      const result = (service as any).mapProviderErrorToKraftCode({
        response: { status: 401 },
      });
      expect(result).toBe('GDE-PVR-003');
    });

    it('should return GDE-PVR-004 for 500 status', () => {
      const result = (service as any).mapProviderErrorToKraftCode({
        response: { status: 500 },
      });
      expect(result).toBe('GDE-PVR-004');
    });

    it('should return GDE-RLIM-003 for rate limit message', () => {
      const result = (service as any).mapProviderErrorToKraftCode({
        message: 'rate limit exceeded',
      });
      expect(result).toBe('GDE-RLIM-003');
    });

    it('should return default GDE-PVR-001', () => {
      const result = (service as any).mapProviderErrorToKraftCode({});
      expect(result).toBe('GDE-PVR-001');
    });

    it('should map Manuable Axios expiration responses to GDE-PVR-006', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { errors: { reason: 'Rate request already has a label' } },
        },
      };

      const result = (service as any).buildProviderErrorResult(error, 'Mn');

      expect(result.errorCode).toBe('GDE-PVR-006');
    });

    it('should map Manuable Nest expiration responses to GDE-PVR-006', () => {
      const error = new BadRequestException({
        errors: { reason: 'Rate request already has a label' },
      });

      const result = (service as any).buildProviderErrorResult(error, 'Mn');

      expect(result.errorCode).toBe('GDE-PVR-006');
    });
  });

  describe('addComment', () => {
    const admin = { _id: new Types.ObjectId(), email: 'admin@example.com' };

    it('should add comment to guide', async () => {
      mockUsersService.findByEmail.mockResolvedValue(admin);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
          comments: [],
        }),
      );
      mockGuideModel.findByIdAndUpdate.mockResolvedValue({});
      mockGuideModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(),
        kraftId: 'KFT-202606-000001',
        status: 'created',
        provider: 'GE',
        comments: [
          { text: 'Test comment', adminId: admin._id, timestamp: new Date() },
        ],
      });

      const result = await service.addComment(
        'KFT-202606-000001',
        { email: admin.email },
        { text: 'Test comment' },
      );

      expect(mockGuideModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        {
          $push: {
            comments: expect.objectContaining({ text: 'Test comment' }),
          },
        },
      );
      expect(result.data.kraftId).toBe('KFT-202606-000001');
    });
  });

  describe('updateGuideStatus', () => {
    const admin = { _id: new Types.ObjectId(), email: 'admin@example.com' };

    it('should update guide status', async () => {
      mockUsersService.findByEmail.mockResolvedValue(admin);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'failed',
          provider: 'GE',
        }),
      );
      mockGuideModel.findByIdAndUpdate.mockResolvedValue({});
      mockGuideModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(),
        kraftId: 'KFT-202606-000001',
        status: 'delivered',
        provider: 'GE',
      });

      const result = await service.updateGuideStatus(
        'KFT-202606-000001',
        { email: admin.email },
        { status: 'delivered' },
      );

      expect(mockGuideModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { $set: { status: 'delivered' } },
      );
      expect(result.data.status).toBe('delivered');
    });
  });

  describe('softDeleteGuide', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };

    it('should soft delete a guide', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
        }),
      );
      mockGuideModel.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.softDeleteGuide('KFT-202606-000001', {
        email: user.email,
      });

      expect(mockGuideModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { $set: { deletedAt: expect.any(Date), deletedBy: user._id } },
      );
      expect(result.data.guide.kraftId).toBe('KFT-202606-000001');
    });
  });

  describe('hardDeleteGuide', () => {
    const admin = { _id: new Types.ObjectId(), email: 'admin@example.com' };

    it('should permanently delete a guide', async () => {
      mockUsersService.findByEmail.mockResolvedValue(admin);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
        }),
      );
      mockGuideModel.findByIdAndDelete.mockResolvedValue({});

      const result = await service.hardDeleteGuide('KFT-202606-000001', {
        email: admin.email,
      });

      expect(result.data.guide.kraftId).toBe('KFT-202606-000001');

      expect(mockGuideModel.findByIdAndDelete).toHaveBeenCalled();
    });
  });

  describe('updateGuideData', () => {
    const user = { _id: new Types.ObjectId(), email: 'user@example.com' };

    it('should throw when payload is empty', async () => {
      await expect(
        service.updateGuideData('KFT-202606-000001', { email: user.email }, {}),
      ).rejects.toThrow('Update payload cannot be empty');
      expect(mockUsersService.findByEmail).not.toHaveBeenCalled();
    });

    it('should update guide data and re-call provider successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      const guideId = new Types.ObjectId();
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: guideId,
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
          externalId: 'OLD-EXT-123',
          quoteData: { quote: { id: 'old-quote' } },
          origin: { alias: 'old-origin' },
          destination: { alias: 'old-dest' },
          parcel: { length: 10, weight: 1 },
        }),
      );
      mockGuiaEnviaService.createGuideStandardized.mockResolvedValue({
        version: '1.0',
        data: {
          guide: {
            trackingNumber: 'NEW-EXT-456',
            labelUrl: 'http://new-label.com',
          },
        },
        error: null,
        message: null,
      });
      mockGuideModel.findByIdAndUpdate.mockResolvedValue({});
      mockGuideModel.findById.mockResolvedValue({
        _id: guideId,
        kraftId: 'KFT-202606-000001',
        status: 'created',
        provider: 'GE',
        externalId: 'NEW-EXT-456',
        labelUrl: 'http://new-label.com',
        quoteData: { quote: { id: 'new-quote' } },
        origin: { alias: 'new-origin' },
        destination: { alias: 'old-dest' },
        parcel: { length: 10, weight: 1 },
      });

      const result = await service.updateGuideData(
        'KFT-202606-000001',
        { email: user.email },
        { quote: { id: 'new-quote' }, origin: { alias: 'new-origin' } as any },
      );

      expect(result.data.status).toBe('created');
      expect(result.data.externalId).toBe('NEW-EXT-456');
      expect(mockGuideModel.findByIdAndUpdate).toHaveBeenCalledWith(
        guideId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'quoteData.quote': { id: 'new-quote' },
            origin: { alias: 'new-origin' },
            externalId: 'NEW-EXT-456',
            status: 'created',
          }),
          $push: { oldExternalIds: 'OLD-EXT-123' },
        }),
      );
    });

    it('should throw GDE-PVR-006 when Mn returns "Rate request already has a label"', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'Mn',
          externalId: 'OLD-EXT-123',
          quoteData: { quote: { id: 'expired-quote' } },
          origin: { alias: 'o' },
          destination: { alias: 'd' },
          parcel: { length: 10, weight: 1 },
        }),
      );
      mockManuableService.createGuideStandardized.mockRejectedValue(
        new BadRequestException({
          errors: { reason: 'Rate request already has a label' },
        }),
      );

      await expect(
        service.updateGuideData(
          'KFT-202606-000001',
          { email: user.email },
          {
            quote: { id: 'expired-quote' },
            parcel: { content: 'Updated content' },
          },
        ),
      ).rejects.toThrow('Quote has expired, please create a new quote');
      expect(mockGuideModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should not persist a changed-quote update when Manuable reports expiration', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'Mn',
          quoteData: { quote: { id: 'old-quote' } },
          origin: { alias: 'o' },
          destination: { alias: 'd' },
          parcel: { content: 'Stored', satProductId: 'SAT-1' },
        }),
      );
      mockManuableService.createGuideStandardized.mockRejectedValue(
        new BadRequestException({
          errors: { reason: 'Rate request already has a label' },
        }),
      );

      await expect(
        service.updateGuideData(
          'KFT-202606-000001',
          { email: user.email },
          { quote: { id: 'new-quote' } },
        ),
      ).rejects.toMatchObject({
        code: 'GDE-PVR-006',
        message:
          'Quote has expired, please create a new quote before updating the guide',
      });
      expect(mockGuideModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should mark guide as failed when provider returns other error', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
          externalId: 'OLD-EXT-123',
          quoteData: { quote: { id: 'q1' } },
          origin: { alias: 'o' },
          destination: { alias: 'd' },
          parcel: { length: 10, weight: 1 },
        }),
      );
      mockGuiaEnviaService.createGuideStandardized.mockResolvedValue({
        version: '1.0',
        data: { guide: null },
        error: null,
        message: null,
      });
      mockGuideModel.findByIdAndUpdate.mockResolvedValue({});
      mockGuideModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(),
        kraftId: 'KFT-202606-000001',
        status: 'failed',
        provider: 'GE',
        externalId: 'OLD-EXT-123',
        quoteData: { quote: { id: 'q1' } },
        origin: { alias: 'o' },
        destination: { alias: 'd' },
        parcel: { length: 10, weight: 1 },
      });

      const result = await service.updateGuideData(
        'KFT-202606-000001',
        { email: user.email },
        { quote: { id: 'q1' }, parcel: { content: 'Updated content' } },
      );

      expect(result.data.status).toBe('failed');
    });

    it.each([
      ['content', { content: 'Updated content' }],
      ['satProductId', { satProductId: 'SAT-2' }],
    ])(
      'should update same-quote parcel %s without replacing stored fields',
      async (_field, parcel) => {
        mockUsersService.findByEmail.mockResolvedValue(user);
        const guideId = new Types.ObjectId();
        const storedParcel = {
          length: 10,
          width: 20,
          height: 30,
          weight: 1,
          content: 'Stored content',
          satProductId: 'SAT-1',
          value: 100,
          quantity: 2,
        };
        mockGuideModel.findOne.mockReturnValue(
          createMockFindOneQuery({
            _id: guideId,
            kraftId: 'KFT-202606-000001',
            status: 'created',
            provider: 'GE',
            quoteData: { quote: { id: 123 } },
            origin: { alias: 'o' },
            destination: { alias: 'd' },
            parcel: storedParcel,
          }),
        );
        mockGuiaEnviaService.createGuideStandardized.mockResolvedValue({
          data: { guide: { trackingNumber: 'NEW-EXT' } },
        });
        mockGuideModel.findByIdAndUpdate.mockResolvedValue({});
        mockGuideModel.findById.mockResolvedValue({
          _id: guideId,
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
          quoteData: { quote: { id: 123 } },
          origin: { alias: 'o' },
          destination: { alias: 'd' },
          parcel: { ...storedParcel, ...parcel },
        });

        await service.updateGuideData(
          'KFT-202606-000001',
          { email: user.email },
          { quote: { id: '123' }, parcel },
        );

        expect(mockGuiaEnviaService.createGuideStandardized).toHaveBeenCalledWith(
          expect.objectContaining({ parcel: { ...storedParcel, ...parcel } }),
        );
        expect(mockGuideModel.findByIdAndUpdate).toHaveBeenCalledWith(
          guideId,
          expect.objectContaining({
            $set: expect.objectContaining(
              Object.fromEntries(
                Object.entries(parcel).map(([field, value]) => [
                  `parcel.${field}`,
                  value,
                ]),
              ),
            ),
          }),
        );
      },
    );

    it('should reject disallowed same-quote fields before provider or database calls', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          quoteData: { quote: { id: 'q1' } },
          parcel: { content: 'Stored', satProductId: 'SAT-1' },
        }),
      );

      await expect(
        service.updateGuideData(
          'KFT-202606-000001',
          { email: user.email },
          { quote: { id: 'q1', service: 'standard' } },
        ),
      ).rejects.toMatchObject({ code: 'GDE-BUS-008' });

      expect(mockGuiaEnviaService.createGuideStandardized).not.toHaveBeenCalled();
      expect(mockGuideModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should reject same-quote no-op updates', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockGuideModel.findOne.mockReturnValue(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          quoteData: { quote: { id: 'q1' } },
          parcel: { content: 'Stored', satProductId: 'SAT-1' },
        }),
      );

      await expect(
        service.updateGuideData(
          'KFT-202606-000001',
          { email: user.email },
          { quote: { id: 'q1' }, parcel: { content: 'Stored' } },
        ),
      ).rejects.toMatchObject({ code: 'GDE-BDN-013' });
    });

    it('should allow an admin to update another user guide but not a soft-deleted guide', async () => {
      const admin = { _id: new Types.ObjectId(), email: 'admin@example.com' };
      mockUsersService.findByEmail.mockResolvedValue(admin);
      mockGuideModel.findOne.mockReturnValueOnce(
        createMockFindOneQuery({
          _id: new Types.ObjectId(),
          kraftId: 'KFT-202606-000001',
          status: 'created',
          provider: 'GE',
          quoteData: { quote: { id: 'q1' } },
          origin: { alias: 'o' },
          destination: { alias: 'd' },
          parcel: { content: 'Stored', satProductId: 'SAT-1' },
        }),
      );
      mockGuiaEnviaService.createGuideStandardized.mockResolvedValue({
        data: { guide: { trackingNumber: 'NEW-EXT' } },
      });
      mockGuideModel.findByIdAndUpdate.mockResolvedValue({});
      mockGuideModel.findById.mockResolvedValue({
        kraftId: 'KFT-202606-000001',
        status: 'created',
        provider: 'GE',
        quoteData: { quote: { id: 'q1' } },
        parcel: { content: 'Updated', satProductId: 'SAT-1' },
      });

      await service.updateGuideData(
        'KFT-202606-000001',
        { email: admin.email, role: ['admin'] },
        { parcel: { content: 'Updated' } },
      );

      expect(mockGuideModel.findOne).toHaveBeenCalledWith(
        expect.not.objectContaining({ userId: admin._id }),
      );

      mockGuideModel.findOne.mockReturnValueOnce(createMockFindOneQuery(null));
      await expect(
        service.updateGuideData(
          'KFT-202606-000001',
          { email: admin.email, role: ['admin'] },
          { parcel: { content: 'Updated again' } },
        ),
      ).rejects.toMatchObject({ code: 'GDE-NF-001' });
    });
  });

  describe('formatGuideResponse', () => {
    const mockGuide = {
      kraftId: 'KFT-202606-000001',
      quoteData: {
        quote: {
          id: 'q1',
          service: 'standard',
          total: 150,
          qBaseRef: 100,
          qAdjFactor: 150,
          qAdjBasis: 50,
          qAdjMode: 'P' as const,
          qAdjSrcRef: 'custom' as const,
          typeService: 'standard' as const,
          courier: 'Estafeta' as QuoteCourier,
        },
      },
      externalId: 'EXT-123',
      status: 'created',
      provider: 'GE',
      origin: { alias: 'o1', name: 'John' },
      destination: { alias: 'd1', name: 'Jane' },
      parcel: { length: 10, width: 10, height: 10, weight: 1 },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedBy: null,
      failureInfo: null,
      isProviderTrackingSynced: true,
      labelUrl: null,
    } as unknown as GuideDoc;

    it('should strip qAdj* fields when includeInternalPricing=false', () => {
      const result = (service as any).formatGuideResponse(mockGuide, false);

      expect(result.data.quote).toBeDefined();
      expect(result.data.quote.id).toBe('q1');
      expect(result.data.quote.service).toBe('standard');
      expect(result.data.quote.total).toBe(150);
      expect(result.data.quote.qAdjMode).toBeUndefined();
      expect(result.data.quote.qAdjBasis).toBeUndefined();
      expect(result.data.quote.qAdjFactor).toBeUndefined();
      expect(result.data.quote.qAdjSrcRef).toBeUndefined();
      expect(result.data.quote.qBaseRef).toBeUndefined();
    });

    it('should include qAdj* fields when includeInternalPricing=true', () => {
      const result = (service as any).formatGuideResponse(mockGuide, true);

      expect(result.data.quote).toBeDefined();
      expect(result.data.quote.id).toBe('q1');
      expect(result.data.quote.qAdjMode).toBe('P');
      expect(result.data.quote.qAdjBasis).toBe(50);
      expect(result.data.quote.qAdjFactor).toBe(150);
      expect(result.data.quote.qAdjSrcRef).toBe('custom');
      expect(result.data.quote.qBaseRef).toBe(100);
    });

    it('should return undefined quote when quoteData.quote is undefined', () => {
      const guideNoQuote = {
        ...mockGuide,
        quoteData: {},
      } as unknown as GuideDoc;
      const result = (service as any).formatGuideResponse(guideNoQuote, false);

      expect(result.data.quote).toBeUndefined();
    });
  });

  describe('getAllGuides with includeInternalPricing', () => {
    it('should pass includeInternalPricing=true to formatGuideResponse', async () => {
      const mockGuides = [
        {
          kraftId: 'KFT-202606-000001',
          quoteData: { quote: { id: 'q1', service: 'standard', total: 100 } },
          externalId: 'EXT-123',
          status: 'created',
          provider: 'GE',
          origin: {},
          destination: {},
          parcel: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          deletedBy: null,
          failureInfo: null,
          isProviderTrackingSynced: false,
          labelUrl: null,
        },
      ];

      mockGuideModel.find.mockReturnValue(createMockFindQuery(mockGuides));
      mockGuideModel.countDocuments.mockResolvedValue(1);

      const result = await service.getAllGuides(
        { scope: 'all', includeInternalPricing: true },
        { email: 'admin@example.com' },
      );

      expect(result.data.guides[0].quote).toBeDefined();
      expect((result.data.guides[0].quote as any).qAdjMode).toBeUndefined();
    });

    it('should strip qAdj* when includeInternalPricing=false (default)', async () => {
      const mockGuides = [
        {
          kraftId: 'KFT-202606-000001',
          quoteData: {
            quote: {
              id: 'q1',
              service: 'standard',
              total: 100,
              qAdjMode: 'P' as const,
            },
          },
          externalId: 'EXT-123',
          status: 'created',
          provider: 'GE',
          origin: {},
          destination: {},
          parcel: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          deletedBy: null,
          failureInfo: null,
          isProviderTrackingSynced: false,
          labelUrl: null,
        },
      ];

      mockGuideModel.find.mockReturnValue(createMockFindQuery(mockGuides));
      mockGuideModel.countDocuments.mockResolvedValue(1);

      const result = await service.getAllGuides(
        { scope: 'all' },
        { email: 'admin@example.com' },
      );

      expect(result.data.guides[0].quote).toBeDefined();
      expect((result.data.guides[0].quote as any).qAdjMode).toBeUndefined();
    });
  });
});
