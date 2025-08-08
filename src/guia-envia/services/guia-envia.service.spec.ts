import { Test, TestingModule } from '@nestjs/testing';
import { GuiaEnviaService } from './guia-envia.service';
import { GetQuoteData } from '@/global.interface';
import { GetQuoteDto } from '@/app.dto';
import { ConfigService } from '@nestjs/config';

describe('GuiaEnviaService', () => {
  let service: GuiaEnviaService;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuiaEnviaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const GUIA_ENVIA_KEY = 'some-key-from-GE';
              const GUIA_ENVIA_URI = 'https://GE-some-uri.com';
              const config = {
                guiaEnvia: {
                  apiKey: GUIA_ENVIA_KEY,
                  uri: GUIA_ENVIA_URI,
                },
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GuiaEnviaService>(GuiaEnviaService);
  });

  it('get quotes from GE', async () => {
    const result: GetQuoteData[] = [
      {
        id: '1',
        service: 'Estafeta Terreste',
        total: 126.9,
        source: 'GE',
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
