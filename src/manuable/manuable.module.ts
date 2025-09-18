import { Module } from '@nestjs/common';
import { ManuableService } from './services/manuable.service';
import { GeneralInfoDbModule } from '@/general-info-db/general-info-db.module';
import { ManuableController } from './controllers/manuable.controller';

@Module({
  imports: [GeneralInfoDbModule],
  providers: [ManuableService],
  exports: [ManuableService],
  controllers: [ManuableController],
})
export class ManuableModule {}
