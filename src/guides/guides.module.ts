import { Module } from '@nestjs/common';
import { GuidesController } from './controllers/guides.controller';

@Module({
  controllers: [GuidesController],
})
export class GuidesModule {}
