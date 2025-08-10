import { Test, TestingModule } from '@nestjs/testing';
import { ManuableService } from './manuable.service';
import config from '@/config';
import axios from 'axios';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import * as utils from '../manuable.utils';
import { ManuablePayload, ManuableQuote } from '../manuable.interface';
import { GeneralInfoDbDoc } from '@/general-info-db/entities/general-info-db.entity';
import { GetQuoteDto } from '@/app.dto';
import {
  MANUABLE_ERROR_MISSING_URI,
  MANUABLE_FAILED_CREATE_TOKEN,
  MANUABLE_FAILED_TOKEN,
  QUOTE_MANUABLE_ENDPOINT,
} from '../manuable.constants';

describe('ManuableService', () => {
  let service: ManuableService;
  let generalInfoDb: GeneralInfoDbService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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
        service: 'Carrier A',
        currency: 'MXN',
        uuid: 'u1',
        additional_fees: [],
        zone: 1,
        total_amount: '200',
        carrier: 'A',
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

  it('reAttemptGetManuableQuote updates token and fetches quotes', async () => {
    const dto: GetQuoteDto = {
      originPostalCode: '01010',
      destinationPostalCode: '02020',
      height: 5,
      length: 6,
      width: 7,
      weight: 1.2,
    };
    const manuablePayload: ManuablePayload = {
      address_from: { country_code: 'MX', zip_code: '01010' },
      address_to: { country_code: 'MX', zip_code: '02020' },
      parcel: {
        currency: 'MXN',
        distance_unit: 'CM',
        mass_unit: 'KG',
        height: 5,
        length: 6,
        width: 7,
        weight: 1.2,
        product_id: 'PID',
        product_value: 50,
        quantity_products: 1,
        content: 'Test',
      },
    };
    const quotes: ManuableQuote[] = [
      {
        service: 'Carrier B',
        currency: 'MXN',
        uuid: 'u2',
        additional_fees: [],
        zone: 2,
        total_amount: '120',
        carrier: 'B',
        cancellable: true,
        shipping_type: 'air',
        lead_time: '1d',
      },
    ];

    const getSessionSpy = jest
      .spyOn(service, 'getManuableSession')
      .mockResolvedValueOnce('new-token');
    (generalInfoDb.getMnTk as jest.Mock).mockResolvedValueOnce({
      _id: 'oldId',
      mnTk: 'old-token',
    });
    (generalInfoDb.updateMbTk as jest.Mock).mockResolvedValueOnce(null);
    const formatPayloadSpy = jest
      .spyOn(service, 'formatManuablePayload')
      .mockReturnValueOnce(manuablePayload);
    const fetchQuotesSpy = jest
      .spyOn(service, 'fetchManuableQuotes')
      .mockResolvedValueOnce(quotes);

    const res = await service.reAttemptGetManuableQuote(dto);
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
    expect(formatPayloadSpy).toHaveBeenCalledWith(dto);
    expect(fetchQuotesSpy).toHaveBeenCalledWith(manuablePayload, 'new-token');
    expect(res).toBe(quotes);
  });

  it('reAttemptGetManuableQuote throws when new token cannot be created', async () => {
    jest.spyOn(service, 'getManuableSession').mockResolvedValueOnce('');

    await expect(
      service.reAttemptGetManuableQuote({
        originPostalCode: '0',
        destinationPostalCode: '0',
        height: 1,
        length: 1,
        width: 1,
        weight: 1,
      }),
    ).rejects.toThrow(MANUABLE_FAILED_CREATE_TOKEN);
  });

  it('reAttemptGetManuableQuote throws when old token missing', async () => {
    jest
      .spyOn(service, 'getManuableSession')
      .mockResolvedValueOnce('new-token');
    (generalInfoDb.getMnTk as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      service.reAttemptGetManuableQuote({
        originPostalCode: '0',
        destinationPostalCode: '0',
        height: 1,
        length: 1,
        width: 1,
        weight: 1,
      }),
    ).rejects.toThrow(MANUABLE_FAILED_TOKEN);
  });
});
