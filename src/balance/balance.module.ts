import { Module } from '@nestjs/common';
import { BalanceController } from './controllers/balance.controller';
import { BalanceService } from './services/balance.service';

@Module({
  providers: [BalanceService],
  controllers: [BalanceController],
})
export class BalanceModule {}
