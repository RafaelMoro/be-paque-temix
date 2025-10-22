import { Test, TestingModule } from '@nestjs/testing';
import { GuiaEnviaController } from './guia-envia.controller';

describe('GuiaEnviaController', () => {
  let controller: GuiaEnviaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuiaEnviaController],
    }).compile();

    controller = module.get<GuiaEnviaController>(GuiaEnviaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
