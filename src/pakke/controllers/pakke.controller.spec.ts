import { Test, TestingModule } from '@nestjs/testing';
import { PakkeController } from './pakke.controller';

describe('PakkeController', () => {
  let controller: PakkeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PakkeController],
    }).compile();

    controller = module.get<PakkeController>(PakkeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
