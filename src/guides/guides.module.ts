import { Module } from '@nestjs/common';
import { GuidesController } from './controllers/guides.controller';
import { GuidesService } from './services/guides.service';

@Module({
  controllers: [GuidesController],
  providers: [GuidesService],
})
export class GuidesModule {}
