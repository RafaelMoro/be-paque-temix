import { Module } from '@nestjs/common';
import { ManuableService } from './services/manuable.service';
import { GeneralInfoDbModule } from '@/general-info-db/general-info-db.module';

@Module({
  imports: [GeneralInfoDbModule],
  providers: [ManuableService],
  exports: [ManuableService],
})
export class ManuableModule {}
