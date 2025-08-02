import { Module } from '@nestjs/common';
import { ManuableService } from './services/manuable.service';

@Module({
  providers: [ManuableService],
  exports: [ManuableService],
})
export class ManuableModule {}
