import { Module } from '@nestjs/common';
import { GlobalConfigsService } from './services/global-configs.service';
import { GlobalConfigsController } from './controllers/global-configs.controller';

@Module({
  providers: [GlobalConfigsService],
  controllers: [GlobalConfigsController],
})
export class GlobalConfigsModule {}
