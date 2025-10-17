import { Module } from '@nestjs/common';
import { PakkeService } from './services/pakke.service';
import { PakkeController } from './controllers/pakke.controller';

@Module({
  providers: [PakkeService],
  exports: [PakkeService],
  controllers: [PakkeController],
})
export class PakkeModule {}
