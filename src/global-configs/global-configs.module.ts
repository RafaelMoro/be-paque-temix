import { Module } from '@nestjs/common';
import { GlobalConfigsService } from './services/global-configs.service';

@Module({
  providers: [GlobalConfigsService],
})
export class GlobalConfigsModule {}
