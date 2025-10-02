import { Module } from '@nestjs/common';
import { T1Service } from './services/t1.service';
import { GeneralInfoDbModule } from '@/general-info-db/general-info-db.module';

@Module({
  imports: [GeneralInfoDbModule],
  providers: [T1Service],
  exports: [T1Service],
})
export class T1Module {}
