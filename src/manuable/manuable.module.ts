import { Module } from '@nestjs/common';
import { ManuableService } from './services/manuable.service';
import { GeneralInfoDbModule } from '@/general-info-db/general-info-db.module';
import { ManuableController } from './controllers/manuable.controller';
import { TokenManagerModule } from '@/token-manager/token-manager.module';

@Module({
  imports: [GeneralInfoDbModule, TokenManagerModule],
  providers: [ManuableService],
  exports: [ManuableService],
  controllers: [ManuableController],
})
export class ManuableModule {}
