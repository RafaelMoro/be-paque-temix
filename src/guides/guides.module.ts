import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuidesController } from './controllers/guides.controller';
import { GuidesService } from './services/guides.service';
import { GuidesDbController } from './controllers/guides-db.controller';
import { GuidesDbService } from './services/guides-db.service';
import { Guide, GuideSchema } from './entities/guide.entity';
import {
  KraftIdCounter,
  KraftIdCounterSchema,
} from './entities/kraft-id-counter.entity';
import { GuiaEnviaModule } from '@/guia-envia/guia-envia.module';
import { T1Module } from '@/t1/t1.module';
import { PakkeModule } from '@/pakke/pakke.module';
import { ManuableModule } from '@/manuable/manuable.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Guide.name, schema: GuideSchema },
      { name: KraftIdCounter.name, schema: KraftIdCounterSchema },
    ]),
    GuiaEnviaModule,
    T1Module,
    PakkeModule,
    ManuableModule,
    UsersModule,
  ],
  controllers: [GuidesController, GuidesDbController],
  providers: [GuidesService, GuidesDbService],
  exports: [GuidesDbService],
})
export class GuidesModule {}
