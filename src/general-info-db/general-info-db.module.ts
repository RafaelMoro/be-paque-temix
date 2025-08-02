import { Module } from '@nestjs/common';
import { GeneralInfoDbService } from './services/general-info-db.service';

@Module({
  providers: [GeneralInfoDbService],
  exports: [GeneralInfoDbService],
})
export class GeneralInfoDbModule {}
