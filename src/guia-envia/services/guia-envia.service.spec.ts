import { Test, TestingModule } from '@nestjs/testing';
import { GuiaEnviaService } from './guia-envia.service';
import { GetQuoteData } from '@/global.interface';
import { GetQuoteDto } from '@/app.dto';

describe('GuiaEnviaService', () => {
  let service: GuiaEnviaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuiaEnviaService],
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
