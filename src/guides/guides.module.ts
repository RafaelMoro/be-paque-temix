import { Module } from '@nestjs/common';
import { GuidesController } from './controllers/guides.controller';
import { GuidesService } from './services/guides.service';
import { GuiaEnviaModule } from '@/guia-envia/guia-envia.module';

@Module({
  imports: [GuiaEnviaModule],
  controllers: [GuidesController],
  providers: [GuidesService],
})
export class GuidesModule {}
