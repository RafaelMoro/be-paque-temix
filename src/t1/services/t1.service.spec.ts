import { Test, TestingModule } from '@nestjs/testing';
import { T1Service } from './t1.service';

describe('T1Service', () => {
  let service: T1Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [T1Service],
    }).compile();

    service = module.get<T1Service>(T1Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
