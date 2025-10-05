import { Module } from '@nestjs/common';
import { T1Service } from './services/t1.service';
import { GeneralInfoDbModule } from '@/general-info-db/general-info-db.module';
import { TokenManagerModule } from '@/token-manager/token-manager.module';
import { T1Controller } from './controllers/t1.controller';

@Module({
  imports: [GeneralInfoDbModule, TokenManagerModule],
  providers: [T1Service],
  exports: [T1Service],
  controllers: [T1Controller],
})
export class T1Module {}
