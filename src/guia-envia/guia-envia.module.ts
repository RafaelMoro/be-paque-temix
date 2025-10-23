import { Module } from '@nestjs/common';
import { GuiaEnviaService } from './services/guia-envia.service';
import { GuiaEnviaController } from './controllers/guia-envia.controller';

@Module({
  providers: [GuiaEnviaService],
  exports: [GuiaEnviaService],
  controllers: [GuiaEnviaController],
})
export class GuiaEnviaModule {}
