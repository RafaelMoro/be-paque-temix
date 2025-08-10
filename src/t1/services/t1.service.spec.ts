import { Test, TestingModule } from '@nestjs/testing';
import { T1Service } from './t1.service';
import config from '@/config';
import { GetQuoteDto } from '@/app.dto';
import { GetQuoteData } from '@/global.interface';

describe('T1Service', () => {
  let service: T1Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        T1Service,
        {
          provide: config.KEY,
          useValue: {
            t1: {
              apiKey: 'some-key-from-T1',
              uri: 'https://T1-some-uri.com',
              storeId: 'some-store-id',
            },
          },
        },
      ],
    }).compile();

    service = module.get<T1Service>(T1Service);
  });

  it('get quotes from T1', async () => {
    const result: GetQuoteData[] = [
      {
        id: '1',
        service: 'Carrier Express',
        total: 199.99,
        source: 'TONE',
      },
    ];
    const payload: GetQuoteDto = {
      originPostalCode: '00001',
      destinationPostalCode: '00004',
      height: 30,
      length: 20,
      width: 20,
      weight: 2,
    };

    jest
      .spyOn(service, 'getQuote')
      // eslint-disable-next-line @typescript-eslint/require-await
      .mockImplementation(async () => result);

    const response = await service.getQuote(payload);
    expect(response).toBe(result);
  });
});
