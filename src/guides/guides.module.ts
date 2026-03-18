import { Module } from '@nestjs/common';
import { GuidesController } from './controllers/guides.controller';
import { GuidesService } from './services/guides.service';
import { GuiaEnviaModule } from '@/guia-envia/guia-envia.module';
import { T1Module } from '@/t1/t1.module';

@Module({
  imports: [GuiaEnviaModule, T1Module],
  controllers: [GuidesController],
  providers: [GuidesService],
})
export class GuidesModule {}
