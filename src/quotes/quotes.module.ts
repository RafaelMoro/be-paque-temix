import { Module } from '@nestjs/common';
import { QuotesController } from './controllers/quotes.controller';
import { QuotesService } from './services/quotes.service';
import { GuiaEnviaModule } from '@/guia-envia/guia-envia.module';
import { T1Module } from '@/t1/t1.module';
import { PakkeModule } from '@/pakke/pakke.module';
import { ManuableModule } from '@/manuable/manuable.module';
import { GlobalConfigsModule } from '@/global-configs/global-configs.module';

@Module({
  imports: [
    GuiaEnviaModule,
    T1Module,
    PakkeModule,
    ManuableModule,
    GlobalConfigsModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
