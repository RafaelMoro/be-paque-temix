import { Module } from '@nestjs/common';
import { PakkeService } from './services/pakke.service';

@Module({
  providers: [PakkeService],
  exports: [PakkeService],
})
export class PakkeModule {}
