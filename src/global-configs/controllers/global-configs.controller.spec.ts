import { Test, TestingModule } from '@nestjs/testing';
import { GlobalConfigsController } from './global-configs.controller';

describe('GlobalConfigsController', () => {
  let controller: GlobalConfigsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalConfigsController],
    }).compile();

    controller = module.get<GlobalConfigsController>(GlobalConfigsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
