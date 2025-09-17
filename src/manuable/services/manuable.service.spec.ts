import { Test, TestingModule } from '@nestjs/testing';
import { ManuableService } from './manuable.service';
import config from '@/config';
import axios from 'axios';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import * as utils from '../manuable.utils';
import * as quotesUtils from '@/quotes/quotes.utils';
import { ManuablePayload, ManuableQuote } from '../manuable.interface';
import { GeneralInfoDbDoc } from '@/general-info-db/entities/general-info-db.entity';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GetQuoteData } from '@/quotes/quotes.interface';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import {
  MANUABLE_ERROR_MISSING_URI,
  MANUABLE_FAILED_CREATE_TOKEN,
  MANUABLE_FAILED_TOKEN,
  MANUABLE_ERROR_UNAUTHORIZED,
  QUOTE_MANUABLE_ENDPOINT,
} from '../manuable.constants';

describe('ManuableService', () => {
  let service: ManuableService;
  let generalInfoDb: GeneralInfoDbService;

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
          },
        },
        {
          provide: GeneralInfoDbService,
          useValue: {
            // minimal mocked API used across tests
            createMnTk: jest.fn(),
            getMnTk: jest.fn(),
            updateMbTk: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ManuableService>(ManuableService);
    generalInfoDb = module.get<GeneralInfoDbService>(GeneralInfoDbService);
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
    const created: GeneralInfoDbDoc = {
      _id: 'id1',
      mnTk: token,
    } as unknown as GeneralInfoDbDoc;
    const sessionSpy = jest
      .spyOn(service, 'getManuableSession')
      .mockResolvedValueOnce(token);
    const createMnTkMock = jest
      .spyOn(generalInfoDb, 'createMnTk')
      .mockResolvedValueOnce(created);

    const res = await service.createToken();

    expect(sessionSpy).toHaveBeenCalledTimes(1);
    expect(createMnTkMock).toHaveBeenCalledWith(token);
    expect(res).toBe(created);
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

  it('updateOldToken updates token and returns new token', async () => {
    const getSessionSpy = jest
      .spyOn(service, 'getManuableSession')
      .mockResolvedValueOnce('new-token');
    (generalInfoDb.getMnTk as jest.Mock).mockResolvedValueOnce({
      _id: 'oldId',
      mnTk: 'old-token',
    });
    (generalInfoDb.updateMbTk as jest.Mock).mockResolvedValueOnce(null);

    const res = await service.updateOldToken();

    expect(getSessionSpy).toHaveBeenCalledTimes(1);
    expect((generalInfoDb.getMnTk as jest.Mock).mock.calls.length).toBe(1);
    const updateCalls = (generalInfoDb.updateMbTk as jest.Mock).mock
      .calls as unknown[];
    expect(updateCalls.length).toBeGreaterThan(0);
    const [firstUpdateArg] = updateCalls[0] as [
      { changes: { mnTkId: string; mnTk: string } },
    ];
    expect(firstUpdateArg).toEqual({
      changes: { mnTkId: 'oldId', mnTk: 'new-token' },
    });
    expect(res).toBe('new-token');
  });

  it('updateOldToken throws when new token cannot be created', async () => {
    jest.spyOn(service, 'getManuableSession').mockResolvedValueOnce('');

    await expect(service.updateOldToken()).rejects.toThrow(
      MANUABLE_FAILED_CREATE_TOKEN,
    );
  });

  it('updateOldToken throws when old token missing', async () => {
    jest
      .spyOn(service, 'getManuableSession')
      .mockResolvedValueOnce('new-token');
    (generalInfoDb.getMnTk as jest.Mock).mockResolvedValueOnce(null);

    await expect(service.updateOldToken()).rejects.toThrow(
      MANUABLE_FAILED_TOKEN,
    );
  });

  it('retrieveManuableQuotes returns direct result when no unauthorized message', async () => {
    const dto: GetQuoteDto = {
      originPostalCode: '01010',
      destinationPostalCode: '02020',
      height: 5,
      length: 5,
      width: 5,
      weight: 1,
    };
    const baseResult = { messages: ['Mn: Token valid'], quotes: [] };
    const getQuoteSpy = jest
      .spyOn(service, 'getManuableQuote')
      .mockResolvedValueOnce(baseResult);

    // Mock calculateTotalQuotes for this specific test
    jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
      quotes: [],
      messages: [],
    });

    const res = await service.retrieveManuableQuotes(dto, mockGlobalConfig);

    expect(getQuoteSpy).toHaveBeenCalledWith(dto);
    expect(quotesUtils.calculateTotalQuotes).toHaveBeenCalledWith({
      quotes: baseResult.quotes,
      provider: 'Mn',
      config: mockGlobalConfig,
      messages: [],
      providerNotFoundMessage: expect.any(String) as string,
    });
    expect(res).toEqual({
      quotes: [],
      messages: ['Mn: Token valid'],
    });
  });

  it('retrieveManuableQuotes retries on unauthorized and formats quotes', async () => {
    const dto: GetQuoteDto = {
      originPostalCode: '01010',
      destinationPostalCode: '02020',
      height: 5,
      length: 5,
      width: 5,
      weight: 1,
    };
    const unauthorizedResult = {
      messages: [MANUABLE_ERROR_UNAUTHORIZED],
      quotes: [],
    };
    const rawQuotes: ManuableQuote[] = [
      {
        service: 'express',
        currency: 'MXN',
        uuid: 'u3',
        additional_fees: [],
        zone: 3,
        total_amount: '300',
        carrier: 'FEDEX',
        cancellable: true,
        shipping_type: 'air',
        lead_time: '3d',
      },
    ];
    const formattedQuotes: GetQuoteData[] = [
      {
        id: 'u3',
        service: 'Carrier C',
        total: 300,
        source: 'Mn',
        courier: 'Fedex',
        typeService: 'nextDay',
      },
    ];

    // Mock the initial operation that returns unauthorized
    jest
      .spyOn(service, 'getManuableQuote')
      .mockResolvedValueOnce(unauthorizedResult);

    // Mock updateOldToken to return a new token
    jest.spyOn(service, 'updateOldToken').mockResolvedValueOnce('new-token');

    // Mock the retry operation components
    jest
      .spyOn(service, 'formatManuablePayload')
      .mockReturnValueOnce({} as ManuablePayload);
    jest.spyOn(service, 'fetchManuableQuotes').mockResolvedValueOnce(rawQuotes);
    jest
      .spyOn(utils, 'formatManuableQuote')
      .mockReturnValueOnce(formattedQuotes);

    // Mock calculateTotalQuotes for this specific test
    jest.spyOn(quotesUtils, 'calculateTotalQuotes').mockReturnValue({
      quotes: formattedQuotes,
      messages: [],
    });

    const res = await service.retrieveManuableQuotes(dto, mockGlobalConfig);

    expect(quotesUtils.calculateTotalQuotes).toHaveBeenCalledWith({
      quotes: formattedQuotes,
      provider: 'Mn',
      config: mockGlobalConfig,
      messages: [],
      providerNotFoundMessage: expect.any(String) as string,
    });
    expect(res.quotes).toBe(formattedQuotes);
    expect(res.messages).toEqual([
      MANUABLE_ERROR_UNAUTHORIZED,
      'Mn: Attempting to retry quote retrieval with a new token',
      'Mn: quote retrieval completed successfully',
    ]);
  });
});
