import { Test, TestingModule } from '@nestjs/testing';
import { PakkeService } from './pakke.service';
import config from '@/config';
import { GetQuoteDto } from '@/app.dto';
import { GetQuoteData } from '@/global.interface';

describe('PakkeService', () => {
  let service: PakkeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PakkeService,
        {
          provide: config.KEY,
          useValue: {
            pakke: {
              apiKey: 'some-key-from-Pakke',
              uri: 'https://pakke-some-uri.com',
            },
          },
        },
      ],
    }).compile();

    service = module.get<PakkeService>(PakkeService);
  });

  it('get quotes from Pakke', async () => {
    const result: GetQuoteData[] = [
      {
        id: '1',
        service: 'Pakke Express',
        total: 150.5,
        source: 'Pkk',
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
      .spyOn(service, 'getQuotePakke')
      // eslint-disable-next-line @typescript-eslint/require-await
      .mockImplementation(async () => result);

    const response = await service.getQuotePakke(payload);
    expect(response).toBe(result);
  });
});
