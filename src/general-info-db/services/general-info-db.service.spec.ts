import { Test, TestingModule } from '@nestjs/testing';
import { GeneralInfoDbService } from './general-info-db.service';

describe('GeneralInfoDbService', () => {
  let service: GeneralInfoDbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeneralInfoDbService],
    }).compile();

    service = module.get<GeneralInfoDbService>(GeneralInfoDbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
