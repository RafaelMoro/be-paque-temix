import { Test, TestingModule } from '@nestjs/testing';
import { ManuableService } from './manuable.service';
import config from '@/config';
import axios from 'axios';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import * as utils from '../manuable.utils';
import { ManuablePayload } from '../manuable.interface';
import { GetQuoteDto } from '@/app.dto';
import { MANUABLE_FAILED_CREATE_TOKEN } from '../manuable.constants';

describe('ManuableService', () => {
  let service: ManuableService;
  let generalInfoDb: GeneralInfoDbService;

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
    const created: { _id: string; mnTk: string } = { _id: 'id1', mnTk: token };
    const sessionSpy = jest
      .spyOn(service, 'getManuableSession')
      .mockResolvedValueOnce(token);
    const createMnTkMock = generalInfoDb.createMnTk as jest.Mock;
    createMnTkMock.mockResolvedValueOnce(created);

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
});
