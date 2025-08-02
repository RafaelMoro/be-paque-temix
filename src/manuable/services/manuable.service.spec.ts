import { Test, TestingModule } from '@nestjs/testing';
import { ManuableService } from './manuable.service';

describe('ManuableService', () => {
  let service: ManuableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ManuableService],
    }).compile();

    service = module.get<ManuableService>(ManuableService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
