import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { GlobalConfigsService } from './services/global-configs.service';
import { GlobalConfigsController } from './controllers/global-configs.controller';
import {
  GlobalConfigs,
  GlobalConfigsSchema,
} from './entities/global-configs.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: GlobalConfigs.name,
        schema: GlobalConfigsSchema,
      },
    ]),
  ],
  providers: [GlobalConfigsService],
  controllers: [GlobalConfigsController],
})
export class GlobalConfigsModule {}
