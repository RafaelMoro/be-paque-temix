import { Test, TestingModule } from '@nestjs/testing';
import { ManuableController } from './manuable.controller';

describe('ManuableController', () => {
  let controller: ManuableController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManuableController],
    }).compile();

    controller = module.get<ManuableController>(ManuableController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
