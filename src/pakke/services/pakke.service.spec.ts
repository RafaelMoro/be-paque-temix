import { Test, TestingModule } from '@nestjs/testing';
import { PakkeService } from './pakke.service';

describe('PakkeService', () => {
  let service: PakkeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PakkeService],
    }).compile();

    service = module.get<PakkeService>(PakkeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
