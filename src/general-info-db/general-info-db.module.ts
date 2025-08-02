import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { GeneralInfoDbService } from './services/general-info-db.service';
import {
  GeneralInfoDb,
  GeneralInfoDbSchema,
} from './entities/general-info-db.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: GeneralInfoDb.name,
        schema: GeneralInfoDbSchema,
      },
    ]),
  ],
  providers: [GeneralInfoDbService],
  exports: [GeneralInfoDbService],
})
export class GeneralInfoDbModule {}
