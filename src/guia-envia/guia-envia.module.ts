import { Module } from '@nestjs/common';
import { GuiaEnviaService } from './services/guia-envia.service';

@Module({
  providers: [GuiaEnviaService],
  exports: [GuiaEnviaService],
})
export class GuiaEnviaModule {}
