import { Test, TestingModule } from '@nestjs/testing';
import { GuiaEnviaService } from './guia-envia.service';

describe('GuiaEnviaService', () => {
  let service: GuiaEnviaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuiaEnviaService],
    }).compile();

    service = module.get<GuiaEnviaService>(GuiaEnviaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
