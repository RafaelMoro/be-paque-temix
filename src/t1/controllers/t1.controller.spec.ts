import { Test, TestingModule } from '@nestjs/testing';
import { T1Controller } from './t1.controller';

describe('T1Controller', () => {
  let controller: T1Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [T1Controller],
    }).compile();

    controller = module.get<T1Controller>(T1Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
