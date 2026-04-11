import { Module } from '@nestjs/common';
import { GuidesController } from './controllers/guides.controller';
import { GuidesService } from './services/guides.service';
import { GuiaEnviaModule } from '@/guia-envia/guia-envia.module';
import { T1Module } from '@/t1/t1.module';
import { PakkeModule } from '@/pakke/pakke.module';

@Module({
  imports: [GuiaEnviaModule, T1Module, PakkeModule],
  controllers: [GuidesController],
  providers: [GuidesService],
})
export class GuidesModule {}
