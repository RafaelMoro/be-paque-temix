import { Test, TestingModule } from '@nestjs/testing';
import { ManuableService } from './manuable.service';
import config from '@/config';
import axios from 'axios';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import { TokenManagerService } from '@/token-manager/services/token-manager.service';
import * as utils from '../manuable.utils';
import * as quotesUtils from '@/quotes/quotes.utils';
import {
  ManuablePayload,
  ManuableQuote,
  GetHistoryGuidesPayload,
  ManuableGuide,
} from '../manuable.interface';
import { GeneralInfoDbDoc } from '@/general-info-db/entities/general-info-db.entity';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GetQuoteData } from '@/quotes/quotes.interface';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import {
  MANUABLE_ERROR_MISSING_URI,
  MANUABLE_FAILED_CREATE_TOKEN,
  MANUABLE_ERROR_UNAUTHORIZED,
  QUOTE_MANUABLE_ENDPOINT,
  CREATE_GUIDE_MANUABLE_ENDPOINT,
  MANUABLE_FAILED_FETCH_GUIDES,
  MANUABLE_FAILED_FETCH_QUOTES,
} from '../manuable.constants';

describe('ManuableService', () => {
  let service: ManuableService;
  let generalInfoDb: GeneralInfoDbService;
  let tokenManagerService: TokenManagerService;

  const mockGlobalConfig: GlobalConfigsDoc = {
    globalMarginProfit: {
      value: 15,
      type: 'percentage',
    },
    providers: [
      {
        name: 'Mn',
        couriers: [
          {
            name: 'DHL',
            profitMargin: {
              value: 10,
              type: 'percentage',
            },
          },
          {
            name: 'FEDEX',
            profitMargin: {
              value: 12,
              type: 'percentage',
            },
          },
        ],
      },
    ],
  } as GlobalConfigsDoc;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Mock calculateTotalQuotes to return quotes and messages
    jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
      quotes: [],
      messages: [],
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManuableService,
        {
          provide: config.KEY,
          useValue: {
            manuable: {
              email: 'user@example.com',
              pwd: 's3cr3t',
              uri: 'https://mn.example.com',
            },
            environment: 'development', // Default to development environment
            version: '1.0.0',
          },
        },
        {
          provide: GeneralInfoDbService,
          useValue: {
            // minimal mocked API used across tests
            getMnTk: jest.fn(),
            updateMnToken: jest.fn(),
          },
        },
        {
          provide: TokenManagerService,
          useValue: {
            executeWithTokenManagement: jest.fn(),
            executeWithRetryOnUnauthorized: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ManuableService>(ManuableService);
    generalInfoDb = module.get<GeneralInfoDbService>(GeneralInfoDbService);
    tokenManagerService = module.get<TokenManagerService>(TokenManagerService);
  });

  it('getManuableSession returns token', async () => {
    const token = 'mn-fake-token';
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockResolvedValueOnce({ data: { token } } as any);

    const res = await service.getManuableSession();

    expect(res).toBe(token);
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('formatManuablePayload delegates to util and returns its result', () => {
    const payload: GetQuoteDto = {
      originPostalCode: '01010',
      destinationPostalCode: '02020',
      height: 10,
      length: 20,
      width: 30,
      weight: 4.5,
    };
    const formatted: ManuablePayload = {
      address_from: { country_code: 'MX', zip_code: '01010' },
      address_to: { country_code: 'MX', zip_code: '02020' },
      parcel: {
        currency: 'MXN',
        distance_unit: 'CM',
        mass_unit: 'KG',
        height: 10,
        length: 20,
        width: 30,
        weight: 4.5,
        product_id: 'PID',
        product_value: 100,
        quantity_products: 1,
        content: 'Test',
      },
    };
    const spy = jest
      .spyOn(utils, 'formatPayloadManuable')
      .mockReturnValueOnce(formatted);

    const res = service.formatManuablePayload(payload);

    expect(spy).toHaveBeenCalledWith(payload);
    expect(res).toBe(formatted);
  });

  it('createToken returns newly created token record when session returns token', async () => {
    const token = 'mn-session-token';
    const mockConfigDoc = {
      configId: 'global',
      mnConfig: {
        tkProd: '',
        tkDev: token,
      },
    } as GeneralInfoDbDoc;

    const sessionSpy = jest
      .spyOn(service, 'getManuableSession')
      .mockResolvedValueOnce(token);
    const updateMnTokenMock = jest
      .spyOn(generalInfoDb, 'updateMnToken')
      .mockResolvedValueOnce(mockConfigDoc);

    const res = await service.createToken();

    expect(sessionSpy).toHaveBeenCalledTimes(1);
    expect(updateMnTokenMock).toHaveBeenCalledWith({
      token,
      isProd: false, // development environment
    });
    expect(res).toEqual({ mnTk: token });
  });

  it('createToken throws BadRequestException when session returns no token', async () => {
    jest.spyOn(service, 'getManuableSession').mockResolvedValueOnce('');

    await expect(service.createToken()).rejects.toThrow(
      MANUABLE_FAILED_CREATE_TOKEN,
    );
  });

  it('fetchManuableQuotes posts with Bearer token and returns data', async () => {
    const payload: ManuablePayload = {
      address_from: { country_code: 'MX', zip_code: '01010' },
      address_to: { country_code: 'MX', zip_code: '02020' },
      parcel: {
        currency: 'MXN',
        distance_unit: 'CM',
        mass_unit: 'KG',
        height: 10,
        length: 20,
        width: 30,
        weight: 4.5,
        product_id: 'PID',
        product_value: 100,
        quantity_products: 1,
        content: 'Test',
      },
    };
    const token = 'tok-123';
    const quotes: ManuableQuote[] = [
      {
        service: 'express',
        currency: 'MXN',
        uuid: 'u1',
        additional_fees: [],
        zone: 1,
        total_amount: '200',
        carrier: 'DHL',
        cancellable: true,
        shipping_type: 'ground',
        lead_time: '2d',
      },
    ];
    const postSpy = jest
      .spyOn(axios, 'post')
      .mockResolvedValueOnce({ data: { data: quotes } } as any);

    const res = await service.fetchManuableQuotes(payload, token);

    expect(res).toBe(quotes);
    expect(postSpy).toHaveBeenCalledTimes(1);
    const expectedUrl = `https://mn.example.com${QUOTE_MANUABLE_ENDPOINT}`;
    expect(postSpy.mock.calls[0][0]).toBe(expectedUrl);
    expect(postSpy.mock.calls[0][1]).toBe(payload);
    expect(postSpy.mock.calls[0][2]).toMatchObject({
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  it('fetchManuableQuotes throws when URI is missing in config', async () => {
    // Build a separate module instance with missing URI
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManuableService,
        {
          provide: config.KEY,
          useValue: {
            manuable: {
              email: 'user@example.com',
              pwd: 's3cr3t',
              uri: '',
            },
          },
        },
        { provide: GeneralInfoDbService, useValue: {} },
        {
          provide: TokenManagerService,
          useValue: {
            executeWithTokenManagement: jest.fn(),
            executeWithRetryOnUnauthorized: jest.fn(),
          },
        },
      ],
    }).compile();
    const svc = module.get<ManuableService>(ManuableService);

    const payload: ManuablePayload = {
      address_from: { country_code: 'MX', zip_code: '01010' },
      address_to: { country_code: 'MX', zip_code: '02020' },
      parcel: {
        currency: 'MXN',
        distance_unit: 'CM',
        mass_unit: 'KG',
        height: 10,
        length: 20,
        width: 30,
        weight: 4.5,
        product_id: 'PID',
        product_value: 100,
        quantity_products: 1,
        content: 'Test',
      },
    };

    await expect(svc.fetchManuableQuotes(payload, 'tok')).rejects.toThrow(
      MANUABLE_ERROR_MISSING_URI,
    );
  });

  it('updateOldToken calls token update with a new token', async () => {
    const token = 'new-token';
    const mockConfigDoc = {
      configId: 'global',
      mnConfig: {
        tkProd: '',
        tkDev: token,
      },
    } as GeneralInfoDbDoc;

    const sessionSpy = jest
      .spyOn(service, 'getManuableSession')
      .mockResolvedValueOnce(token);
    jest
      .spyOn(generalInfoDb, 'updateMnToken')
      .mockResolvedValueOnce(mockConfigDoc);

    await service.updateOldToken();

    expect(sessionSpy).toHaveBeenCalledTimes(1);
    const updateCalls = (generalInfoDb.updateMnToken as jest.Mock).mock.calls;
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toEqual([{ token, isProd: false }]); // development environment
  });

  it('updateOldToken throws when new token cannot be created', async () => {
    jest.spyOn(service, 'getManuableSession').mockResolvedValueOnce('');

    await expect(service.updateOldToken()).rejects.toThrow(
      MANUABLE_FAILED_CREATE_TOKEN,
    );
  });

  it('retrieveManuableQuotes returns result when TokenManagerService succeeds', async () => {
    const dto: GetQuoteDto = {
      originPostalCode: '01010',
      destinationPostalCode: '02020',
      height: 5,
      length: 5,
      width: 5,
      weight: 1,
    };
    const formattedQuotes: GetQuoteData[] = [
      {
        id: 'u1',
        service: 'Express',
        total: 200,
        source: 'Mn',
        courier: 'DHL',
        typeService: 'nextDay',
      },
    ];

    // Mock TokenManagerService.executeWithRetryOnUnauthorized to return success
    const mockExecuteWithRetry = jest.fn().mockResolvedValueOnce({
      result: formattedQuotes,
      messages: [
        'Mn: Token valid',
        'Mn: quote retrieval completed successfully',
      ],
    });
    tokenManagerService.executeWithRetryOnUnauthorized = mockExecuteWithRetry;

    // Mock calculateTotalQuotes for this specific test
    jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
      quotes: formattedQuotes,
      messages: ['Total calculated'],
    });

    const res = await service.retrieveManuableQuotes(dto, mockGlobalConfig);

    expect(mockExecuteWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      'quote retrieval',
      MANUABLE_ERROR_UNAUTHORIZED,
      expect.any(Object), // token operations
      false, // isProd (development environment)
      'Mn',
    );
    expect(quotesUtils.calculateTotalQuotes).toHaveBeenCalledWith({
      quotes: formattedQuotes,
      provider: 'Mn',
      config: mockGlobalConfig,
      messages: [],
      providerNotFoundMessage: expect.any(String) as string,
    });
    expect(res).toEqual({
      quotes: formattedQuotes,
      messages: [
        'Mn: Token valid',
        'Mn: quote retrieval completed successfully',
        'Total calculated',
      ],
    });
  });

  it('retrieveManuableQuotes handles TokenManagerService failure', async () => {
    const dto: GetQuoteDto = {
      originPostalCode: '01010',
      destinationPostalCode: '02020',
      height: 5,
      length: 5,
      width: 5,
      weight: 1,
    };

    // Mock TokenManagerService.executeWithRetryOnUnauthorized to throw error
    const mockExecuteWithRetry = jest
      .fn()
      .mockRejectedValueOnce(new Error('Token management failed'));
    tokenManagerService.executeWithRetryOnUnauthorized = mockExecuteWithRetry;

    await expect(
      service.retrieveManuableQuotes(dto, mockGlobalConfig),
    ).rejects.toThrow('Token management failed');

    expect(mockExecuteWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      'quote retrieval',
      MANUABLE_ERROR_UNAUTHORIZED,
      expect.any(Object), // token operations
      false, // isProd (development environment)
      'Mn',
    );
  });

  describe('fetchManuableHistoryGuides', () => {
    it('fetches guides with tracking_number query param when provided', async () => {
      const payload: GetHistoryGuidesPayload = { tracking_number: 'TRK123' };
      const token = 'test-token';
      const guides: ManuableGuide[] = [
        {
          token: 'guide-token',
          tracking_number: 'TRK123',
          carrier: 'DHL',
          tracking_status: null,
          price: '100.00',
          waybill: null,
          label_url: 'http://example.com/label',
          cancellable: true,
          created_at: '2023-01-01',
          label_status: 'active',
        },
      ];

      const getSpy = jest
        .spyOn(axios, 'get')
        .mockResolvedValueOnce({ data: { data: guides } } as any);

      const result = await service.fetchManuableHistoryGuides(payload, token);

      expect(result).toBe(guides);
      expect(getSpy).toHaveBeenCalledWith(
        `https://mn.example.com${CREATE_GUIDE_MANUABLE_ENDPOINT}?tracking_number=TRK123`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    });

    it('fetches guides without query param when tracking_number not provided', async () => {
      const payload: GetHistoryGuidesPayload = {};
      const token = 'test-token';
      const guides: ManuableGuide[] = [];

      const getSpy = jest
        .spyOn(axios, 'get')
        .mockResolvedValueOnce({ data: { data: guides } } as any);

      const result = await service.fetchManuableHistoryGuides(payload, token);

      expect(result).toBe(guides);
      expect(getSpy).toHaveBeenCalledWith(
        `https://mn.example.com${CREATE_GUIDE_MANUABLE_ENDPOINT}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    });

    it('throws when URI is missing in config', async () => {
      // Build a separate module instance with missing URI
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ManuableService,
          {
            provide: config.KEY,
            useValue: {
              manuable: {
                email: 'user@example.com',
                pwd: 's3cr3t',
                uri: '',
              },
            },
          },
          { provide: GeneralInfoDbService, useValue: {} },
          {
            provide: TokenManagerService,
            useValue: {
              executeWithTokenManagement: jest.fn(),
              executeWithRetryOnUnauthorized: jest.fn(),
            },
          },
        ],
      }).compile();
      const svc = module.get<ManuableService>(ManuableService);

      const payload: GetHistoryGuidesPayload = { tracking_number: 'TRK123' };

      await expect(
        svc.fetchManuableHistoryGuides(payload, 'tok'),
      ).rejects.toThrow(MANUABLE_ERROR_MISSING_URI);
    });
  });

  describe('getManuableHistoryGuidesWithUnauthorized', () => {
    it('returns guides when executeWithManuableToken succeeds', async () => {
      const payload: GetHistoryGuidesPayload = { tracking_number: 'TRK123' };
      const guides: ManuableGuide[] = [
        {
          token: 'guide-token',
          tracking_number: 'TRK123',
          carrier: 'DHL',
          tracking_status: null,
          price: '100.00',
          waybill: null,
          label_url: 'http://example.com/label',
          cancellable: true,
          created_at: '2023-01-01',
          label_status: 'active',
        },
      ];

      const executeSpy = jest
        .spyOn(service as any, 'executeWithManuableToken')
        .mockResolvedValueOnce({
          result: guides,
          messages: ['Mn: Token valid'],
        });

      const result =
        await service.getManuableHistoryGuidesWithUnauthorized(payload);

      expect(executeSpy).toHaveBeenCalledWith(
        expect.any(Function),
        'guides fetching',
      );
      expect(result).toEqual({
        messages: ['Mn: Token valid'],
        guides,
      });
    });

    it('returns error response when guides is null', async () => {
      const payload: GetHistoryGuidesPayload = {};

      jest
        .spyOn(service as any, 'executeWithManuableToken')
        .mockResolvedValueOnce({
          result: null,
          messages: ['Mn: Token valid'],
        });

      const result =
        await service.getManuableHistoryGuidesWithUnauthorized(payload);

      expect(result).toEqual({
        messages: ['Mn: Token valid', `Mn: ${MANUABLE_FAILED_FETCH_GUIDES}`],
        guides: [],
      });
    });

    it('returns unauthorized error when 401 error occurs', async () => {
      const payload: GetHistoryGuidesPayload = { tracking_number: 'TRK123' };

      jest
        .spyOn(service as any, 'executeWithManuableToken')
        .mockRejectedValueOnce(
          new Error('Request failed with status code 401'),
        );

      const result =
        await service.getManuableHistoryGuidesWithUnauthorized(payload);

      expect(result).toEqual({
        messages: [MANUABLE_ERROR_UNAUTHORIZED],
        guides: [],
      });
    });

    it('returns error message when other error occurs', async () => {
      const payload: GetHistoryGuidesPayload = {};

      jest
        .spyOn(service as any, 'executeWithManuableToken')
        .mockRejectedValueOnce(new Error('Network error'));

      const result =
        await service.getManuableHistoryGuidesWithUnauthorized(payload);

      expect(result).toEqual({
        messages: ['Mn: Network error'],
        guides: [],
      });
    });
  });

  describe('getHistoryGuidesWithAutoRetry', () => {
    it('returns guides response when TokenManagerService succeeds', async () => {
      const payload: GetHistoryGuidesPayload = { tracking_number: 'TRK123' };
      const guides: ManuableGuide[] = [
        {
          token: 'guide-token',
          tracking_number: 'TRK123',
          carrier: 'DHL',
          tracking_status: null,
          price: '100.00',
          waybill: null,
          label_url: 'http://example.com/label',
          cancellable: true,
          created_at: '2023-01-01',
          label_status: 'active',
        },
      ];

      // Mock TokenManagerService.executeWithRetryOnUnauthorized to return success
      const mockExecuteWithRetry = jest.fn().mockResolvedValueOnce({
        result: guides,
        messages: ['Mn: Token valid', 'Mn: get guides completed successfully'],
      });
      tokenManagerService.executeWithRetryOnUnauthorized = mockExecuteWithRetry;

      const result = await service.getHistoryGuidesWithAutoRetry(payload);

      expect(mockExecuteWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'get guides',
        MANUABLE_ERROR_UNAUTHORIZED,
        expect.any(Object), // token operations
        false, // isProd (development environment)
        'Mn',
      );
      expect(result).toEqual({
        version: '1.0.0', // from configService.version
        message: null,
        messages: ['Mn: Token valid', 'Mn: get guides completed successfully'],
        error: null,
        data: {
          guides,
        },
      });
    });

    it('throws BadRequestException when TokenManagerService fails', async () => {
      const payload: GetHistoryGuidesPayload = {};

      // Mock TokenManagerService.executeWithRetryOnUnauthorized to throw error
      const mockExecuteWithRetry = jest
        .fn()
        .mockRejectedValueOnce(new Error('Service error'));
      tokenManagerService.executeWithRetryOnUnauthorized = mockExecuteWithRetry;

      await expect(
        service.getHistoryGuidesWithAutoRetry(payload),
      ).rejects.toThrow('Service error');
    });
  });

  describe('createGuideWithAutoRetry', () => {
    it('returns guide response when TokenManagerService succeeds', async () => {
      const payload = {
        tracking_number: 'TRK123',
        carrier: 'DHL',
      } as const; // Using const assertion for better type safety

      const guide = {
        token: 'guide-token',
        tracking_number: 'TRK123',
        carrier: 'DHL',
        tracking_status: null,
        price: '100.00',
        waybill: null,
        label_url: 'http://example.com/label',
        cancellable: true,
        created_at: '2023-01-01',
        label_status: 'active',
      };

      // Mock TokenManagerService.executeWithRetryOnUnauthorized to return success
      const mockExecuteWithRetry = jest.fn().mockResolvedValueOnce({
        result: guide,
        messages: [
          'Mn: Token valid',
          'Mn: guide creation completed successfully',
        ],
      });
      tokenManagerService.executeWithRetryOnUnauthorized = mockExecuteWithRetry;

      // Spy on the formatting function
      const formatManuableCreateGuideResponseSpy = jest.spyOn(
        utils,
        'formatManuableCreateGuideResponse',
      );

      const result = await service.createGuideWithAutoRetry(payload as any);

      expect(mockExecuteWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        'guide creation',
        MANUABLE_ERROR_UNAUTHORIZED,
        expect.any(Object), // token operations
        false, // isProd (development environment)
        'Mn',
      );
      expect(result).toEqual({
        version: '1.0.0',
        message: null,
        messages: [
          'Mn: Token valid',
          'Mn: guide creation completed successfully',
        ],
        error: null,
        data: {
          guide: {
            trackingNumber: 'TRK123',
            carrier: 'DHL',
            price: '100.00',
            guideLink: null,
            labelUrl: 'http://example.com/label',
            file: null,
          },
        },
      });

      // Verify that the formatting function was called with the guide
      expect(formatManuableCreateGuideResponseSpy).toHaveBeenCalledWith(guide);
    });

    it('throws BadRequestException when TokenManagerService fails', async () => {
      const payload = {} as const;

      // Mock TokenManagerService.executeWithRetryOnUnauthorized to throw error
      const mockExecuteWithRetry = jest
        .fn()
        .mockRejectedValueOnce(new Error('Guide creation failed'));
      tokenManagerService.executeWithRetryOnUnauthorized = mockExecuteWithRetry;

      await expect(
        service.createGuideWithAutoRetry(payload as any),
      ).rejects.toThrow('Guide creation failed');
    });
  });

  describe('getManuableQuote', () => {
    it('returns quotes when TokenManagerService succeeds', async () => {
      const dto: GetQuoteDto = {
        originPostalCode: '01010',
        destinationPostalCode: '02020',
        height: 5,
        length: 5,
        width: 5,
        weight: 1,
      };
      const rawQuotes: ManuableQuote[] = [
        {
          service: 'express',
          currency: 'MXN',
          uuid: 'u1',
          additional_fees: [],
          zone: 1,
          total_amount: '200',
          carrier: 'DHL',
          cancellable: true,
          shipping_type: 'ground',
          lead_time: '2d',
        },
      ];
      const formattedQuotes: GetQuoteData[] = [
        {
          id: 'u1',
          service: 'Express',
          total: 200,
          source: 'Mn',
          courier: 'DHL',
          typeService: 'nextDay',
        },
      ];

      // Mock TokenManagerService.executeWithTokenManagement to return success
      const mockExecuteWithToken = jest.fn().mockResolvedValueOnce({
        result: rawQuotes,
        messages: [
          'Mn: Token valid',
          'Mn: quote fetching completed successfully',
        ],
      });
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      // Mock the formatting utility
      jest
        .spyOn(utils, 'formatManuableQuote')
        .mockReturnValueOnce(formattedQuotes);

      const result = await service.getManuableQuote(dto);

      expect(mockExecuteWithToken).toHaveBeenCalledWith(
        expect.any(Function),
        'quote fetching',
        false, // isProd (development environment)
        expect.any(Object), // token operations
        'Mn',
      );
      expect(utils.formatManuableQuote).toHaveBeenCalledWith(rawQuotes);
      expect(result).toEqual({
        messages: [
          'Mn: Token valid',
          'Mn: quote fetching completed successfully',
        ],
        quotes: formattedQuotes,
      });
    });

    it('returns unauthorized error when TokenManagerService throws 401', async () => {
      const dto: GetQuoteDto = {
        originPostalCode: '01010',
        destinationPostalCode: '02020',
        height: 5,
        length: 5,
        width: 5,
        weight: 1,
      };

      // Mock TokenManagerService.executeWithTokenManagement to throw 401 error
      const mockExecuteWithToken = jest
        .fn()
        .mockRejectedValueOnce(
          new Error('Request failed with status code 401'),
        );
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      const result = await service.getManuableQuote(dto);

      expect(result).toEqual({
        messages: [MANUABLE_ERROR_UNAUTHORIZED],
        quotes: [],
      });
    });

    it('returns error message when TokenManagerService throws other error', async () => {
      const dto: GetQuoteDto = {
        originPostalCode: '01010',
        destinationPostalCode: '02020',
        height: 5,
        length: 5,
        width: 5,
        weight: 1,
      };

      // Mock TokenManagerService.executeWithTokenManagement to throw other error
      const mockExecuteWithToken = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'));
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      const result = await service.getManuableQuote(dto);

      expect(result).toEqual({
        messages: ['Mn: Network error'],
        quotes: [],
      });
    });

    it('returns error when quotes result is null', async () => {
      const dto: GetQuoteDto = {
        originPostalCode: '01010',
        destinationPostalCode: '02020',
        height: 5,
        length: 5,
        width: 5,
        weight: 1,
      };

      // Mock TokenManagerService.executeWithTokenManagement to return null
      const mockExecuteWithToken = jest.fn().mockResolvedValueOnce({
        result: null,
        messages: ['Mn: Token valid'],
      });
      tokenManagerService.executeWithTokenManagement = mockExecuteWithToken;

      const result = await service.getManuableQuote(dto);

      expect(result).toEqual({
        messages: ['Mn: Token valid', `Mn: ${MANUABLE_FAILED_FETCH_QUOTES}`],
        quotes: [],
      });
    });
  });
});
